"""Add blocked_dates table for SLT internal / manual date blocking

Revision ID: 0005
Revises: 0004
Create Date: 2026-11-24

"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import text

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    bind.execute(text("""
        CREATE TABLE IF NOT EXISTS blocked_dates (
            id          SERIAL PRIMARY KEY,
            property_id INTEGER NOT NULL REFERENCES properties(id),
            room_type_id INTEGER REFERENCES room_types(id),
            date        DATE NOT NULL,
            reason      VARCHAR(32) NOT NULL DEFAULT 'slt_internal',
            source      VARCHAR(16) NOT NULL DEFAULT 'manual',
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """))
    bind.execute(text("CREATE INDEX IF NOT EXISTS ix_blocked_dates_property_id ON blocked_dates(property_id)"))
    bind.execute(text("CREATE INDEX IF NOT EXISTS ix_blocked_dates_room_type_id ON blocked_dates(room_type_id)"))
    bind.execute(text("CREATE INDEX IF NOT EXISTS ix_blocked_dates_date ON blocked_dates(date)"))


def downgrade() -> None:
    op.get_bind().execute(text("DROP TABLE IF EXISTS blocked_dates"))
