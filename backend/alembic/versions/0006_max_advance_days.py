"""Add max_advance_days to properties (outside-customer booking window)

Revision ID: 0006
Revises: 0005
Create Date: 2026-11-24

"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import text

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.get_bind().execute(text(
        "ALTER TABLE properties ADD COLUMN IF NOT EXISTS max_advance_days INTEGER"
    ))


def downgrade() -> None:
    pass
