#define CLK_PIN        2   // External clock input (D2)
#define DATA_PIN       7   // Raw data input (D7)
#define MANCHESTER_PIN 8   // Manchester encoded signal (D4)

unsigned long lastFreqCheck = 0;

void setup() {
  Serial.begin(115200);
  pinMode(CLK_PIN, INPUT);
  pinMode(DATA_PIN, INPUT);
  pinMode(MANCHESTER_PIN, INPUT);

  delay(1000);
  Serial.println("clock,data,manchester"); // Header for Serial Plotter
}

void loop() {
  // ---- 1) Plot waveforms ----
  int clk = digitalRead(CLK_PIN);
  int data = digitalRead(DATA_PIN);
  int man = digitalRead(MANCHESTER_PIN);

  // CSV format for Serial Plotter
  Serial.print(clk);
  Serial.print(",");
  Serial.print(data);
  Serial.print(",");
  Serial.println(man);

  delayMicroseconds(200); // adjust based on your clock speed

  // ---- 2) Frequency check every 500ms ----
  if (millis() - lastFreqCheck >= 500) {
    unsigned long highTime = pulseIn(CLK_PIN, HIGH, 1000000); // 1s timeout
    unsigned long lowTime  = pulseIn(CLK_PIN, LOW, 1000000);
    unsigned long period = highTime + lowTime;

    if (period > 0) {
      float freq = 1000000.0 / period; // Hz
      Serial.print("Clock Frequency: ");
      Serial.print(freq);
      Serial.println(" Hz");
    } else {
      Serial.println("No clock detected.");
    }

    lastFreqCheck = millis();
  }
}
