"""Initial schema — full table creation + safe column back-fills

Revision ID: 0001
Revises:
Create Date: 2026-11-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    # pgvector extension (safe to run even if already installed)
    bind.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))

    # --- Create all tables that don't exist yet (safe for fresh DB) ---
    from app.db import Base
    from app import models  # noqa: F401 — registers all ORM classes
    Base.metadata.create_all(bind=bind, checkfirst=True)

    # --- Add any columns that may be missing on databases created before they ---
    # --- were added to the models. PostgreSQL ADD COLUMN IF NOT EXISTS is safe  ---
    # --- to run even when the column already exists.                            ---

    cols: list[tuple[str, str, str]] = [
        # (table, column, PostgreSQL type + default)

        # Columns added to 'properties' incrementally over the project lifetime
        ("properties", "admin_email",           "VARCHAR(200)"),
        ("properties", "admin_password_hash",   "VARCHAR(200)"),
        ("properties", "greeting",              "VARCHAR(500)"),
        ("properties", "suggestions",           "JSON"),
        ("properties", "timezone",              "VARCHAR(64) DEFAULT 'Asia/Colombo'"),
        ("properties", "check_in_time",         "VARCHAR(10) DEFAULT '14:00'"),
        ("properties", "check_out_time",        "VARCHAR(10) DEFAULT '11:00'"),
        ("properties", "tax_pct",               "FLOAT DEFAULT 0"),
        ("properties", "service_charge_pct",    "FLOAT DEFAULT 0"),
        ("properties", "weekend_uplift_pct",    "FLOAT DEFAULT 0"),
        ("properties", "weekend_days",          "JSON"),
        ("properties", "meal_plans",            "JSON"),
        ("properties", "free_cancellation_days","INTEGER DEFAULT 7"),
        ("properties", "max_stay_nights",       "INTEGER DEFAULT 30"),

        # Columns added to 'room_types' incrementally
        ("room_types", "image_url",             "VARCHAR(500)"),
    ]

    for table, col, ddl in cols:
        bind.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col} {ddl}"))

    # Set sensible defaults for existing rows where JSON columns are NULL
    bind.execute(text(
        "UPDATE properties SET weekend_days = '[4, 5]'::json WHERE weekend_days IS NULL"
    ))
    bind.execute(text(
        "UPDATE properties SET meal_plans = '{}'::json WHERE meal_plans IS NULL"
    ))


def downgrade() -> None:
    # Drop all managed tables in reverse dependency order
    from app.db import Base
    from app import models  # noqa: F401
    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)
