# VeyraSense ESP32 NODE-01 / NODE-02

The two ESP32-WROOM-32 nodes use the same firmware sketch and the same MQTT protocol. Only the ignored local `include/config.h` differs. The sketch keeps the existing telemetry fields, topics, status message, Last Will, sequence numbering, and reconnect logic.

## Firmware and dependencies

- Sketch: `firmware/esp32/esp32.ino`
- Board package: **esp32 by Espressif Systems**
- Arduino IDE board: **ESP32 Dev Module** (ESP32-WROOM-32)
- Libraries from Library Manager:
  - **PubSubClient** by Nick O'Leary
  - **DHT sensor library** by Adafruit
  - **Adafruit Unified Sensor**

The sketch prints connection state and sensor telemetry for debugging. It does not print the Wi-Fi or MQTT passwords.

## Node configurations

The Raspberry Pi / broker address in the examples is `192.168.1.14`, port `1883`. Change it if the Pi has a different LAN address. Enter each node's own generated MQTT password; do not use its API key.

| Node | MQTT username | DHT11 DATA | MQ-135 AO |
|---|---|---:|---:|
| NODE-01 | `NODE-01` | GPIO32 | GPIO34 |
| NODE-02 | `NODE-02` | GPIO4 | GPIO34 |

For NODE-01, copy the NODE-01 template to the ignored local configuration:

```powershell
Copy-Item firmware/esp32/include/config.h.example firmware/esp32/include/config.h
```

For NODE-02, instead copy its own template:

```powershell
Copy-Item firmware/esp32/include/config.node02.h.example firmware/esp32/include/config.h
```

Edit only `include/config.h` and fill in `WIFI_SSID`, `WIFI_PASSWORD`, and that node's `MQTT_PASSWORD`. The template sets the matching MQTT username and node ID for you. `config.h` is ignored by Git; keep real credentials there only. Never put real passwords in either `.example` file, documentation, or Serial Monitor output.

If the device was revoked or its earlier MQTT password is unavailable, open **Device Management → Edit → Generate reconnect credentials**. Copy the newly shown MQTT password before closing the panel. It is a one-time reveal; generating a replacement invalidates the prior password. A revoked node becomes active and pending connection when new MQTT credentials are generated.

If Device Management shows `localhost` as the device broker, set `MQTT_DEVICE_BROKER_HOST` in the Raspberry Pi environment to the Pi's Wi-Fi reachable LAN IP/hostname (for example `192.168.1.14`), restart the backend, and generate credentials again.

## Backend MQTT contract

The sketch publishes to the node-specific ACL topic:

- `veyrasense/nodes/NODE-01/telemetry` or `veyrasense/nodes/NODE-02/telemetry`
- Status and retained Last Will: `veyrasense/nodes/{node_id}/status`
- Commands subscription: `veyrasense/nodes/{node_id}/commands`

Telemetry uses the existing backend JSON shape: `node_id`, `sequence_num`, UTC `timestamp`, `sensors.temperature`, `sensors.humidity`, `sensors.air_quality_raw`, and `diagnostics`. If the DHT11 read fails, the packet omits temperature and humidity and sends the raw MQ-135 reading only. The backend assigns its own ingestion time.

`air_quality_raw` is an uncalibrated ADC value, not a calibrated gas concentration or CO2/ppm measurement. The current backend maps this channel to `gas_concentration` with unit `ppm`; do not interpret that stored unit as calibration. Correcting that display/unit requires a backend change and is outside this firmware-only scope.

## Wiring and electrical safety

Use the node-specific GPIOs in the table above. Power the DHT11 from 3.3V and share ground between the ESP32 and both sensor modules. Power the MQ-135 module according to its board/heater requirements (commonly 5V); share its ground with the ESP32.

**Never allow GPIO34 to exceed 3.3V.** If the MQ-135 AO output can reach 5V, use a divider before GPIO34. For example, connect AO through a 10 kOhm resistor to GPIO34, then connect a 15 kOhm resistor from GPIO34 to ground; a 5V input becomes about 3.0V. Check the actual module output and resistor tolerances before wiring. Do not connect a 5V AO output directly to the ESP32. Some DHT11 breakout boards have a built-in pull-up; a bare sensor may need a DATA pull-up to 3.3V.

## Arduino IDE upload

1. Install the Espressif ESP32 board package and the three libraries listed above.
2. Select **ESP32 Dev Module**, the connected USB port, and a suitable upload speed.
3. Copy the matching node template to `firmware/esp32/include/config.h` and enter local Wi-Fi/MQTT credentials.
4. Open `firmware/esp32/esp32.ino`, compile, and upload to that board.
5. Open Serial Monitor at **115200 baud**. Confirm Wi-Fi and MQTT connect, then look for online status and telemetry messages. The firmware topics and payload are generated from the configured MQTT username/node ID.
6. For the other physical board, replace local `include/config.h` with the other node template, enter its own password, then compile and upload again. Keep the two MQTT passwords separate.

After generating credentials in Device Management, reload the Pi's Mosquitto configuration if the broker does not automatically pick up its updated password/ACL files. The UI shows the reload command. Then reboot the ESP32.

## Troubleshooting

- Check that the ESP32 and Pi are on the same reachable network and `MQTT_SERVER` is the Pi's LAN IP, not `localhost`.
- Confirm port `1883` is reachable and Mosquitto has reloaded the generated password and ACL files.
- Confirm the MQTT username matches the registered node ID and the correct node-specific password was copied.
- Confirm the broker ACL contains that node's telemetry and status topics.
- DHT errors do not publish invalid temperature/humidity values; check DATA pin, 3.3V supply, ground, and any required pull-up.
- Keep MQ-135 AO at or below 3.3V at GPIO34 and allow the sensor heater to warm up before relying on its raw readings.

## Validation limits

The repository ignores local `config.h`, and both checked-in node templates contain placeholders only. Hardware connectivity must be verified on each physical board; software compilation alone cannot confirm sensor wiring or broker reachability.
