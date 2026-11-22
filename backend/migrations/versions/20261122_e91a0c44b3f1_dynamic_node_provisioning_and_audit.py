"""dynamic_node_provisioning_and_audit

Revision ID: e91a0c44b3f1
Revises: fb48cb3ff68b
Create Date: 2026-11-22 18:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e91a0c44b3f1'
down_revision: Union[str, None] = 'fb48cb3ff68b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create audit_logs table
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('action', sa.String(length=64), nullable=False),
        sa.Column('entity_type', sa.String(length=64), nullable=False),
        sa.Column('entity_id', sa.String(length=64), nullable=False),
        sa.Column('actor', sa.String(length=128), nullable=False),
        sa.Column('details', sa.String(length=1024), nullable=True),
        sa.Column('ip_address', sa.String(length=64), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('audit_logs', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_audit_logs_timestamp'), ['timestamp'], unique=False)
        batch_op.create_index(batch_op.f('ix_audit_logs_action'), ['action'], unique=False)
        batch_op.create_index(batch_op.f('ix_audit_logs_entity_id'), ['entity_id'], unique=False)

    # 2. Add provisioning and MQTT fields to sensor_nodes
    with op.batch_alter_table('sensor_nodes', schema=None) as batch_op:
        batch_op.add_column(sa.Column('location', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('provisioning_status', sa.String(length=32), server_default='pending', nullable=False))
        batch_op.add_column(sa.Column('mqtt_username', sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column('mqtt_password_hash', sa.String(length=128), nullable=True))
        batch_op.add_column(sa.Column('credentials_rotated_at', sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True))
        batch_op.create_index(batch_op.f('ix_sensor_nodes_provisioning_status'), ['provisioning_status'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('sensor_nodes', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_sensor_nodes_provisioning_status'))
        batch_op.drop_column('revoked_at')
        batch_op.drop_column('credentials_rotated_at')
        batch_op.drop_column('mqtt_password_hash')
        batch_op.drop_column('mqtt_username')
        batch_op.drop_column('provisioning_status')
        batch_op.drop_column('location')

    with op.batch_alter_table('audit_logs', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_audit_logs_entity_id'))
        batch_op.drop_index(batch_op.f('ix_audit_logs_action'))
        batch_op.drop_index(batch_op.f('ix_audit_logs_timestamp'))

    op.drop_table('audit_logs')
