"""Add voice_agent_name to properties

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-11

"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import text

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    bind.execute(text("ALTER TABLE properties ADD COLUMN IF NOT EXISTS voice_agent_name VARCHAR(64) NOT NULL DEFAULT 'Voice Agent'"))


def downgrade() -> None:
    pass
