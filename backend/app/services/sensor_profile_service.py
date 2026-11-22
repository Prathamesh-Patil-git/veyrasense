from typing import List, Optional
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.database.models.sensor_profile import SensorProfile
from app.schemas.sensor_profile import SensorProfileCreate, SensorProfileResponse


class SensorProfileService:
    """Sensor Profiles defining physical measurement types and units."""

    @staticmethod
    def list_profiles(db: Session) -> List[SensorProfileResponse]:
        stmt = select(SensorProfile).order_by(SensorProfile.id.asc())
        profiles = db.scalars(stmt).all()
        return [SensorProfileResponse.model_validate(p) for p in profiles]

    @staticmethod
    def get_profile_by_id(db: Session, profile_id: int) -> Optional[SensorProfile]:
        return db.get(SensorProfile, profile_id)

    @staticmethod
    def get_profile_by_name(db: Session, name: str) -> Optional[SensorProfile]:
        stmt = select(SensorProfile).where(func.lower(SensorProfile.name) == name.lower())
        return db.scalar(stmt)

    @staticmethod
    def create_profile(db: Session, data: SensorProfileCreate) -> SensorProfile:
        existing = SensorProfileService.get_profile_by_name(db, data.name)
        if existing:
            raise ValueError(f"Sensor profile '{data.name}' already exists.")

        profile = SensorProfile(
            name=data.name,
            measurement_type=data.measurement_type,
            unit=data.unit,
            description=data.description,
            default_minimum=data.default_minimum,
            default_maximum=data.default_maximum,
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
        return profile
