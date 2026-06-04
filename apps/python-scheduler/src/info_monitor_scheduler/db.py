from __future__ import annotations

import os

from sqlalchemy import create_engine


def _normalize_database_url(database_url: str) -> str:
    if database_url.startswith("postgresql://"):
        return database_url.replace("postgresql://", "postgresql+psycopg://", 1)

    return database_url


def create_db_engine():
    database_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/info_monitor")
    return create_engine(_normalize_database_url(database_url), future=True)
