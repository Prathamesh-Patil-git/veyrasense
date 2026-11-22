# VeyraSense ESP32 Firmware & Hardware Provisioning Guide

## Overview
This directory contains production-grade, reusable C++ firmware for ESP32 microcontrollers communicating with the VeyraSense Raspberry Pi 5 Gateway.

### Key Capabilities
- **Per-Node Authentication:** Each node uses its Mosquitto MQTT username and password.
- **Strict Broker ACL Enforcement:** Each node is granted access strictly to its own topics (`veyrasense/nodes/{node_id}/telemetry` and `veyrasense/nodes/{node_id}/status`).
- **Last Will and Testament (LWT):** Automatic detection of power failure or abrupt network disconnection.
- **Idempotency & Sequence Numbering:** Monotonically increasing sequence counters allow the gateway backend to eliminate retransmission duplicates.
- **Multi-Sensor Acquisition:**
  - **DHT11:** Calibrated temperature (°C) and relative humidity (%RH).
  - **MQ-135:** 12-bit ADC oversampled air quality / hazardous VOC level.

---

## 1. Hardware Pinout & Wiring

| Sensor / Component | ESP32 Pin | Voltage Level | Notes |
|---|---|---|---|
| **DHT11 Data** | **GPIO 4** | 3.3V / 5V | Include 10kΩ pull-up resistor to 3.3V |
| **DHT11 VCC** | 3.3V / VIN | 3.3V – 5.0V | Clean power rail |
| **DHT11 GND** | GND | Common GND | |
| **MQ-135 A0 (Analog)** | **GPIO 34** | 3.3V (via voltage divider) | ADC1_CH6 (Input Only). Pre-heat heater for 24h for optimal baseline. |
| **MQ-135 VCC (Heater)** | VIN / 5.0V | 5.0V (150mA) | Must use external 5V if USB cannot supply 200mA |
| **MQ-135 GND** | GND | Common GND | |
| **Status LED** | **GPIO 2** | Built-in | Solid = Connected; Blinking = Connecting |

---

## 2. Firmware Compilation & Flashing Instructions

### Required Libraries (Arduino IDE / PlatformIO)
Install the following via the Arduino Library Manager:
1. `PubSubClient` by Nick O'Leary (v2.8+)
2. `DHT sensor library` by Adafruit (v1.4+)
3. `Adafruit Unified Sensor` by Adafruit (v1.1+)

### Flashing Steps
1. In the VeyraSense Dashboard, navigate to **Devices** and click **"Register & Provision Node"**.
2. Select your Department, enter the location, select **DHT11** and **MQ-135**, and click **"Generate Credentials & Provision"**.
3. In `firmware/esp32/include/`, create a local `config.h` from the placeholder example:
   ```bash
   cp firmware/esp32/include/config.h.example firmware/esp32/include/config.h
   # Set Wi-Fi name/password, Raspberry Pi broker address, and the node's MQTT username/password.
   ```
   For NODE-01, use username `NODE-01` and its MQTT password. For NODE-02, set `VEYRASENSE_NODE_ID` and `MQTT_USERNAME` to `NODE-02`, then use its own MQTT password. Keep the existing sensor pin settings unchanged. The ESP32 needs no API key or other application secret.
5. Connect your ESP32 board via USB.
6. Compile and upload at `115200` baud.
7. Open the Serial Monitor to verify connection:
   ```text
   [WIFI] Connected successfully!
   [NTP] UTC time synchronized successfully.
   [MQTT] Connected to Mosquitto broker!
   [MQTT] Status published: {"node_id":"NODE-PRD-4A2F","status":"online",...}
   [MQTT] Telemetry published #1: {"node_id":"NODE-PRD-4A2F","sensors":{"temperature":24.50,...}}
   ```

---

## 3. Security Requirements
> [!IMPORTANT]
> **Never commit `config.h` to version control.** The `.gitignore` file already ignores `firmware/**/config.h`. Example files contain placeholders only. Configure each node with its own MQTT username and password; do not put live credentials in source, documentation, or Serial Monitor output.
