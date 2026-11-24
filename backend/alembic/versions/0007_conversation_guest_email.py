"""Add guest_email to conversations for Google-login-tied chat history

Revision ID: 0007
Revises: 0006
Create Date: 2026-11-24

"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import text

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.get_bind().execute(text(
        "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS guest_email VARCHAR(200)"
    ))
    op.get_bind().execute(text(
        "CREATE INDEX IF NOT EXISTS ix_conversations_guest_email ON conversations (guest_email)"
    ))


def downgrade() -> None:
    pass
