import os

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def init_db() -> None:
    from . import models  # noqa: F401 — register ORM classes before Alembic runs

    # pgvector must exist before any table that uses it is created
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))

    # Run all pending Alembic migrations (creates tables on first run,
    # applies incremental ALTERs on upgrades — never drops data)
    from alembic.config import Config as AlembicConfig
    from alembic import command as alembic_command

    ini_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "alembic.ini")
    )
    alembic_cfg = AlembicConfig(ini_path)
    alembic_command.upgrade(alembic_cfg, "head")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
