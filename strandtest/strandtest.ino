#include <Adafruit_NeoPixel.h>
#ifdef __AVR__
  #include <avr/power.h>
#endif
#include <Wire.h>
#include <String.h>

#define PIN 11

// Parameter 1 = number of pixels in strip
// Parameter 2 = Arduino pin number (most are valid)
// Parameter 3 = pixel type flags, add together as needed:
//   NEO_KHZ800  800 KHz bitstream (most NeoPixel products w/WS2812 LEDs)
//   NEO_KHZ400  400 KHz (classic 'v1' (not v2) FLORA pixels, WS2811 drivers)
//   NEO_GRB     Pixels are wired for GRB bitstream (most NeoPixel products)
//   NEO_RGB     Pixels are wired for RGB bitstream (v1 FLORA pixels, not v2)
Adafruit_NeoPixel strip = Adafruit_NeoPixel(60, PIN, NEO_GRB + NEO_KHZ800);

// IMPORTANT: To reduce NeoPixel burnout risk, add 1000 uF capacitor across
// pixel power leads, add 300 - 500 Ohm resistor on first pixel's data input
// and minimize distance between Arduino and first pixel.  Avoid connecting
// on a live circuit...if you must, connect GND first.

uint32_t timerRainbowTheaterChase;
boolean inTheaterChaseMode;
boolean SHOW_ALL_VALUES = true;
int RTCj;
int RTCq;
//int RTCi;
boolean RTC3;
int maxValue;
void setup() {
  // This is for Trinket 5V 16MHz, you can remove these three lines if you are not using a Trinket
  #if defined (__AVR_ATtiny85__)
    if (F_CPU == 16000000) clock_prescale_set(clock_div_1);
  #endif
  // End of trinket special code


  strip.begin();
  strip.show(); // Initialize all pixels to 'off'  
  //I2C
  Wire.begin(2);
  Wire.onReceive(receiveEvent); 
  Serial.begin(9600);
  Serial.println("Begin");
  //theaterChase(strip.Color(63, 63, 63), 50);
  timerRainbowTheaterChase = millis();
  inTheaterChaseMode = true;
  RTCj = 0;
//  RTCi = 0;
  RTCq = 0;
  RTC3 = false;
  maxValue = 0;
}

void loop() {
  // Some example procedures showing how to display to the pixels:
  /*colorWipe(strip.Color(255, 0, 0), 50); // Red
  colorWipe(strip.Color(0, 255, 0), 50); // Green
  colorWipe(strip.Color(0, 0, 255), 50); // Blue
  // Send a theater pixel chase in...
  theaterChase(strip.Color(127, 127, 127), 50); // White
  theaterChase(strip.Color(127, 0, 0), 50); // Red
  theaterChase(strip.Color(0, 0, 127), 50); // Blue

  rainbow(20);
  rainbowCycle(20);
  theaterChaseRainbow(50);*/
  
  //I2C
  /*Wire.requestFrom(2, 7);
  Serial.println("Wire available?");
  while(Wire.available()) {
    Serial.println("Checking");
     char c = Wire.read();
    Serial.print(c); 
  }
  delay(500); */
  if(inTheaterChaseMode) {
    runRainbowTheaterChase();
  } else {
      uint32_t color = strip.Color(255, 0, 0);
      int pixels = round(maxValue/10);
      if(pixels > 8)
        color = strip.Color(128, 128, 0);
      if(pixels > 16)
        color = strip.Color(0, 0, 255);
      if(pixels > 24)
        color = strip.Color(0, 255, 0);
//      Serial.print("Show ");
//      Serial.print(pixels);
//      Serial.print(" pixels for ");
//      Serial.println(maxValue);
//      limitedColorWipe(pixels, color, 50);
      if(SHOW_ALL_VALUES) {
        for(uint16_t i=0; i<strip.numPixels(); i++) {
          strip.setPixelColor(i, strip.Color(0,0,0));
        }
      }
      for(uint16_t i=0; i<pixels; i++) {
          strip.setPixelColor(i, color);
//          strip.show();
        }
      strip.show();
      delay(30);
  }
}
void receiveEvent(int howMany)
{
  Serial.print("Available");
  Serial.println(Wire.available());
  // loop through all but the last
  String output = "";
  while(1 < Wire.available()) 
  {
    // read byte as a character
    char c = Wire.read(); 
    output += c;
//    Serial.print("Char");
//    Serial.print(c);  // print the character
  }
  // receive byte as an integer
  int x = Wire.read();   
  output += x+"";
//  Serial.print("int"); 
//  Serial.println(x);  // print the integer
  Serial.print("'");
  Serial.print(output);
  Serial.println("'");
  if(output == "RANDOM" || output == "R,65.44" || output == "RANDO") {  
    Serial.println("Theater chase");
    inTheaterChaseMode = true;
//    theaterChaseRainbow(50);
    maxValue = 0;
  } else if(output == "START" || output == "STAR") {
    colorWipe(strip.Color(0, 0, 0), 10);
    inTheaterChaseMode = false;
    maxValue = 0;
  } else if(output == "SHOW_ALL" || output == "SHOW_AL") {
    SHOW_ALL_VALUES = true;
  } else if(output == "HIDE_ALL" || output == "HIDE_AL") {
    SHOW_ALL_VALUES = false;
  } else {
    //inTheaterChaseMode = false;
    int x = output.toInt();
    if(SHOW_ALL_VALUES)
      maxValue = x;
    if(x > maxValue) {
        colorWipe(strip.Color(0, 0, 0), 5);
        maxValue = x;
        Serial.println("New value");
        //Same as in loop
        uint32_t color = strip.Color(255, 0, 0);
      int pixels = round(maxValue/10);
      if(pixels > 8)
        color = strip.Color(128, 128, 0);
      if(pixels > 16)
        color = strip.Color(0, 0, 255);
      if(pixels > 24)
        color = strip.Color(0, 255, 0);
//      Serial.print("Show ");
//      Serial.print(pixels);
//      Serial.print(" pixels for ");
//      Serial.println(maxValue);
      limitedColorWipe(pixels, color, 50);
      delay(50);
    } else {
      if(!SHOW_ALL_VALUES) {
          Serial.print("Still using ");
          Serial.println(maxValue);
      }
    }
  }
}

// Fill the dots one after the other with a color
void colorWipe(uint32_t c, uint8_t wait) {
  for(uint16_t i=0; i<strip.numPixels(); i++) {
    strip.setPixelColor(i, c);
    strip.show();
    delay(wait);
  }
}
void limitedColorWipe(uint8_t pixels, uint32_t c, uint8_t wait) {
  strip.clear();
  for(uint16_t i=0; i<pixels; i++) {
    strip.setPixelColor(i, c);
    strip.show();
    delay(wait);
  }
}

void rainbow(uint8_t wait) {
  uint16_t i, j;

  for(j=0; j<256; j++) {
    for(i=0; i<strip.numPixels(); i++) {
      strip.setPixelColor(i, Wheel((i+j) & 255));
    }
    strip.show();
    delay(wait);
  }
}

// Slightly different, this makes the rainbow equally distributed throughout
void rainbowCycle(uint8_t wait) {
  uint16_t i, j;

  for(j=0; j<256*5; j++) { // 5 cycles of all colors on wheel
    for(i=0; i< strip.numPixels(); i++) {
      strip.setPixelColor(i, Wheel(((i * 256 / strip.numPixels()) + j) & 255));
    }
    strip.show();
    delay(wait);
  }
}

//Theatre-style crawling lights.
void theaterChase(uint32_t c, uint8_t wait) {
  for (int j=0; j<10; j++) {  //do 10 cycles of chasing
    for (int q=0; q < 3; q++) {
      for (int i=0; i < strip.numPixels(); i=i+3) {
        strip.setPixelColor(i+q, c);    //turn every third pixel on
      }
      strip.show();

      delay(wait);

      for (int i=0; i < strip.numPixels(); i=i+3) {
        strip.setPixelColor(i+q, 0);        //turn every third pixel off
      }
    }
  }
}

//Theatre-style crawling lights with rainbow effect
void theaterChaseRainbow(uint8_t wait) {
  for (int j=0; j < 256; j++) {     // cycle all 256 colors in the wheel
    for (int q=0; q < 3; q++) {
      for (int i=0; i < strip.numPixels(); i=i+3) {
        strip.setPixelColor(i+q, Wheel( (i+j) % 255));    //turn every third pixel on
      }
      strip.show();

      delay(wait);

      for (int i=0; i < strip.numPixels(); i=i+3) {
        strip.setPixelColor(i+q, 0);        //turn every third pixel off
      }
    }
  }
}

void runRainbowTheaterChase() {
  /*Serial.print(inTheaterChaseMode);
  Serial.print(" ");
  Serial.print(RTCj);
  Serial.print(" ");
  Serial.print(RTCq);
//  Serial.print(" ");
//  Serial.print(RTCi);
  Serial.print(" ");
  Serial.print(RTC3);
  Serial.print(" ");
  Serial.print(millis());
  Serial.print(" ");
  Serial.print(timerRainbowTheaterChase);
  Serial.print(" ");
  Serial.println(millis()-timerRainbowTheaterChase);*/
  
  if(inTheaterChaseMode && millis() - timerRainbowTheaterChase > 50) {
    timerRainbowTheaterChase = millis();
    if(RTC3) {
       for (int i=0; i < strip.numPixels(); i=i+3) {
        strip.setPixelColor(i+RTCq, Wheel( (i+RTCj) % 255));    //turn every third pixel on
      }
      strip.show();
    } else {
      for (int i=0; i < strip.numPixels(); i=i+3) {
        strip.setPixelColor(i+RTCq, 0);        //turn every third pixel off
      }
      strip.show();
    }
    RTC3 = !RTC3;
    RTCq++;
    if(RTCq >= 3) {
      RTCj++;
      RTCq = 0;
    }
    if(RTCj >= 256)
      RTCj = 0;
  }
}

// Input a value 0 to 255 to get a color value.
// The colours are a transition r - g - b - back to r.
uint32_t Wheel(byte WheelPos) {
  WheelPos = 255 - WheelPos;
  if(WheelPos < 85) {
    return strip.Color(255 - WheelPos * 3, 0, WheelPos * 3);
  }
  if(WheelPos < 170) {
    WheelPos -= 85;
    return strip.Color(0, WheelPos * 3, 255 - WheelPos * 3);
  }
  WheelPos -= 170;
  return strip.Color(WheelPos * 3, 255 - WheelPos * 3, 0);
}
