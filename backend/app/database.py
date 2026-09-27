"""
SQLAlchemy engine/session setup.

DECISION: we use SQLAlchemy's ORM layer (not raw SQL) specifically so the
same models.py works unmodified against SQLite (dev default), PostgreSQL,
or MySQL — only DATABASE_URL changes. See DECISIONS.md Entry 2.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}

engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
