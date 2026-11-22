"""VeyraSense MQTT Telemetry Ingestion Worker Daemon.

Runs as a dedicated systemd service (veyrasense-mqtt-worker.service)
on Raspberry Pi 5 Gateway. Connects to Mosquitto MQTT broker,
subscribes to per-node topics, validates packet integrity, and
ingests telemetry into SQLite.

Features:
- Auto-reconnection with exponential backoff
- Clean graceful shutdown handling on SIGTERM / SIGINT
- Database session lifecycle management per message
"""
import sys
import time
import signal
import logging
import paho.mqtt.client as mqtt
from app.core.config import settings
from app.database.connection import SessionLocal
from app.services.mqtt_service import MQTTIngestionService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [MQTT-WORKER] %(message)s",
)
logger = logging.getLogger("mqtt_worker")

running = True


def signal_handler(signum, frame):
    global running
    logger.info(f"Received signal {signum}. Initiating graceful shutdown...")
    running = False


def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        logger.info(f"Connected to Mosquitto broker at {settings.MQTT_BROKER_HOST}:{settings.MQTT_BROKER_PORT}")
        # Subscribe to all per-node telemetry and status topics
        telemetry_topic = "veyrasense/nodes/+/telemetry"
        status_topic = "veyrasense/nodes/+/status"
        client.subscribe([(telemetry_topic, 1), (status_topic, 1)])
        logger.info(f"Subscribed to topics: '{telemetry_topic}', '{status_topic}'")
    else:
        logger.error(f"Failed to connect to Mosquitto broker, return code: {rc}")


def on_message(client, userdata, msg):
    topic = msg.topic
    payload = msg.payload
    logger.debug(f"Received packet on topic '{topic}' ({len(payload)} bytes)")

    db = SessionLocal()
    try:
        if topic.endswith("/telemetry"):
            result = MQTTIngestionService.process_telemetry_message(
                db=db,
                topic=topic,
                payload_raw=payload,
            )
            if result.get("status") == "accepted":
                logger.info(
                    f"Ingested telemetry for node '{result.get('node_id')}' "
                    f"(seq #{result.get('sequence_num')}, {result.get('measurements_ingested')} points)"
                )
            elif result.get("status") == "duplicate":
                logger.debug(f"Dropped duplicate: {result.get('detail')}")
            else:
                logger.warning(f"Rejected telemetry on '{topic}': {result.get('detail')}")

        elif topic.endswith("/status"):
            result = MQTTIngestionService.process_status_message(
                db=db,
                topic=topic,
                payload_raw=payload,
            )
            logger.info(f"Node status update on '{topic}': {result}")

    except Exception as e:
        logger.error(f"Error processing MQTT message on '{topic}': {e}", exc_info=True)
    finally:
        db.close()


def on_disconnect(client, userdata, rc, properties=None):
    if rc != 0:
        logger.warning(f"Unexpected disconnect from Mosquitto broker (rc={rc}). Will auto-reconnect...")
    else:
        logger.info("Disconnected cleanly from Mosquitto broker.")


def main():
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    logger.info("Starting VeyraSense MQTT Telemetry Ingestion Worker Daemon...")
    client_id = f"veyrasense_ingestion_worker_{int(time.time())}"

    # Handle paho-mqtt v1 and v2 client signatures
    try:
        client = mqtt.Client(
            callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
            client_id=client_id,
        )
    except (AttributeError, TypeError):
        client = mqtt.Client(client_id=client_id)

    # Configure credentials
    if settings.MQTT_BACKEND_USERNAME and settings.MQTT_BACKEND_PASSWORD:
        client.username_pw_set(
            username=settings.MQTT_BACKEND_USERNAME,
            password=settings.MQTT_BACKEND_PASSWORD,
        )

    client.on_connect = on_connect
    client.on_message = on_message
    client.on_disconnect = on_disconnect

    logger.info(f"Connecting to broker at {settings.MQTT_BROKER_HOST}:{settings.MQTT_BROKER_PORT}...")
    try:
        client.connect(settings.MQTT_BROKER_HOST, settings.MQTT_BROKER_PORT, keepalive=60)
        client.loop_start()

        while running:
            time.sleep(1)

        logger.info("Stopping MQTT client loop...")
        client.loop_stop()
        client.disconnect()
        logger.info("MQTT worker daemon terminated cleanly.")
    except Exception as e:
        logger.error(f"Fatal error in MQTT worker daemon: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
