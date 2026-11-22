from datetime import datetime
from sqlalchemy import String, Integer, DateTime, Text, Index
from sqlalchemy.orm import Mapped, mapped_column
from app.database.base import Base, utc_now


class ResearchRecord(Base):
    """Environment-scoped analysis, evidence, diagnosis, recovery, and provenance record."""
    __tablename__ = "research_records"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    environment: Mapped[str] = mapped_column(String(8), nullable=False, index=True)
    record_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    node_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    measurement_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    related_record_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    payload: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)
    __table_args__ = (Index("ix_research_env_type_time", "environment", "record_type", "created_at"),)
