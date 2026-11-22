from typing import List, Optional
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.database.models.department import Department
from app.database.models.node import SensorNode
from app.schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentWithCountResponse


class DepartmentService:
    """Department operations and telemetry fleet breakdown."""

    @staticmethod
    def list_departments(
        db: Session, active_only: bool = False
    ) -> List[DepartmentWithCountResponse]:
        stmt = select(Department)
        if active_only:
            stmt = stmt.where(Department.is_active.is_(True))
        departments = db.scalars(stmt).all()

        # If database has no departments, bootstrap standard industrial departments
        if len(departments) == 0:
            core_depts = [
                ("Production", "Continuous chemical synthesis, assembly lines, and reactor vessel monitoring"),
                ("Quality Control", "Precision dimension, purity, acoustic ringdown, and tolerance verification"),
                ("Maintenance", "Predictive machinery vibration, pump wear, and bearing degradation analysis"),
                ("Utilities", "Hydraulic drainage networks, cooling towers, power distribution, and manholes"),
                ("Storage & Warehouse", "Ambient environmental climate, cold chain storage, and sealed vessel integrity"),
                ("Environmental Monitoring", "Toxic gas emission detection, stormwater runoff, and ambient atmospheric quality"),
                ("Research & Development", "Experimental AIoT sensor challenge-response validation testbed"),
            ]
            for name, desc in core_depts:
                db.add(Department(name=name, description=desc, is_active=True))
            db.commit()
            departments = db.scalars(stmt).all()

        results: List[DepartmentWithCountResponse] = []
        for dept in departments:
            # Query counts
            node_count = db.scalar(
                select(func.count(SensorNode.id)).where(SensorNode.department_id == dept.id)
            ) or 0
            online_count = db.scalar(
                select(func.count(SensorNode.id)).where(
                    SensorNode.department_id == dept.id,
                    SensorNode.status.in_(["online", "healthy"]),
                )
            ) or 0

            health = (
                round((online_count / node_count) * 100, 1)
                if node_count > 0
                else 100.0
            )

            results.append(
                DepartmentWithCountResponse(
                    id=dept.id,
                    name=dept.name,
                    description=dept.description,
                    is_active=dept.is_active,
                    created_at=dept.created_at,
                    updated_at=dept.updated_at,
                    node_count=node_count,
                    online_count=online_count,
                    health_percentage=health,
                )
            )
        return results

    @staticmethod
    def get_department_by_id(db: Session, department_id: int) -> Optional[Department]:
        return db.get(Department, department_id)

    @staticmethod
    def get_department_by_name(db: Session, name: str) -> Optional[Department]:
        stmt = select(Department).where(func.lower(Department.name) == name.lower())
        return db.scalar(stmt)

    @staticmethod
    def create_department(db: Session, data: DepartmentCreate) -> Department:
        existing = DepartmentService.get_department_by_name(db, data.name)
        if existing:
            raise ValueError(f"Department with name '{data.name}' already exists.")
        dept = Department(
            name=data.name,
            description=data.description,
            is_active=True,
        )
        db.add(dept)
        db.commit()
        db.refresh(dept)
        return dept
