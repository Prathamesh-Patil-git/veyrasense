"""Persist demonstration scenario controls."""
from alembic import op
import sqlalchemy as sa

revision = "20261123_demo_runs"
down_revision = "20261123_env_sep"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "scenario_runs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("scenario_id", sa.String(length=64), nullable=False),
        sa.Column("environment", sa.String(length=8), server_default="demo", nullable=False),
        sa.Column("node_id", sa.String(length=64), nullable=False, unique=True),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("step_index", sa.Integer(), nullable=False),
        sa.Column("speed", sa.Integer(), nullable=False),
        sa.Column("cycle", sa.Integer(), nullable=False),
        sa.Column("ground_truth", sa.Text(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_scenario_runs_scenario_id", "scenario_runs", ["scenario_id"])
    op.create_index("ix_scenario_runs_environment", "scenario_runs", ["environment"])


def downgrade() -> None:
    op.drop_index("ix_scenario_runs_environment", table_name="scenario_runs")
    op.drop_index("ix_scenario_runs_scenario_id", table_name="scenario_runs")
    op.drop_table("scenario_runs")
