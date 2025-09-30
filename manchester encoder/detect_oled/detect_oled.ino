#include <Wire.h>

#define OLED_ADDR 0x3C

void setup() {
  Serial.begin(9600);
  Wire.begin();
  Serial.println("Starting I2C check for OLED at 0x3C...");
}

void loop() {
  Wire.beginTransmission(OLED_ADDR);
  byte error = Wire.endTransmission();

  if (error == 0) {
    Serial.println("OLED found at 0x3C");
  } else {
    Serial.println("No OLED detected");
  }

  delay(1000); // check every second
}
