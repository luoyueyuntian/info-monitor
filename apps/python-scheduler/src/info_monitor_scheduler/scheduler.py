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
