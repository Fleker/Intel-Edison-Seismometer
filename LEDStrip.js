/* handle ws2801 led strip with edison */

var LEDStrip = function(spi,len) {
    console.log("LEDStrip1");
  this.length = len;
    console.log("LEDStrip2");
  this.buffer = new Buffer(this.length*3);
    console.log("LEDStrip3");
  this.spi = spi; 
    console.log("LEDStrip4");
  this.debug = true;
    console.log("LEDStrip5");
}

LEDStrip.prototype.setup = function () {
  this.buffer.fill(0);
  this.fill(this.color(0,0,0));
};

LEDStrip.prototype.clear = function () {
  this.buffer.fill(0);
  this.update();
};

LEDStrip.prototype.color = function(r,g,b) {
  return [r,g,b];
};

/* fill the entire strip */
LEDStrip.prototype.fill = function(color,cb) {
  this.buffer.fill(0);
  for(var i=0; i < this.length*3; i=i+3) {
    this.buffer[i] = color[0];  // R
    this.buffer[i+1] = color[1];// G
    this.buffer[i+2] = color[2];// B
  }
  this.update();
  if(cb) { cb(); }
};

/* set pixel at position x*/
LEDStrip.prototype.setPixel = function(pos,color) {
  var pixelPos = pos*3;
  this.buffer[pixelPos] = color[0];
  this.buffer[pixelPos+1] = color[1];
  this.buffer[pixelPos+2] = color[2];
};

/* write out to SPI */
LEDStrip.prototype.update = function() {
  this.spi.write(this.buffer);
  if(this.debug) { console.log("Strip updated!"+this.buffer.toString('hex')); } 
};

module.exports = LEDStrip;