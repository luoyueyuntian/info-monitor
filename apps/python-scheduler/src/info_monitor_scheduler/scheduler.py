import time
import traceback

from info_monitor_scheduler.config import load_config
from info_monitor_scheduler.service import SchedulerService


class Scheduler:
    def __init__(self) -> None:
        self.config = load_config()
        self.service = SchedulerService()

    def run_once(self) -> None:
        queued = self.service.run_once()
        print("Scheduler executed")
        print(f"Poll interval: {self.config.poll_seconds}s")
        print(f"Queued runs: {queued}")

    def run_forever(self, *, iterations: int | None = None, sleep_fn=time.sleep) -> None:
        completed_iterations = 0

        while iterations is None or completed_iterations < iterations:
            try:
                self.run_once()
            except Exception as error:
                print(f"Scheduler iteration failed: {error}")
                traceback.print_exc()

            completed_iterations += 1
            if iterations is not None and completed_iterations >= iterations:
                break

            sleep_fn(self.config.poll_seconds)
