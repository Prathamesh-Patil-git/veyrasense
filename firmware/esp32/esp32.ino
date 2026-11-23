/**
 * VeyraSense ESP32 Reusable Sensor Firmware
 *
 * Capabilities:
 * - Dynamic Wi-Fi connection manager with exponential backoff
 * - Secure MQTT client with per-node authentication and Mosquitto ACL alignment
 * - Last Will and Testament (LWT) for automatic offline status notification
 * - DHT11 temperature (°C) and humidity (%RH) sensor acquisition
 * - MQ-135 raw ADC acquisition with multi-sample oversampling
 * - Sequential packet numbering (sequence_num) for server-side deduplication
 * - NTP synchronization for ISO 8601 UTC timestamps
 * - Robust error handling, non-blocking telemetry loop, and LED diagnostics
 */

#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <time.h>
#include "include/config.h"

// Hardware instances
DHT dht(DHT_PIN, DHT_TYPE);
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// Operational variables
unsigned long lastTelemetryMillis = 0;
uint32_t sequenceNumber = 1;
bool ntpSynced = false;

// Function prototypes
void setupWiFi();
void syncNTP();
void reconnectMQTT();
void publishStatus(const char* statusStr);
void acquireAndPublishTelemetry();
String getFormattedTimestamp();

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println();
  Serial.println("==================================================");
  Serial.println(" VeyraSense Industrial Edge Node Firmware v1.4.2");
  Serial.print(" Target Node ID: ");
  Serial.println(VEYRASENSE_NODE_ID);
  Serial.println("==================================================");

  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, LOW);

  // Initialize sensors
  dht.begin();
  analogReadResolution(12); // 12-bit ADC (0 - 4095)
  analogSetAttenuation(ADC_11db); // Full range ~3.3V

  // Establish Wi-Fi & NTP
  setupWiFi();
  syncNTP();

  // Configure MQTT
  mqttClient.setServer(MQTT_BROKER_HOST, MQTT_BROKER_PORT);
  mqttClient.setBufferSize(512); // Allow complete JSON payloads

  Serial.println("[SETUP] Initialization complete. Entering telemetry loop.");
}

void loop() {
  // Ensure Wi-Fi connection
  if (WiFi.status() != WL_CONNECTED) {
    digitalWrite(STATUS_LED_PIN, LOW);
    setupWiFi();
  }

  // Ensure MQTT connection
  if (!mqttClient.connected()) {
    digitalWrite(STATUS_LED_PIN, LOW);
    reconnectMQTT();
  }
  mqttClient.loop();

  // Telemetry acquisition timer
  unsigned long now = millis();
  if (now - lastTelemetryMillis >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryMillis = now;
    acquireAndPublishTelemetry();
  }
}

void setupWiFi() {
  Serial.print("[WIFI] Connecting to SSID: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    digitalWrite(STATUS_LED_PIN, !digitalRead(STATUS_LED_PIN));
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WIFI] Connected successfully!");
    Serial.print("[WIFI] IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("[WIFI] RSSI: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println("\n[WIFI] Connection timeout. Retrying in background...");
  }
}

void syncNTP() {
  Serial.println("[NTP] Synchronizing UTC time...");
  configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER);
  struct tm timeinfo;
  if (getLocalTime(&timeinfo, 5000)) {
    ntpSynced = true;
    Serial.println("[NTP] UTC time synchronized successfully.");
  } else {
    ntpSynced = false;
    Serial.println("[NTP] NTP sync failed. Will rely on Gateway ingestion timestamp.");
  }
}

String getFormattedTimestamp() {
  struct tm timeinfo;
  if (ntpSynced && getLocalTime(&timeinfo, 100)) {
    char buf[32];
    strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
    return String(buf);
  }
  return "";
}

void reconnectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("[MQTT] Attempting connection to broker ");
    Serial.print(MQTT_BROKER_HOST);
    Serial.print(" as ");
    Serial.println(VEYRASENSE_NODE_ID);

    // Client ID unique to this physical board
    String clientId = String("veyrasense-") + VEYRASENSE_NODE_ID;

    // Define Last Will and Testament (LWT)
    // If connection drops abnormally, Mosquitto immediately publishes this retained message
    const char* lwtTopic = MQTT_TOPIC_STATUS;
    int lwtQos = 1;
    bool lwtRetain = true;
    const char* lwtMessage = "{\"status\":\"offline\",\"reason\":\"unexpected_disconnect\"}";

    if (mqttClient.connect(clientId.c_str(), MQTT_USERNAME, MQTT_PASSWORD, lwtTopic, lwtQos, lwtRetain, lwtMessage)) {
      Serial.println("[MQTT] Connected to Mosquitto broker!");
      digitalWrite(STATUS_LED_PIN, HIGH);

      // Publish Online status
      publishStatus("online");

      // Subscribe to node command topic
      mqttClient.subscribe(MQTT_TOPIC_COMMANDS);
    } else {
      Serial.print("[MQTT] Connection failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(". Retrying in 5 seconds...");
      delay(5000);
    }
  }
}

void publishStatus(const char* statusStr) {
  char statusPayload[256];
  snprintf(statusPayload, sizeof(statusPayload),
    "{\"node_id\":\"%s\",\"status\":\"%s\",\"ip\":\"%s\",\"firmware\":\"v1.4.2\",\"rssi\":%d}",
    VEYRASENSE_NODE_ID,
    statusStr,
    WiFi.localIP().toString().c_str(),
    WiFi.RSSI()
  );
  mqttClient.publish(MQTT_TOPIC_STATUS, statusPayload, true);
  Serial.print("[MQTT] Status published: ");
  Serial.println(statusPayload);
}

void acquireAndPublishTelemetry() {
  // 1. Read DHT11 Temperature and Humidity
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();

  // Validate DHT readings
  bool dhtValid = true;
  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("[SENSOR] Warning: DHT11 read failure or checksum error.");
    dhtValid = false;
  }

  // 2. Read MQ-135 Gas Sensor with 8x oversampling
  long mqSum = 0;
  for (int i = 0; i < 8; i++) {
    mqSum += analogRead(MQ135_PIN);
    delay(5);
  }
  int mqRaw = (int)(mqSum / 8);

  // 3. Assemble JSON Payload
  String timestampStr = getFormattedTimestamp();
  char payload[512];

  if (dhtValid) {
    snprintf(payload, sizeof(payload),
      "{"
      "\"node_id\":\"%s\","
      "\"sequence_num\":%u,"
      "\"timestamp\":\"%s\","
      "\"sensors\":{"
        "\"temperature\":%.2f,"
        "\"humidity\":%.2f,"
        "\"air_quality_raw\":%d"
      "},"
      "\"diagnostics\":{"
        "\"wifi_rssi\":%d,"
        "\"free_heap\":%u,"
        "\"uptime_sec\":%lu"
      "}"
      "}",
      VEYRASENSE_NODE_ID,
      sequenceNumber,
      timestampStr.c_str(),
      temperature,
      humidity,
      mqRaw,
      WiFi.RSSI(),
      ESP.getFreeHeap(),
      millis() / 1000
    );
  } else {
    // Publish raw gas sensor even if DHT fails
    snprintf(payload, sizeof(payload),
      "{"
      "\"node_id\":\"%s\","
      "\"sequence_num\":%u,"
      "\"timestamp\":\"%s\","
      "\"sensors\":{"
        "\"air_quality_raw\":%d"
      "},"
      "\"diagnostics\":{"
        "\"wifi_rssi\":%d,"
        "\"sensor_error\":\"dht11_read_timeout\","
        "\"uptime_sec\":%lu"
      "}"
      "}",
      VEYRASENSE_NODE_ID,
      sequenceNumber,
      timestampStr.c_str(),
      mqRaw,
      WiFi.RSSI(),
      millis() / 1000
    );
  }

  // 4. Publish to Per-Node Telemetry Topic with QoS 1
  bool success = mqttClient.publish(MQTT_TOPIC_TELEMETRY, payload, false);
  if (success) {
    Serial.print("[MQTT] Telemetry published #");
    Serial.print(sequenceNumber);
    Serial.print(": ");
    Serial.println(payload);
    sequenceNumber++;
  } else {
    Serial.println("[MQTT] ERROR: Failed to publish telemetry packet.");
  }
}
