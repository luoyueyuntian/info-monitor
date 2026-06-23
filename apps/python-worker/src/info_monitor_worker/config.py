import os
from dataclasses import dataclass


@dataclass
class WorkerConfig:
    database_url: str
    raw_storage_dir: str
    poll_seconds: int


def load_config() -> WorkerConfig:
    return WorkerConfig(
        database_url=os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/info_monitor"),
        raw_storage_dir=os.getenv("RAW_STORAGE_DIR", "./data/raw"),
        poll_seconds=int(os.getenv("WORKER_POLL_SECONDS", "30")),
    )
