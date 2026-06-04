from info_monitor_worker.config import load_config
from info_monitor_worker.service import WorkerService


class Worker:
    def __init__(self) -> None:
        self.config = load_config()
        self.service = WorkerService()

    def run_once(self) -> None:
        processed = self.service.run_once()
        print("Worker executed")
        print(f"Database URL: {self.config.database_url}")
        print(f"Raw storage dir: {self.config.raw_storage_dir}")
        print(f"Processed pending runs: {processed}")
