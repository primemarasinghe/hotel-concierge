"""Add booking_reference to conversations; assigned_to + staff_notes to service_requests

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-11

"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import text

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    bind.execute(text("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS booking_reference VARCHAR(20) NULL"))
    bind.execute(text("ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(120) NULL"))
    bind.execute(text("ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS staff_notes TEXT NULL"))


def downgrade() -> None:
    pass
