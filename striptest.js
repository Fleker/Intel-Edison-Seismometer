/*jslint node:true, vars:true, bitwise:true, unparam:true */
/*jshint unused:true */
/*global */

/* 
	Proof of concept, Edison working with WS2801 LEDs
    
    The device changes LED patterns and the LCD display when you press a button
    or receive a message via MQTT.
    
    Setup:
    
    * Edison with Arduino breakout shield and Seeed's Grove Starter Kit
    * WS2801 LEDs on SPI pins, 11, 13
    * Push Button on Port D6 (Pin 6)
    * RGB LCD Display on I2C bus
    * Connection to iot.eclipse.org MQTT Server
    
*/

var m = require('mraa'), LEDStrip = require('./LEDStrip.js');
var myInterval;
console.log("Hello, world");

var count = 0;  // counter, start at 0
var patterns = 6; // pattern options
console.log("Hello, world2");

// setup SPI via mraa
var spi2;
console.log("Hello, world3");
spi2 = new m.Spi(5);
//spi2.mode(m.SPI_MODE0);
console.log("Hello, world3.5");
// pass SPI and number of leds 
var leds = new LEDStrip(spi2,32); //8*4
console.log("Hello, world4");

// setup leds
leds.setup();
console.log("Hello, world5");
takeAction();
console.log("Hello, world6");
setInterval(function() { console.log(11); takeAction(); }, 5000);
console.log("Hello, world7");
// lcd
//var lcd = new LCD.Jhd1313m1(6, 0x3E, 0x62);
//lcdWrite("Hello!");

// mqtt
//var client = mqtt.createClient(1883,"iot.eclipse.org");
//client.options.reconnectPeriod = 90;
//client.subscribe("myledtest");
//client.publish("myledtest","connected!");
// on receiving a new MQTT message, take action
//client.on('message', function (topic, message) { console.log("incoming message!",message.toString()); takeAction(); });
          
// check for button press
checkforBtnPress();

function checkforBtnPress() { 
  // if the button is down
/*  if(button.read()) {
    client.publish("myledtest","button pushed!");
    console.log("switched to action"+count);
    
  }*/
    console.log("Check btn");
    takeAction();   
    setTimeout(checkforBtnPress,3000); 
}

function takeAction() {
    clearInterval(myInterval);
    /* show the following pattern */
    console.log("COUNT "+count);
    switch (count) {
     case 0:
        // fill red
//        lcdWrite("fill red",[255,0,0]);
            console.log("Fill with red");
            leds.fill([255,0,0]);
            leds.update();
        break;
     case 1:
        // fill green
//        lcdWrite("fill green",[0,255,0]);
            console.log("Fill w/ green");
        leds.fill([0,255,0]);
            leds.update();
        break;
     case 2:
        // blue sequential fill
//        lcdWrite("seqment fill",[0,0,255]);
        seqFill([0,0,255],function() { console.log("Done!"); });
        break;
     case 3:
        // rainbow cycle
//        lcdWrite("rainbow cycle",[128,255,0]);
        myInterval = rainbowCycle(10);
        break;
     case 4:
        // circus cycle
//        lcdWrite("circus cycle",[128,0,128]);
        var colors = [[255,0,0],[0,255,0],[0,0,255]];
        myInterval = circusCycle(colors,200);
        break;
     case 5:
        // solid rainbow cycle
//        lcdWrite("rainbow solid",[255,38,0]);
        rainbow(10);
        break;    
     case 6:
        // solid rainbow cycle
//        lcdWrite("sinewave",[255,0,255]);
        myInterval = sinewave(10);
        break;
    }
    // update counter
    count = (count === patterns) ? 0 : count+1; 
};

/************************************
              HELPERS
*************************************/

function lcdWrite(message,color) {
    return;
  color = color || [0,128,0];
  lcd.setColor(color[0],color[1],color[2]);
  lcd.setCursor(0,1);
  lcd.write(message);
};

/* color wheel function via https://github.com/adafruit/Adafruit_NeoPixel/blob/master/examples/strandtest/strandtest.ino */
function wheel(pos) {
  pos = 255 - pos;
  if (pos < 85) { return [255 - pos * 3, 0, pos * 3]; }
  else if (pos < 170) { pos -= 85; return [0, Math.floor(pos * 3), Math.floor(255 - pos * 3)]; }
  else { pos -= 170; return [Math.floor(pos * 3), Math.floor(255 - pos * 3), 0]; }
}

function rainbowValGen(len) {
  var rainbow = [];

  // sine period / number of leds
  var seg = (2*Math.PI)/len;

  for(var i=0; i < len; i++) {
    // 3 offset sine waves makes a rainbow
    var r = Math.floor(Math.sin(i*seg) * 127 + 128); 
    var g = Math.floor(Math.sin(i*seg+2) * 127 + 128);   
    var b = Math.floor(Math.sin(i*seg+4) * 127 + 128); 
    // gamma correct
    rainbow.push([r,g,b].map(gamma));
  }
  return rainbow;
};

/* gamma correction */
function gamma(val) {
  gammaVal = 2.8; // via adafruit for these led strips
  return Math.floor(Math.pow(val/255,gammaVal)* 255 + 0.5);
};



/* like setInterval but limited in number of times */
function step(myFunc,cb,delay,numTimes) {
  var repeat = numTimes;
  (function runFn() {
    if (repeat > 0) {
      var times = numTimes-repeat;
      myFunc(times);
      repeat--;
      setTimeout(runFn, delay);
    } else { cb(); }
  })();
};

/************************************
              PATTERNS
*************************************/

/* sequential fill */
function seqFill(color,cb,delay) {
  delay = delay || 50;
  step(
    // do a progressive fill of the LEDS
    function(q) { leds.setPixel(q,color); leds.update(); },
    // call back when finished
    function() { if(cb) { cb(); }  },
    // delay between steps
    delay,
    // number of steps
    leds.length
  );
};

/* rainbow cycle */
function rainbowCycle(delay) {
  /* sine wave based rainbow fill values */

  var rainbows = rainbowValGen(leds.length);
  return setInterval(function() {
    for(var i=0; i < leds.length; i++) {
      leds.setPixel(i,rainbows[i]);
    }
    leds.update();
    rainbows.push(rainbows.shift());
  },delay);
};

/* circus cycle */
function circusCycle(colors,delay) {
  return setInterval(function() {
    for(var i=0; i < leds.length; i++) {
      var mod = i % colors.length;
      leds.setPixel(i,colors[mod]);
    }
    leds.update();
    colors.push(colors.shift());
  },delay);

};

/* rainbow */
function rainbow(delay) {
  var colors = [];
  for (var i = 0; i < 256; i++) {
      colors[i] = wheel(i).map(gamma);
  }
  step(
    // do a progressive fill of the LEDS
    function(q) { leds.fill(colors[q % 255]); },
    // call back when finished
    function() { console.log("Done!"); },
    // 50ms delay between steps
    delay,
    // number of steps
    colors.length
  );
};

/* sine wave */

function sinewave(delay) {
  var colors = [];
  // sine period / number of leds
  var seg = (2*Math.PI)/leds.length;

  for(var i=0; i < leds.length; i++) {
    //sine waves makes a rainbow
    colors[i] = gamma(Math.floor(Math.sin(i*seg) * 127 + 128)); 
  }
  return setInterval(function() {
    for(var i=0; i < leds.length; i++) {
      var mod = i % colors.length;
      leds.setPixel(i,[colors[mod],0,0]);
    }
    leds.update();
    colors.push(colors.shift());
  },delay);
};