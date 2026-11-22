"""Add real/demo data separation."""
from alembic import op
import sqlalchemy as sa

revision = "20261123_env_sep"
down_revision = "e91a0c44b3f1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("sensor_nodes", sa.Column("environment", sa.String(length=8), server_default="real", nullable=False))
    op.create_index("ix_sensor_nodes_environment", "sensor_nodes", ["environment"])
    op.add_column("measurements", sa.Column("environment", sa.String(length=8), server_default="real", nullable=False))
    op.create_index("ix_measurements_environment", "measurements", ["environment"])


def downgrade() -> None:
    op.drop_index("ix_measurements_environment", table_name="measurements")
    op.drop_column("measurements", "environment")
    op.drop_index("ix_sensor_nodes_environment", table_name="sensor_nodes")
    op.drop_column("sensor_nodes", "environment")
