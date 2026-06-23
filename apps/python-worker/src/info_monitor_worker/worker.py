import time
import traceback

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

    def run_forever(self, *, iterations: int | None = None, sleep_fn=time.sleep) -> None:
        completed_iterations = 0

        while iterations is None or completed_iterations < iterations:
            try:
                self.run_once()
            except Exception as error:
                print(f"Worker iteration failed: {error}")
                traceback.print_exc()

            completed_iterations += 1
            if iterations is not None and completed_iterations >= iterations:
                break

            sleep_fn(self.config.poll_seconds)
