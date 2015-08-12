/*jslint node:true, vars:true, bitwise:true, unparam:true */
/*jshint unused:true */

var VERSION = "0.1.0";
var mraa = require('mraa'); //require mraa
var request = require('request');
console.log('MRAA Version: ' + mraa.getVersion()); //write the mraa version to the console
console.log("Edison Strength Test v"+VERSION);

/* CONFIGURATION VARIABLES */
var FRAMERATE = 118; //How often to run each second
var DISABLE_DIGITAL_FILTER = false; //If false, the software throws out irrelevant values
var ENABLE_RUNNING_AVERAGE = true;
var FILTER_MAX = 875; //Highest analog read
var FILTER_MIN = 119; //Lowest analog read
var FILTER_RANGE = 52; //How far away the analog value should be from min and max to ignore
var FILTER_RANGE_MULTIPLIER = 1; //By how much should the analog value change inbetween reads?
var RESOLUTION = 5; //The size of one dash
var SHOW_LAST_VALUE_LOGS = true;
var SHOW_GRAPH = true;
var FELKER_DIGITAL_MEDIA = false; //Share data through that server
var FELKER_DIGITAL_MEDIA_SEND_RECORD = false; //Don't share all seismic data, but do post the records
var IOT_DASHBOARD = true; //Share data through IoT Dashboard

/* COMMON VARIABLES */
var filtered = 0;
var records = 0;
var running_sum = [];
var RUNNING_SUM_SIZE = (DISABLE_DIGITAL_FILTER)?60:3;

var analogPin0 = new mraa.Aio(0); //setup access analog input Analog pin #0 (A0)
var last_value = 0;
var v = analogPin0.read();

/* CLASSES */
//COMMS
function Communications() {
    this.lastmessage = 0;
    console.log("Starting communications");
    try {
        this.dgram = require("dgram");        
    } catch(e) {
        console.log("didn't create dgram");
        console.error("this.dgram.bind", e);   
    }
    console.log("Try to create udp4");
    this.server = this.dgram.createSocket("udp4");
    this.PORT = 41235;
    this.onmsg = function() {};
    this.onerr = function() {};
    this.onlisten = function() {};
    this.onbroadcast = function() {};
    this.heardPackets = false;
    this.broadcastsSent = 0;

    this.server.bind(this.PORT);
    //Send out an array of IP addresses for devices to find and connect to
    this.start = function() {
        console.log("Started UDP server");
        this.server.on("error", this.onerr);
        this.server.on("message", this.onmsg);
        this.server.on("listening", this.onlisten);
        this.server.on("close", function() {
            console.log("Socket closed!")   
        });
        
        this.server.repeater = setTimeout(this.onbroadcast, 500);
    }    
    
    this.os = require('os');
    this.getIP = function() {        
        var interfaces = this.os.networkInterfaces();
        var addresses = [];
        for (var k in interfaces) {
            for (var k2 in interfaces[k]) {
                var address = interfaces[k][k2];
                if (address.family === 'IPv4' && !address.internal) {
                    addresses.push(address.address);
                }
            }
        }
        return addresses;
    }
    this.getConnectivity = function() {
        var dateString = d.toLocaleString();
        return {addresses: this.getIP(), device: {name: "Seismometer", type:"Intel Edison", platform: this.os.platform(), os: this.os.type(), os_version: this.os.release()}, port: this.PORT, app: pjson, localtime: dateString};   
    }
    this.sendIoTData = function(magnitude) {
        var ipaddress = "127.0.0.1";
        var port = 41234;
        //Wrap magnitude in a json
        var json = {
            //Sending an observation
            n: "seismometer",
            v: getSeismicMagnitude()+"",
            on: new Date().getTime()
        };
        this.server.send(JSON.stringify(json), 0, JSON.stringify(json).length, port, address, function(res) {
            console.log(res); 
        });
    }
    console.log("Connected to the Internet with IP Addresses: ",JSON.stringify(this.getIP())+" on port "+this.PORT);
}

function closeCommunications() {
    try {
        comm.server.close();
        clearTimeout(comm.repeater);
        console.log("Reset");
    } catch(e) {}   
}

//PIN CLASS
function Pin(pin, direction, value) {
    if(pin === undefined)
        pin = 13;
    if(direction === undefined)
        direction = mraa.DIR_OUT;
    if(value === undefined)
        value = 1;
            
    this.pin = pin;
    this.dir = direction;
    this.state = value;
    this.hw = new mraa.Gpio(pin);
    this.hw.dir(direction);
    if(this.dir == PINMANAGER.OUTPUT)
        this.hw.write(this.state);
    
    if(this.dir == PINMANAGER.PWM) {
//        this.hw = new mraa.Pwm(pin, -1, false);
        this.hw = new mraa.Pwm(pin, false, -1);
        this.hw.enable(true);     
    }
    
    this.getPin = function() {
        return this.pin;   
    }
    this.getDirection = function() {
        return this.dir;   
    }
    this.getState = function() {
        return this.state;   
    }
    this.getValue = this.getState;
    this.getHardwarePin = function() {
        return this.hw;   
    }
    this.write = function(data) {
        if(this.getDirection !== PINMANAGER.INPUT) {
            this.setState(data);
            this.hw.write(this.state);   
            if(data == 0)
                this.setEnable(false);
            else
                this.setEnable(true);
        }
        return this.getState();
    }
    this.read = function() {
        if(this.getDirection !== PINMANAGER.OUTPUT) {
            this.setState(this.hw.read());   
        }
        return this.getState();
    }
    this.setState = function(state) {
        this.state = state;
        return this;
    }
    this.setValue = this.setState;
    this.setEnable = function(b) {
        this.hw.enable(b);
    }
}
PINMANAGER = {OUTPUT: mraa.DIR_OUT, INPUT: mraa.DIR_IN, PWM: 7};
function PinManager() {
    this.pinObject = {};
    this.addNewPin = function(name, pin) {
        this.pinObject[name] = pin;
    }
    this.get = function(pinName) {
        return this.pinObject[pinName];
    }
    this.getNames = function() {
        var temp = [];
        for(i in this.pinObject) {
            temp.push(i);
        }
        return temp;
    }
    this.list = function() {
        return this.pinObject;   
    }
}

//GLOBAL PIN MANAGER
pinManager = new PinManager();

/* ACTIVITIES */
var newGamePressed = false;
var gameState = 0; //0: No game, 1: Game
var led_direction = [0, 1, 1, -1]; //For gameState = 0
var maxValue = 0;
var magnitude = 0;
var calibrated = 0;
function setup() {
    pinManager.addNewPin("NewGame", new Pin(2, PINMANAGER.INPUT, 0));
    pinManager.addNewPin("LED1", new Pin(3, PINMANAGER.PWM, 0));
    pinManager.addNewPin("LED2", new Pin(5, PINMANAGER.PWM, 0.5));
    pinManager.addNewPin("LED3", new Pin(6, PINMANAGER.PWM, 1));
}
function loop() {
//    console.log(pinManager.get("NewGame").read());
    if(pinManager.get("NewGame").read() == 1 && !newGamePressed) {
        newGamePressed = true;
        console.log("Release to reset");
    } else if(pinManager.get("NewGame").read() == 0 && newGamePressed) {
        newGamePressed = false;
        if(gameState == 0) {
            gameState = 1; 
            console.log("Starting");
            maxValue = 0;
            magnitude = 0;
            calibrated = 0;
            pinManager.get("LED1").write(0.01);
            pinManager.get("LED2").write(0);
            pinManager.get("LED3").write(0);
        } else if(gameState == 1) {
            gameState = 0;
            console.log("Resetting");
            pinManager.get("LED1").write(0);
            pinManager.get("LED2").write(0.5);
            pinManager.get("LED3").write(1);
        }
    } else {
        if(gameState == 0) {
            var p = pinManager.get("LED"+1);
//            console.log("LED"+1+" = "+p.getValue()+"  "+led_direction[1]);
            for(var i = 1;i<=3;i++) {
                var p = pinManager.get("LED"+i);
                if(p.getValue() >= 1 || p.getValue() <= 0) {
                    led_direction[i] = -1*led_direction[i];
                } 
//                console.log("LED"+i+" = "+p.getValue()+"  "+led_direction[i]);
                p.write(Math.min(Math.max(p.getValue()+led_direction[i]/FRAMERATE, 0), 1));  
//                p.write(1);
            }
        } else {
            if(maxValue < Math.abs(getSeismicMagnitude())) {
                pinManager.get("LED1").write(0);
                pinManager.get("LED2").write(0);
                pinManager.get("LED3").write(0);
                
                maxValue = Math.abs(getSeismicMagnitude());
                var l1 = (maxValue>100)?1:maxValue/100;
                var l2 = Math.max((maxValue>200)?1:(maxValue-100)/100,0);
                var l3 = Math.max((maxValue>300)?1:(maxValue-200)/100,0);
                console.log("Highest reading is "+maxValue, l1, l2, l3);
                //Send a POST request
                if(FELKER_DIGITAL_MEDIA || FELKER_DIGITAL_MEDIA_SEND_RECORD) {
                    request.post({url: 'http://felkerdigitalmedia.com/seismometer/postdata.php', form:
                        {magnitude:magnitude, timestamp:new Date().getTime(), accuracy:Math.round(100*filtered/records), record:1}
                     });
                }
                pinManager.get("LED1").write(l1);   
                if(maxValue > 100)
                    pinManager.get("LED2").write(l2);   
                /*else
                    pinManager.get("LED2").write(0);*/
                if(maxValue > 200)
                    pinManager.get("LED3").write(l3);   
                /*else
                    pinManager.get("LED3").write(0);*/
            } else {
                /*pinManager.get("LED1").write(0);
                pinManager.get("LED2").write(0);
                pinManager.get("LED3").write(0);*/
            }
        }
    }
}


/* BACKGROUND FUNCTIONS */
function getSeismicMagnitude() {
    return magnitude-calibrated;
}
function doAnalogRead() {
    v = analogPin0.read();
    var vo = v;
    records++;
//    console.log(v+"---");
        
    if((Math.abs(v-FILTER_MAX) > FILTER_RANGE && Math.abs(v-FILTER_MIN) > FILTER_RANGE) || DISABLE_DIGITAL_FILTER) {
        if((Math.abs(Math.abs(v-512)-Math.abs(last_value)) > (FILTER_RANGE*FILTER_RANGE_MULTIPLIER)) && !DISABLE_DIGITAL_FILTER) {
            if(SHOW_LAST_VALUE_LOGS)
                console.log(Math.abs(v-512), Math.abs(last_value), ";", FILTER_RANGE*FILTER_RANGE_MULTIPLIER, ">", Math.abs(Math.abs(v-512)-Math.abs(last_value)));
            if(magnitude > 0) { //If not, accept this as an initial value, some sort of calibrated value 
                return;
            }
        }
        filtered++;
        /*
            Simple filter
            0 - 1024i for 0 - 5V
            1V == 256i
            52i ~= 0.2V
        */
        v -= 512;
        
        if(magnitude == 0) 
            calibrated = Math.abs(v);
        magnitude = Math.abs(v);
        var b = "|";
        var i = 0;
        for(var i2=0;i2<512;i2+=RESOLUTION) {
            if(i < Math.abs(v)) {   
                b += "-";   
            } else {
                b += " ";   
            }
            i+= RESOLUTION;
        }
        b += "| (Magnitude) ";
        if(!DISABLE_DIGITAL_FILTER)
            b += Math.round(100*filtered/records)+"% shown ["+filtered+"/"+records+"]" + "; "+last_value;
        if(ENABLE_RUNNING_AVERAGE) {
            if(running_sum.length >= RUNNING_SUM_SIZE)
                running_sum.shift();
            running_sum.push(v);
            var sum = 0;
            for(var i3=0;i3<running_sum.length;i3++) {
                sum += Math.abs(running_sum[i3]);
            }
            b+= "  Avg: "+Math.round(sum/running_sum.length);
        }
        
        var vstring = v+"";
        while(vstring.length < 4) {
            vstring = " "+vstring;   
        }
        var vostring = vo+"";
        while(vostring.length < 3) {
            vostring = " "+vostring;   
        }
        var data = "["+vstring+", "+vostring+"] ";
        while(data.length < 12) {
            data += " ";   
        }
        
        last_value = Math.abs(v);
        if(SHOW_GRAPH)
            console.log(data+b);

        if(FELKER_DIGITAL_MEDIA) {
            request.post({url: 'http://felkerdigitalmedia.com/seismometer/postdata.php', form:
                {magnitude:magnitude, timestamp:new Date().getTime(), accuracy:Math.round(100*filtered/records), record:0}
             });
        }
    }
    /*if(Math.abs(v-512) < last_value)
        last_value = Math.abs(v-512);*/
}
setup(); //Start!
setInterval(function() {doAnalogRead()}, 1000/FRAMERATE);
setInterval(function() {loop()}, 1000/FRAMERATE);