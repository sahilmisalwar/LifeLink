#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <MPU6050.h>

// WiFi / backend configuration
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* BACKEND_URL = "http://YOUR_LAPTOP_IP:8000/sensor-data";

// Hardware pins (matching provided context)
const int MPU_SDA_PIN = 21;
const int MPU_SCL_PIN = 22;
const int DS18B20_PIN = 4;
const int MQ135_PIN = 35;
const int LED_PIN = 5;
const int BUZZER_PIN = 18;
const int LORA_NSS_PIN = 5;
const int LORA_RST_PIN = 14;
const int LORA_DIO0_PIN = 2;
const int LORA_SCK_PIN = 18;
const int LORA_MOSI_PIN = 23;
const int LORA_MISO_PIN = 19;

// Timings
const unsigned long SENSOR_INTERVAL_MS = 2000;
const unsigned long WIFI_RETRY_MS = 5000;
const unsigned long FALL_LOCK_MS = 10000;
const unsigned long MQ_SAMPLE_GAP_MS = 10;
const unsigned long HTTP_TIMEOUT_MS = 5000;

OneWire oneWire(DS18B20_PIN);
DallasTemperature ds18b20(&oneWire);
MPU6050 mpu;

float lastValidTemperature = 30.0;
float latestGasPPM = 0.0;
float accelX = 0.0;
float accelY = 0.0;
float accelZ = 0.0;
float totalForce = 0.0;
bool fallDetected = false;
unsigned long fallLockedUntil = 0;

unsigned long lastSensorRead = 0;
unsigned long lastWifiAttempt = 0;

// MQ-135 non-blocking average of 10 samples with 10ms spacing
unsigned long lastMqSampleAt = 0;
int mqSampleCount = 0;
long mqSampleAccumulator = 0;

// LED/buzzer state
bool ledState = false;
unsigned long lastLedToggle = 0;

bool buzzerState = false;
unsigned long lastBuzzerAt = 0;
int emergencyBeepCount = 0;

String systemStatus = "normal";

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }
  Serial.printf("Connecting to WiFi: %s\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

void keepWiFiAlive(unsigned long nowMs) {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  if (nowMs - lastWifiAttempt >= WIFI_RETRY_MS) {
    lastWifiAttempt = nowMs;
    connectWiFi();
  }
}

void sampleMq135(unsigned long nowMs) {
  if (mqSampleCount >= 10) {
    latestGasPPM = map(mqSampleAccumulator / 10, 0, 4095, 0, 5000);
    mqSampleCount = 0;
    mqSampleAccumulator = 0;
  }

  if (nowMs - lastMqSampleAt < MQ_SAMPLE_GAP_MS) {
    return;
  }

  lastMqSampleAt = nowMs;
  mqSampleAccumulator += analogRead(MQ135_PIN);
  mqSampleCount++;
}

float readTemperatureC() {
  ds18b20.requestTemperatures();
  float reading = ds18b20.getTempCByIndex(0);
  if (reading == DEVICE_DISCONNECTED_C || reading <= -127.0) {
    return lastValidTemperature;
  }

  lastValidTemperature = reading;
  return reading;
}

void readAccel() {
  int16_t rawX, rawY, rawZ;
  mpu.getAcceleration(&rawX, &rawY, &rawZ);
  accelX = static_cast<float>(rawX);
  accelY = static_cast<float>(rawY);
  accelZ = static_cast<float>(rawZ);
  totalForce = sqrt((accelX * accelX) + (accelY * accelY) + (accelZ * accelZ));

  const bool forceFall = totalForce > 22000.0 || totalForce < 10000.0;
  const unsigned long nowMs = millis();

  if (forceFall) {
    fallDetected = true;
    fallLockedUntil = nowMs + FALL_LOCK_MS;
  } else if (fallDetected && nowMs >= fallLockedUntil) {
    fallDetected = false;
  }
}

void updateStatus() {
  if (fallDetected || latestGasPPM > 1200 || lastValidTemperature > 40 || totalForce > 17000) {
    systemStatus = "emergency";
  } else if (latestGasPPM > 800 || lastValidTemperature > 38 || totalForce > 12000) {
    systemStatus = "warning";
  } else {
    systemStatus = "normal";
  }
}

void updateLed(unsigned long nowMs) {
  if (systemStatus == "emergency") {
    digitalWrite(LED_PIN, HIGH);
    return;
  }

  const unsigned long interval = (systemStatus == "warning") ? 200 : 1000;
  if (nowMs - lastLedToggle >= interval) {
    lastLedToggle = nowMs;
    ledState = !ledState;
    digitalWrite(LED_PIN, ledState ? HIGH : LOW);
  }
}

void updateBuzzer(unsigned long nowMs) {
  if (systemStatus != "emergency") {
    digitalWrite(BUZZER_PIN, LOW);
    buzzerState = false;
    emergencyBeepCount = 0;
    return;
  }

  // 5 rapid beeps (100ms ON, 100ms OFF), then 1s pause
  unsigned long stepMs = (emergencyBeepCount < 10) ? 100 : 1000;
  if (nowMs - lastBuzzerAt < stepMs) {
    return;
  }

  lastBuzzerAt = nowMs;

  if (emergencyBeepCount < 10) {
    buzzerState = !buzzerState;
    digitalWrite(BUZZER_PIN, buzzerState ? HIGH : LOW);
    emergencyBeepCount++;
  } else {
    digitalWrite(BUZZER_PIN, LOW);
    buzzerState = false;
    emergencyBeepCount = 0;
  }
}

void printReading() {
  Serial.printf(
    "Worker=W001 | Temp=%.2fC | Gas=%.0fppm | Accel=(%.2f, %.2f, %.2f) | TotalForce=%.2f | Fall=%s | Status=%s\n",
    lastValidTemperature,
    latestGasPPM,
    accelX,
    accelY,
    accelZ,
    totalForce,
    fallDetected ? "true" : "false",
    systemStatus.c_str()
  );
}

void postSensorData() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected; skipping HTTP POST");
    return;
  }

  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.begin(BACKEND_URL);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<256> doc;
  doc["worker_id"] = "W001";
  doc["temperature"] = round(lastValidTemperature * 10.0) / 10.0;
  doc["gas_level"] = static_cast<int>(latestGasPPM);
  doc["accel_x"] = accelX;
  doc["accel_y"] = accelY;
  doc["accel_z"] = accelZ;
  doc["fall_detected"] = fallDetected;
  doc["status"] = systemStatus;

  String body;
  serializeJson(doc, body);

  int responseCode = http.POST(body);
  if (responseCode > 0) {
    Serial.printf("POST /sensor-data -> HTTP %d\n", responseCode);
  } else {
    Serial.printf("POST failed: %s\n", http.errorToString(responseCode).c_str());
  }

  http.end();
}

void setup() {
  Serial.begin(115200);

  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);

  analogReadResolution(12);

  Wire.begin(MPU_SDA_PIN, MPU_SCL_PIN);
  mpu.initialize();
  ds18b20.begin();

  connectWiFi();

  Serial.println("TunnelSafe ESP32 firmware started");
}

void loop() {
  unsigned long nowMs = millis();

  keepWiFiAlive(nowMs);
  sampleMq135(nowMs);
  updateLed(nowMs);
  updateBuzzer(nowMs);

  if (nowMs - lastSensorRead >= SENSOR_INTERVAL_MS) {
    lastSensorRead = nowMs;

    lastValidTemperature = readTemperatureC();
    readAccel();
    updateStatus();
    printReading();
    postSensorData();
  }
}
