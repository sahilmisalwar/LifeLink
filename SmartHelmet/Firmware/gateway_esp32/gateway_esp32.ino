// SmartHelmet/Firmware/gateway_esp32/gateway_esp32.ino
// ESP32#2 = Gateway ESP32
// Receives LoRa packets from ESP32#1 and sends them to Supabase
//
// Expected payload from ESP32#1 (CSV, 13 fields):
// temperature,gas_level,accel_x,accel_y,accel_z,fall_detected,status,force,heart_rate,spo2,finger_detected,ir_raw,sos_triggered

#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <LoRa.h>
#include <ArduinoJson.h>

// ---------------- WiFi credentials ----------------
// ⚠️ SECURITY: Replace with your WiFi credentials before flashing.
//    Do NOT commit real values to Git — use a secrets.h file instead.
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// ---------------- Supabase credentials ----------------
// ⚠️ SECURITY: Replace with your Supabase project credentials before flashing.
//    Get these from: Supabase Dashboard → Settings → API
//    Do NOT commit real values to Git — use a secrets.h file instead.
const char* SUPABASE_URL = "YOUR_SUPABASE_URL";
const char* SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

// ---------------- Worker ----------------
const char* WORKER_ID = "W001";

// ---------------- LoRa pins ----------------
#define LORA_NSS   5
#define LORA_RST   14
#define LORA_DIO0  26
#define LORA_SCK   18
#define LORA_MISO  19
#define LORA_MOSI  23

// ---------------- Timing ----------------
unsigned long lastWifiCheck = 0;
const unsigned long WIFI_CHECK_INTERVAL = 10000;

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n======================================");
  Serial.println("   LifeLink Gateway ESP32#2 Booting");
  Serial.println("======================================\n");

  connectWiFi();
  setupLoRa();

  Serial.println("======================================");
  Serial.println("  Setup complete. Listening for ESP32#1...");
  Serial.println("======================================\n");
}

void loop() {
  // Periodic WiFi health check
  if (millis() - lastWifiCheck > WIFI_CHECK_INTERVAL) {
    lastWifiCheck = millis();
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("WiFi lost. Reconnecting...");
      connectWiFi();
    }
  }

  // Check for incoming LoRa packets
  int packetSize = LoRa.parsePacket();
  if (packetSize) {
    String incoming = "";
    while (LoRa.available()) {
      incoming += (char)LoRa.read();
    }

    int rssi = LoRa.packetRssi();
    handlePacket(incoming, rssi);
  }
}

// ================================================================
//  WiFi
// ================================================================
void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("[WiFi] Connecting");
  int attempts = 0;

  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(" connected.");
    Serial.print("  IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println(" FAILED.");
  }
  Serial.println();
}

// ================================================================
//  LoRa
// ================================================================
void setupLoRa() {
  Serial.println("[LoRa] Initializing...");
  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_NSS);
  LoRa.setPins(LORA_NSS, LORA_RST, LORA_DIO0);

  if (!LoRa.begin(433E6)) {
    Serial.println("  FAIL - LoRa.begin() failed. Check wiring/antenna.\n");
    while (true) {
      delay(1000);
    }
  }

  LoRa.setSpreadingFactor(12);
  LoRa.setSignalBandwidth(125E3);
  LoRa.setCodingRate4(8);
  LoRa.setTxPower(20);

  Serial.println("  PASS - LoRa initialized.\n");
}

// ================================================================
//  Packet parsing  (manual tokenizing — avoids sscanf %f issues)
// ================================================================

// Helper: pull the next comma-delimited token from `payload` starting at `idx`.
// Returns the token and advances `idx` past the comma.
String nextToken(const String &payload, int &idx) {
  int comma = payload.indexOf(',', idx);
  String token;
  if (comma == -1) {
    token = payload.substring(idx);
    idx = payload.length();
  } else {
    token = payload.substring(idx, comma);
    idx = comma + 1;
  }
  token.trim();
  return token;
}

void handlePacket(String payload, int rssi) {
  // ---- Tokenize the CSV payload ----
  int idx = 0;

  String sTemp       = nextToken(payload, idx);   // 0  temperature
  String sGas        = nextToken(payload, idx);   // 1  gas_level
  String sAccelX     = nextToken(payload, idx);   // 2  accel_x
  String sAccelY     = nextToken(payload, idx);   // 3  accel_y
  String sAccelZ     = nextToken(payload, idx);   // 4  accel_z
  String sFall       = nextToken(payload, idx);   // 5  fall_detected (0 or 1)
  String sStatus     = nextToken(payload, idx);   // 6  status
  String sForce      = nextToken(payload, idx);   // 7  force
  String sHR         = nextToken(payload, idx);   // 8  heart_rate
  String sSpO2       = nextToken(payload, idx);   // 9  spo2
  String sFinger     = nextToken(payload, idx);   // 10 finger_detected (0 or 1)
  String sIrRaw      = nextToken(payload, idx);   // 11 ir_raw
  String sSos        = nextToken(payload, idx);   // 12 sos_triggered (0 or 1)

  // Basic validation: we need all 13 tokens
  if (sSos.length() == 0 && idx == 0) {
    Serial.println("Packet parse FAILED — not enough fields.");
    Serial.println("Raw payload: " + payload);
    return;
  }

  // ---- Convert to typed values ----
  float temperature    = sTemp.toFloat();
  int   gas_level      = sGas.toInt();
  float accel_x        = sAccelX.toFloat();
  float accel_y        = sAccelY.toFloat();
  float accel_z        = sAccelZ.toFloat();
  int   fall_int       = sFall.toInt();
  bool  fall_detected  = (fall_int != 0);
  String statusStr     = sStatus;
  int   force          = sForce.toInt();
  int   heart_rate     = sHR.toInt();
  int   spo2           = sSpO2.toInt();
  bool  finger_detected = (sFinger.toInt() != 0);
  long  ir_raw         = sIrRaw.toInt();
  bool  sos_triggered  = (sSos.toInt() != 0);

  // ---- Print readable sensor status (mirrors ESP32#1 output) ----
  Serial.println("-------- SENSOR STATUS --------");
  Serial.print("Temp        : "); Serial.print(temperature, 1); Serial.println(" C");
  Serial.print("Gas         : "); Serial.println(gas_level);
  Serial.print("Accel X/Y/Z : "); Serial.print(accel_x, 1); Serial.print(" / ");
                                    Serial.print(accel_y, 1); Serial.print(" / ");
                                    Serial.println(accel_z, 1);
  Serial.print("Force       : "); Serial.println(force);
  Serial.print("Fall locked : "); Serial.println(fall_detected ? "YES" : "no");
  Serial.print("SOS         : "); Serial.println(sos_triggered ? "YES" : "no");
  Serial.print("HR - IR raw : "); Serial.println(ir_raw);
  Serial.print("HR - Finger : "); Serial.println(finger_detected ? "detected" : "NOT detected");
  Serial.print("HR - BPM    : "); Serial.println(heart_rate);
  Serial.print("SpO2        : "); Serial.println(spo2);
  Serial.print("Status      : "); Serial.println(statusStr);
  Serial.print("RSSI        : "); Serial.println(rssi);
  Serial.println("--------------------------------\n");

  // ---- Send to Supabase ----
  bool ok = sendReadingToSupabase(
    temperature,
    gas_level,
    accel_x,
    accel_y,
    accel_z,
    fall_detected,
    statusStr,
    force,
    rssi,
    heart_rate,
    spo2,
    finger_detected,
    ir_raw,
    sos_triggered
  );

  if (ok) {
    Serial.println(">>> Reading inserted into Supabase.");
  } else {
    Serial.println(">>> Reading insert FAILED.");
  }

  // Send alert for warning / emergency
  if (statusStr == "warning" || statusStr == "emergency") {
    bool alertOk = sendAlertToSupabase(statusStr, temperature, gas_level, force, fall_detected, heart_rate, sos_triggered);
    if (alertOk) {
      Serial.println(">>> Alert inserted into Supabase.");
    } else {
      Serial.println(">>> Alert insert FAILED.");
    }
  }

  Serial.println();
}

// ================================================================
//  Supabase — sensor reading
// ================================================================
bool sendReadingToSupabase(
  float temperature,
  int gas_level,
  float accel_x,
  float accel_y,
  float accel_z,
  bool fall_detected,
  String status,
  int force,
  int rssi,
  int heart_rate,
  int spo2,
  bool finger_detected,
  long ir_raw,
  bool sos_triggered
) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected. Cannot send reading.");
    return false;
  }

  HTTPClient http;
  String url = String(SUPABASE_URL) + "/rest/v1/sensor_readings";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", "Bearer " + String(SUPABASE_ANON_KEY));
  http.addHeader("Prefer", "return=minimal");

  StaticJsonDocument<512> doc;
  doc["worker_id"]     = WORKER_ID;
  doc["temperature"]   = temperature;
  doc["gas_level"]     = gas_level;
  doc["accel_x"]       = accel_x;
  doc["accel_y"]       = accel_y;
  doc["accel_z"]       = accel_z;
  doc["fall_detected"] = fall_detected;
  doc["status"]        = status;
  doc["force"]         = force;
  doc["rssi"]          = rssi;
  doc["heart_rate"]    = heart_rate;
  doc["spo2"]          = spo2;
  doc["finger_detected"] = finger_detected;
  doc["ir_raw"]        = ir_raw;
  doc["sos_triggered"] = sos_triggered;

  String body;
  serializeJson(doc, body);

  Serial.println("Sending reading JSON:");
  Serial.println(body);

  int httpCode = http.POST(body);

  if (httpCode == 200 || httpCode == 201) {
    http.end();
    return true;
  } else {
    Serial.print("HTTP error code: ");
    Serial.println(httpCode);
    Serial.println(http.getString());
    http.end();
    return false;
  }
}

// ================================================================
//  Supabase — alert
// ================================================================
bool sendAlertToSupabase(
  String severity,
  float temperature,
  int gas_level,
  int force,
  bool fall_detected,
  int heart_rate,
  bool sos_triggered
) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected. Cannot send alert.");
    return false;
  }

  HTTPClient http;
  String url = String(SUPABASE_URL) + "/rest/v1/alerts";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", "Bearer " + String(SUPABASE_ANON_KEY));
  http.addHeader("Prefer", "return=minimal");

  String type = sos_triggered ? "sos_triggered" : (fall_detected ? "fall_detected" : "sensor_threshold");
  String message =
    "Temp: " + String(temperature, 1) +
    "C, Gas: " + String(gas_level) +
    ", Force: " + String(force) +
    ", HR: " + String(heart_rate);

  if (sos_triggered) {
    message = "SOS BUTTON PRESSED by worker! " + message;
  } else if (fall_detected) {
    message = "Fall detected on helmet. " + message;
  }

  StaticJsonDocument<256> doc;
  doc["worker_id"] = WORKER_ID;
  doc["type"]      = type;
  doc["message"]   = message;
  doc["zone"]      = "Unknown";
  doc["severity"]  = severity;

  String body;
  serializeJson(doc, body);

  Serial.println("Sending alert JSON:");
  Serial.println(body);

  int httpCode = http.POST(body);

  if (httpCode == 200 || httpCode == 201) {
    http.end();
    return true;
  } else {
    Serial.print("Alert HTTP error code: ");
    Serial.println(httpCode);
    Serial.println(http.getString());
    http.end();
    return false;
  }
}
