from __future__ import annotations

from sqlalchemy import create_engine

from info_monitor_worker.config import load_config


def _normalize_database_url(database_url: str) -> str:
    if database_url.startswith("postgresql://"):
        return database_url.replace("postgresql://", "postgresql+psycopg://", 1)

    return database_url


def create_db_engine():
    config = load_config()
    return create_engine(_normalize_database_url(config.database_url), future=True)
