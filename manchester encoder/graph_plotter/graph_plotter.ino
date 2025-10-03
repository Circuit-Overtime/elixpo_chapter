#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

#define CLOCK_PIN 2  // input clock pin
#define SAMPLE_INTERVAL 500   // in microseconds (2 kHz sample rate)

// Waveform buffer
uint8_t waveform[SCREEN_WIDTH];  // one sample per x-pixel

void setup() {
  Serial.begin(115200);
  pinMode(CLOCK_PIN, INPUT);

  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("SSD1306 allocation failed"));
    for (;;);
  }

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println(F("Clock Monitor"));
  display.display();
  delay(1000);
}

void loop() {
  unsigned long lastSample = micros();

  // --- Sample waveform across screen width ---
  for (int x = 0; x < SCREEN_WIDTH; x++) {
    int val = digitalRead(CLOCK_PIN);

    // map 0-> low line, 1-> high line
    if (val == HIGH)
      waveform[x] = 10;       // y-position for HIGH
    else
      waveform[x] = 30;       // y-position for LOW

    // wait for next sample interval
    while (micros() - lastSample < SAMPLE_INTERVAL) {
      // busy wait
    }
    lastSample += SAMPLE_INTERVAL;
  }

  // --- Draw waveform ---
  display.clearDisplay();

  for (int x = 1; x < SCREEN_WIDTH; x++) {
    display.drawLine(x - 1, waveform[x - 1], x, waveform[x], SSD1306_WHITE);
  }

  display.display();
}
