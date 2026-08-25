// SmartHelmet/Firmware/helmet_esp32/helmet_esp32.ino
// ESP32#1 = Helmet ESP32
// Reads sensors and sends LoRa packet to ESP32#2
// Payload format (13 fields):
// temperature,gas_level,accel_x,accel_y,accel_z,fall_detected,status,force,heart_rate,spo2,finger_detected,ir_raw,sos_triggered
//
// Hardware: Buzzer removed (D25 unused). SOS = 4-second hold to toggle on/off (1-min cooldown).
// LED: 3 blinks on boot, 1 blink per LoRa TX, continuous blink on emergency.
// Libraries: MPU6050.h (Jeff Rowberg), MAX30105.h (SparkFun)

#include <Wire.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include "MAX30105.h"
#include "heartRate.h"
#include <MPU6050.h>
#include <SPI.h>
#include <LoRa.h>

// ---------------- Pin mapping ----------------
#define LED_PIN         2
#define DS18B20_PIN     4
#define LORA_NSS        5
#define SOS_BUTTON      13
#define LORA_RST        14
#define LORA_SCK        18
#define LORA_MISO       19
#define SDA_PIN         21
#define SCL_PIN         22
#define LORA_MOSI       23
// D25 — UNUSED (buzzer removed)
#define LORA_DIO0       26
#define MQ135_PIN       35

// ---------------- Thresholds ----------------
const float TEMP_WARNING = 30.0;
const float TEMP_EMERGENCY = 34.0;

const int GAS_WARNING = 1000;
const int GAS_EMERGENCY = 2000;

const int FORCE_WARNING = 17000;
const int FORCE_EMERGENCY = 20000;
const int FORCE_FREEFALL = 10000;

const int HR_WARNING_LOW = 50;
const int HR_WARNING_HIGH = 120;
const int HR_EMERGENCY_LOW = 40;
const int HR_EMERGENCY_HIGH = 150;

const long IR_THRESHOLD = 10000;

// ---------------- Timing ----------------
const unsigned long SEND_INTERVAL = 4000;
const unsigned long SOS_HOLD_TIME = 4000;
const unsigned long SOS_COOLDOWN  = 60000;  // 1-minute cooldown after SOS toggle
const unsigned long FALL_LOCK_TIME = 10000;

unsigned long lastSend = 0;
unsigned long lastLed = 0;
unsigned long sosStart = 0;
unsigned long sosToggleTime = 0;   // When SOS was last toggled (for cooldown)
unsigned long fallUntil = 0;
unsigned long lastTempRequest = 0; // Non-blocking DS18B20 timing
bool tempRequested = false;        // Whether a temp conversion is in progress
float lastTemperature = 25.0;      // Cached temperature reading

// ---------------- Status ----------------
String status = "normal";
bool fallLocked = false;
bool sosHeld = false;
bool sosEmergency = false;
bool ledState = false;

// ---------------- Sensor objects ----------------
OneWire oneWire(DS18B20_PIN);
DallasTemperature ds18b20(&oneWire);
MPU6050 mpu;
MAX30105 max30102;

// ---------------- Availability flags ----------------
bool mpuOK = false;
bool maxOK = false;

// ---------------- Heart-rate variables ----------------
byte rates[4] = {0};
byte rateIndex = 0;
long lastBeat = 0;
int heartRate = 0;
int spo2 = 0;

// ---------------- SpO2 estimation ----------------
double dcIR = 0, dcRed = 0;          // DC (baseline) via exponential moving average
double acSqSumIR = 0, acSqSumRed = 0; // Accumulated AC² for RMS calculation
int spo2SampleCount = 0;
const int SPO2_CALC_WINDOW = 100;     // Recalculate SpO2 every 100 samples (~1 sec)

// ---------------- Diagnostics ----------------
long irValue = 0;
bool finger = false;

// =====================================================
//  SETUP
// =====================================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n======================================");
  Serial.println("   LifeLink Helmet ESP32#1 Booting");
  Serial.println("======================================\n");

  pinMode(LED_PIN, OUTPUT);
  pinMode(SOS_BUTTON, INPUT_PULLUP);
  digitalWrite(LED_PIN, LOW);

  // ---------- I2C ----------
  Wire.begin(SDA_PIN, SCL_PIN);

  // ---------- DS18B20 (non-blocking mode) ----------
  ds18b20.begin();
  ds18b20.setWaitForConversion(false);  // Critical: don't block 750ms per read
  Serial.println("[DS18B20] Initialized (non-blocking).");

  // ---------- MPU6050 (Jeff Rowberg library) ----------
  Serial.println("[MPU6050] Initializing...");
  mpu.initialize();
  if (mpu.testConnection()) {
    mpuOK = true;
    Serial.println("  MPU6050 detected at 0x68.");
  } else {
    // Some MPU6050 clones fail testConnection but still work.
    // Force-enable and try reading anyway.
    mpuOK = true;
    Serial.println("  WARNING: testConnection failed, will try reading anyway.");
  }

  // ---------- MAX30102 ----------
  Serial.println("[MAX30102] Initializing...");
  if (max30102.begin(Wire, I2C_SPEED_FAST)) {
    maxOK = true;

    max30102.setup(
      60,     // LED brightness
      4,      // sample average
      2,      // LED mode (Red + IR)
      100,    // sample rate
      411,    // pulse width
      4096    // ADC range
    );

    max30102.setPulseAmplitudeRed(0x24);
    max30102.setPulseAmplitudeIR(0x24);

    Serial.println("  MAX30102 detected at 0x57.");
  } else {
    Serial.println("  ERROR: MAX30102 NOT detected!");
  }

  // ---------- MQ-135 ADC config ----------
  analogReadResolution(12);
  analogSetPinAttenuation(MQ135_PIN, ADC_11db);
  Serial.println("[MQ-135] Configured on D35.");

  // ---------- LED boot self-test: 3 blinks ----------
  Serial.println("[LED] Boot blink (3x)...");
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(150);
    digitalWrite(LED_PIN, LOW);
    delay(150);
  }
  Serial.println("  Done.\n");

  // ---------- LoRa ----------
  Serial.println("[LoRa] Initializing...");
  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_NSS);
  LoRa.setPins(LORA_NSS, LORA_RST, LORA_DIO0);

  if (!LoRa.begin(433E6)) {
    Serial.println("  FAIL - Check wiring/antenna.\n");
    while (true) { delay(1000); }
  }

  LoRa.setSpreadingFactor(12);
  LoRa.setSignalBandwidth(125E3);
  LoRa.setCodingRate4(8);
  LoRa.setTxPower(20);
  Serial.println("  PASS\n");

  Serial.println("======================================");
  Serial.println("  Setup complete. ESP32#1 ready.");
  Serial.println("  SOS: Hold D13 for 4 seconds.");
  Serial.println("======================================\n");
  delay(500);
}

// =====================================================
//  LOOP
// =====================================================
void loop() {
  handleSOS();
  handleFallTimer();
  readHeartRate();
  updateLed();

  if (millis() - lastSend >= SEND_INTERVAL) {
    lastSend = millis();
    readAndSend();
  }
}

// =====================================================
//  SOS BUTTON — 4-second hold to toggle ON/OFF
//  1-minute cooldown between toggles
// =====================================================
void handleSOS() {
  bool pressed = (digitalRead(SOS_BUTTON) == LOW);

  // ── Check cooldown: ignore button during cooldown period ──
  if (sosToggleTime > 0 && (millis() - sosToggleTime < SOS_COOLDOWN)) {
    // Still in cooldown — reset hold state if pressing
    if (!pressed) sosHeld = false;
    return;
  }

  if (pressed && !sosHeld) {
    // Just started holding
    sosHeld = true;
    sosStart = millis();
    if (sosEmergency) {
      Serial.println(">>> SOS button held — hold 4s to CANCEL emergency...");
    } else {
      Serial.println(">>> SOS button held — hold 4s to ACTIVATE emergency...");
    }
  }

  if (pressed && sosHeld) {
    if (millis() - sosStart >= SOS_HOLD_TIME) {
      // Toggle SOS state
      sosEmergency = !sosEmergency;
      sosToggleTime = millis();  // Start cooldown
      sosHeld = false;           // Reset hold so it doesn't re-trigger

      if (sosEmergency) {
        Serial.println(">>> !!! SOS EMERGENCY ACTIVATED !!! (cooldown 60s)");
      } else {
        Serial.println(">>> SOS EMERGENCY CANCELLED. (cooldown 60s)");
      }
    }
  }

  if (!pressed && sosHeld) {
    sosHeld = false;
    unsigned long held = millis() - sosStart;
    Serial.print(">>> SOS released after ");
    Serial.print(held);
    Serial.println(" ms (need 4000). No change.");
  }
}

// =====================================================
//  FALL TIMER
// =====================================================
void handleFallTimer() {
  if (fallLocked && millis() >= fallUntil) {
    fallLocked = false;
    Serial.println(">>> Fall lock expired.");
  }
}

// =====================================================
//  HEART RATE + SpO2 (MAX30102)
//  Uses check()/available()/getFIFOIR()/getFIFORed()
//  to read all FIFO samples without blocking.
// =====================================================
void readHeartRate() {
  if (!maxOK) {
    heartRate = 0;
    spo2 = 0;
    finger = false;
    irValue = 0;
    return;
  }

  // Poll the sensor hardware FIFO → software buffer
  max30102.check();

  // Process ALL available samples (keeps FIFO from overflowing)
  while (max30102.available()) {
    irValue  = max30102.getFIFOIR();
    long redValue = max30102.getFIFORed();
    max30102.nextSample();

    // ── Finger presence ──
    if (irValue < IR_THRESHOLD) {
      finger = false;
      // Reset SpO2 tracking when finger removed
      dcIR = 0; dcRed = 0;
      acSqSumIR = 0; acSqSumRed = 0;
      spo2SampleCount = 0;
      continue;
    }

    finger = true;

    // ── BPM via beat detection ──
    if (checkForBeat(irValue)) {
      long delta = millis() - lastBeat;
      lastBeat = millis();

      // Accept only realistic inter-beat intervals (20–240 BPM)
      if (delta > 250 && delta < 3000) {
        float bpm = 60000.0 / (float)delta;

        rates[rateIndex++] = (byte)bpm;
        rateIndex %= 4;

        int total = 0;
        for (int i = 0; i < 4; i++) total += rates[i];
        heartRate = total / 4;
      }
    }

    // ── SpO2 estimation (ratio-of-ratios, RMS method) ──
    if (dcIR == 0) {
      // First sample — initialize DC baselines
      dcIR  = irValue;
      dcRed = redValue;
      continue;
    }

    // Update DC baseline with slow EMA (α = 0.05)
    dcIR  = dcIR  * 0.95 + (double)irValue  * 0.05;
    dcRed = dcRed * 0.95 + (double)redValue * 0.05;

    // AC = deviation from DC baseline
    double acIR  = (double)irValue  - dcIR;
    double acRed = (double)redValue - dcRed;

    // Accumulate squared AC for RMS
    acSqSumIR  += acIR  * acIR;
    acSqSumRed += acRed * acRed;
    spo2SampleCount++;

    // Calculate SpO2 every SPO2_CALC_WINDOW samples (~1 second at 100 SPS)
    if (spo2SampleCount >= SPO2_CALC_WINDOW) {
      double rmsIR  = sqrt(acSqSumIR  / spo2SampleCount);
      double rmsRed = sqrt(acSqSumRed / spo2SampleCount);

      if (dcIR > 0 && dcRed > 0 && rmsIR > 0) {
        double ratio = (rmsRed / dcRed) / (rmsIR / dcIR);
        // Linear approximation: SpO2 ≈ 110 − 25 × R
        int est = (int)(110.0 - 25.0 * ratio);
        if (est >= 70 && est <= 100) {
          spo2 = est;
        }
      }

      // Reset accumulators for next window
      acSqSumIR  = 0;
      acSqSumRed = 0;
      spo2SampleCount = 0;
    }
  }
}

// =====================================================
//  READ SENSORS + SEND LoRa (13-field payload)
// =====================================================
void readAndSend() {

  // ---------- TEMPERATURE (non-blocking) ----------
  // Read the result of a previous conversion, then start the next one.
  // ds18b20.setWaitForConversion(false) was set in setup().
  if (tempRequested) {
    float t = ds18b20.getTempCByIndex(0);
    if (t != DEVICE_DISCONNECTED_C) {
      lastTemperature = t;
    }
  }
  ds18b20.requestTemperatures();  // Non-blocking: returns immediately
  tempRequested = true;
  float temperature = lastTemperature;

  // ---------- GAS ----------
  int gas = analogRead(MQ135_PIN);

  // ---------- MPU6050 (raw values via getMotion6) ----------
  int ax = 0, ay = 0, az = 0;
  int force = 0;
  bool fallNow = false;

  if (mpuOK) {
    int16_t x, y, z, gx, gy, gz;
    mpu.getMotion6(&x, &y, &z, &gx, &gy, &gz);

    ax = x;
    ay = y;
    az = z;

    float magnitude = sqrt((float)x * x + (float)y * y + (float)z * z);
    force = (int)magnitude;

    if (force >= FORCE_EMERGENCY || force <= FORCE_FREEFALL) {
      fallNow = true;
    }
  }

  // ---------- FALL LOCK ----------
  if (fallNow && !fallLocked) {
    fallLocked = true;
    fallUntil = millis() + FALL_LOCK_TIME;
    Serial.println(">>> !!! FALL DETECTED !!!");
  }

  // ---------- STATUS ----------
  bool hrEmergency = heartRate > 0 &&
    (heartRate <= HR_EMERGENCY_LOW || heartRate >= HR_EMERGENCY_HIGH);
  bool hrWarning = heartRate > 0 &&
    (heartRate <= HR_WARNING_LOW || heartRate >= HR_WARNING_HIGH);

  if (temperature >= TEMP_EMERGENCY || gas >= GAS_EMERGENCY ||
      force >= FORCE_EMERGENCY || fallLocked || sosEmergency || hrEmergency) {
    status = "emergency";
  } else if (temperature >= TEMP_WARNING || gas >= GAS_WARNING ||
             force >= FORCE_WARNING || hrWarning) {
    status = "warning";
  } else {
    status = "normal";
  }

  // ---------- READABLE STATUS BLOCK ----------
  Serial.println();
  Serial.println("-------- SENSOR STATUS --------");
  Serial.print("Temp        : "); Serial.print(temperature, 1); Serial.println(" C");
  Serial.print("Gas         : "); Serial.println(gas);
  Serial.print("Accel X/Y/Z : "); Serial.print(ax); Serial.print(" / ");
                                   Serial.print(ay); Serial.print(" / ");
                                   Serial.println(az);
  Serial.print("Force       : "); Serial.println(force);
  Serial.print("Fall locked : "); Serial.println(fallLocked ? "YES" : "no");
  Serial.print("SOS         : "); Serial.println(sosEmergency ? "YES (LOCKED)" : "no");
  Serial.print("HR - IR raw : "); Serial.println(irValue);
  Serial.print("HR - Finger : "); Serial.println(finger ? "detected" : "NOT detected");
  Serial.print("HR - BPM    : "); Serial.println(heartRate);
  Serial.print("Status      : "); Serial.println(status);
  Serial.println("--------------------------------");

  // ---------- BUILD PAYLOAD (13 fields) ----------
  // Gateway ESP32#2 expects exactly 13 comma-separated fields
  String payload =
    String(temperature, 1) + "," +
    String(gas) + "," +
    String(ax) + "," +
    String(ay) + "," +
    String(az) + "," +
    String(fallLocked ? 1 : 0) + "," +
    status + "," +
    String(force) + "," +
    String(heartRate) + "," +
    String(spo2) + "," +
    String(finger ? 1 : 0) + "," +
    String(irValue) + "," +
    String(sosEmergency ? 1 : 0);

  // ---------- SEND (non-blocking) ----------
  // Async TX: returns immediately, transmission happens in background.
  // This is CRITICAL — blocking endPacket() was killing beat detection.
  LoRa.beginPacket();
  LoRa.print(payload);
  LoRa.endPacket(true);  // true = async, non-blocking

  Serial.print(">>> LoRa: ");
  Serial.println(payload);

  // TX LED blink is handled by updateLed() to avoid blocking the loop

  // NOTE: sosEmergency is NOT reset — stays locked until power cycle / reset
}

// =====================================================
//  LED CONTROL (no buzzer)
//  Emergency → fast continuous blink (200 ms)
//  Warning   → medium blink (500 ms)
//  Normal    → LED OFF (only blinks on LoRa TX)
// =====================================================
void updateLed() {
  if (status == "emergency") {
    if (millis() - lastLed >= 200) {
      lastLed = millis();
      ledState = !ledState;
      digitalWrite(LED_PIN, ledState ? HIGH : LOW);
    }
  } else if (status == "warning") {
    if (millis() - lastLed >= 500) {
      lastLed = millis();
      ledState = !ledState;
      digitalWrite(LED_PIN, ledState ? HIGH : LOW);
    }
  } else {
    // Normal — LED OFF (TX blink is handled in readAndSend)
    digitalWrite(LED_PIN, LOW);
    ledState = false;
  }
}
