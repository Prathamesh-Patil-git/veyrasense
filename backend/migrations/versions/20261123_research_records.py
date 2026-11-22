"""Add environment-scoped research provenance records."""
from alembic import op
import sqlalchemy as sa

revision = "20261123_research"
down_revision = "20261123_demo_runs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "research_records",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("environment", sa.String(length=8), nullable=False),
        sa.Column("record_type", sa.String(length=32), nullable=False),
        sa.Column("node_id", sa.String(length=64), nullable=False),
        sa.Column("measurement_id", sa.Integer(), nullable=True),
        sa.Column("related_record_id", sa.Integer(), nullable=True),
        sa.Column("payload", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    for name, cols in [("environment", ["environment"]), ("record_type", ["record_type"]), ("node_id", ["node_id"]), ("measurement_id", ["measurement_id"]), ("related_record_id", ["related_record_id"]), ("created_at", ["created_at"]), ("ix_research_env_type_time", ["environment", "record_type", "created_at"])]:
        op.create_index(f"ix_research_records_{name}" if name != "ix_research_env_type_time" else name, "research_records", cols)


def downgrade() -> None:
    for name in ["ix_research_env_type_time", "ix_research_records_created_at", "ix_research_records_related_record_id", "ix_research_records_measurement_id", "ix_research_records_node_id", "ix_research_records_record_type", "ix_research_records_environment"]:
        op.drop_index(name, table_name="research_records")
    op.drop_table("research_records")
