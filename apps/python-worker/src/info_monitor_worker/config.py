import os
from dataclasses import dataclass


@dataclass
class WorkerConfig:
    database_url: str
    raw_storage_dir: str
    poll_seconds: int
    # HTTP client (anti-scraping)
    http_timeout: float
    http_max_retries: int
    http_rate_limit_per_domain: float
    http_proxy: str | None
    # Meilisearch
    meili_host: str
    meili_api_key: str


def load_config() -> WorkerConfig:
    return WorkerConfig(
        database_url=os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/info_monitor"),
        raw_storage_dir=os.getenv("RAW_STORAGE_DIR", "./data/raw"),
        poll_seconds=int(os.getenv("WORKER_POLL_SECONDS", "30")),
        http_timeout=float(os.getenv("REQUEST_TIMEOUT", "20")),
        http_max_retries=int(os.getenv("MAX_RETRIES", "3")),
        http_rate_limit_per_domain=float(os.getenv("RATE_LIMIT_PER_DOMAIN_PER_SECOND", "2")),
        http_proxy=os.getenv("HTTP_PROXY") or os.getenv("HTTPS_PROXY") or None,
        meili_host=os.getenv("MEILI_HOST", ""),
        meili_api_key=os.getenv("MEILI_API_KEY", ""),
    )
