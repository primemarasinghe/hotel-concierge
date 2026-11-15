"""Add image_url to properties

Revision ID: 0004
Revises: 0003
Create Date: 2026-11-12

"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import text

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    bind.execute(text("ALTER TABLE properties ADD COLUMN IF NOT EXISTS image_url VARCHAR(500)"))


def downgrade() -> None:
    pass
