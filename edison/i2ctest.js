var m = require('mraa');
var i2c = new m.I2c(1);


function loop() {
    console.log("Write "+Math.random());
    i2c.address(0x02);
    var buffer = new Buffer("R,65.44");
    var strBuf = buffer.toString('ascii');
    i2c.write(buffer);
}
setInterval(loop, 2000);