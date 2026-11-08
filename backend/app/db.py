from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def init_db() -> None:
    from . import models  # noqa: F401  (register tables)

    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    Base.metadata.create_all(engine)
    _migrate()


def _migrate() -> None:
    """Add columns introduced after initial schema without dropping data."""
    from sqlalchemy import inspect as sa_inspect
    inspector = sa_inspect(engine)
    existing_rt = {c["name"] for c in inspector.get_columns("room_types")}
    existing_p = {c["name"] for c in inspector.get_columns("properties")}
    with engine.begin() as conn:
        if "image_url" not in existing_rt:
            conn.execute(text("ALTER TABLE room_types ADD COLUMN image_url VARCHAR(500)"))
        if "admin_email" not in existing_p:
            conn.execute(text("ALTER TABLE properties ADD COLUMN admin_email VARCHAR(200)"))
        if "admin_password_hash" not in existing_p:
            conn.execute(text("ALTER TABLE properties ADD COLUMN admin_password_hash VARCHAR(200)"))
        if "greeting" not in existing_p:
            conn.execute(text("ALTER TABLE properties ADD COLUMN greeting VARCHAR(500)"))
        if "suggestions" not in existing_p:
            conn.execute(text("ALTER TABLE properties ADD COLUMN suggestions JSON"))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
