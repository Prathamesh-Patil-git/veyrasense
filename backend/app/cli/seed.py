"""Development-only seed utility to populate SQLite with sample industrial sensor fleet.

All generated records are visibly marked as demonstration data.
"""
import sys
import logging
from datetime import datetime, timezone, timedelta
from app.core.config import settings
from app.database.connection import SessionLocal, engine
from app.database.base import Base
from app.database.models import (
    Department,
    SensorNode,
    SensorProfile,
    Sensor,
    Measurement,
    Administrator,
)
from app.services.auth_service import AuthService

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("seed")


def seed_database():
    """Seed initial development dataset."""
    logger.info("Initializing SQLite database tables...")
    settings.resolved_data_dir
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # 1. Seed or update development Administrator
        admin = AuthService.get_admin_by_email(db, settings.DEV_ADMIN_EMAIL)
        if not admin:
            logger.info(f"Creating development administrator: {settings.DEV_ADMIN_EMAIL}")
            admin = AuthService.create_admin(
                db=db,
                email=settings.DEV_ADMIN_EMAIL,
                password=settings.DEV_ADMIN_PASSWORD,
                full_name=settings.DEV_ADMIN_NAME,
            )
        else:
            logger.info(f"Administrator {settings.DEV_ADMIN_EMAIL} already exists.")

        # 2. Seed 7 Industrial Departments
        department_definitions = [
            ("Production", "Discrete assembly, robotic machining and manufacturing lines"),
            ("Quality Control", "Optical inspection, dimensional tolerance, and test benches"),
            ("Maintenance", "Predictive motor vibration, lubricant temp, and machine bearings"),
            ("Utilities", "Industrial HVAC chillers, water drainage, and pneumatic air"),
            ("Storage & Warehouse", "Automated retrieval racking, climate storage, and bay humidity"),
            ("Environmental Monitoring", "Perimeter emissions, toxic gas detection, and stormwater runoff"),
            ("Research & Development", "Experimental pilot lines and endurance testing"),
        ]

        created_depts: dict[str, Department] = {}
        for name, desc in department_definitions:
            dept = db.query(Department).filter(Department.name == name).first()
            if not dept:
                dept = Department(name=name, description=desc, is_active=True)
                db.add(dept)
                db.flush()
                logger.info(f"Created Department: {name}")
            created_depts[name] = dept

        # 3. Seed Sensor Profiles
        profile_definitions = [
            ("Flow Rate", "flow_rate", "L/min", "Liquid volumetric flow", 0.0, 100.0),
            ("Ultrasonic Distance", "distance", "cm", "Echo distance to liquid/surface", 2.0, 400.0),
            ("Gas Concentration", "gas_concentration", "ppm", "Air quality and VOC", 10.0, 1000.0),
            ("3-Axis Vibration", "vibration", "g", "Motor acceleration peak", 0.0, 16.0),
            ("Industrial Temperature", "temperature", "°C", "Thermal probe", -40.0, 125.0),
            ("Barometric Pressure", "pressure", "bar", "Atmospheric/pipe pressure", 0.8, 10.0),
            ("Relative Humidity", "humidity", "%RH", "Ambient humidity", 0.0, 100.0),
        ]

        created_profiles: dict[str, SensorProfile] = {}
        for name, m_type, unit, desc, min_v, max_v in profile_definitions:
            prof = db.query(SensorProfile).filter(SensorProfile.name == name).first()
            if not prof:
                prof = SensorProfile(
                    name=name,
                    measurement_type=m_type,
                    unit=unit,
                    description=desc,
                    default_minimum=min_v,
                    default_maximum=max_v,
                )
                db.add(prof)
                db.flush()
                logger.info(f"Created Sensor Profile: {name}")
            created_profiles[name] = prof

        # 4. Seed 16 Sensor Nodes
        node_definitions = [
            ("NODE-PRD-01", "Robotic Cell #1 Flow Monitor", "Production", "ESP32-WROOM-32", "v1.4.2", "healthy"),
            ("NODE-PRD-02", "Conveyor Belt Motor Monitor", "Production", "ESP32-WROOM-32", "v1.4.2", "healthy"),
            ("NODE-PRD-03", "Stamping Press Hydraulic Monitor", "Production", "ESP32-S3", "v1.5.0", "healthy"),
            ("NODE-QC-01", "Optical Calibration Stage Temp", "Quality Control", "RP2040-W", "v2.1.0", "healthy"),
            ("NODE-QC-02", "Dimensional Rig Air Humidity", "Quality Control", "ESP8266-12F", "v1.1.8", "healthy"),
            ("NODE-MNT-01", "Compressor Chiller #1 Vibration", "Maintenance", "ESP32-WROOM-32", "v1.4.2", "warning"),
            ("NODE-MNT-02", "Turbine Bearing Temp Monitor", "Maintenance", "ESP32-WROOM-32", "v1.4.2", "healthy"),
            ("NODE-MNT-03", "Exhaust Blower Accel Sensor", "Maintenance", "ESP32-C3", "v1.3.1", "healthy"),
            ("NODE-UTL-01", "Stormwater Level Transducer #1", "Utilities", "ESP32-WROOM-32", "v1.4.2", "alert"),
            ("NODE-UTL-02", "Boiler Feedwater Pressure Node", "Utilities", "ESP32-S3", "v1.5.0", "healthy"),
            ("NODE-UTL-03", "Cooling Tower Drainage Ultrasonic", "Utilities", "ESP32-WROOM-32", "v1.4.2", "healthy"),
            ("NODE-STR-01", "Cold Vault #2 Ambient Chamber", "Storage & Warehouse", "ESP8266-12F", "v1.1.8", "healthy"),
            ("NODE-STR-02", "Aisle 4 Ambient Relative Humidity", "Storage & Warehouse", "ESP8266-12F", "v1.1.8", "healthy"),
            ("NODE-ENV-01", "Perimeter VOC / Gas Detector #1", "Environmental Monitoring", "ESP32-WROOM-32", "v1.4.2", "healthy"),
            ("NODE-ENV-02", "Effluent Pit Level Sensor", "Environmental Monitoring", "ESP32-WROOM-32", "v1.4.2", "calibrating"),
            ("NODE-RND-01", "Prototype Thermal Chamber Node", "Research & Development", "ESP32-S3", "v1.5.0", "healthy"),
        ]

        now = datetime.now(timezone.utc)
        for node_id, name, dept_name, hw, fw, status in node_definitions:
            node = db.query(SensorNode).filter(SensorNode.node_id == node_id).first()
            if not node:
                dept = created_depts.get(dept_name)
                if not dept:
                    continue
                node = SensorNode(
                    node_id=node_id,
                    name=name,
                    department_id=dept.id,
                    hardware_type=hw,
                    firmware_version=fw,
                    status=status,
                    registered_at=now - timedelta(days=14),
                    last_seen_at=now - timedelta(minutes=2),
                    is_active=True,
                    environment="demo",
                )
                db.add(node)
                db.flush()
                logger.info(f"Created Sensor Node: {node_id} ({dept_name})")

                # Create sample initial measurement
                meas = Measurement(
                    message_uid=f"msg-{node_id}-seed-001",
                    node_id=node.id,
                    measurement_type="flow_rate" if "Flow" in name else "distance" if "Level" in name else "temperature",
                    value=42.8 if "Flow" in name else 18.2 if "Level" in name else 24.5,
                    unit="L/min" if "Flow" in name else "cm" if "Level" in name else "°C",
                    measured_at=now,
                    received_at=now,
                    quality="good" if status == "healthy" else "suspect" if status == "alert" else "synthetic_recovery",
                    source_type="telemetry" if status != "alert" else "challenge_response",
                    environment="demo",
                )
                db.add(meas)

        db.commit()
        logger.info("Successfully seeded VeyraSense demonstration dataset!")
    except Exception as e:
        db.rollback()
        logger.error(f"Seeding failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
