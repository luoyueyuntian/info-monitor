import time
import traceback
from threading import Event

from info_monitor_worker.config import load_config
from info_monitor_worker.service import WorkerService


class Worker:
    def __init__(self) -> None:
        self.config = load_config()
        self.service = WorkerService()
        self._stop_event = Event()

    def run_once(self) -> None:
        claimed = self.service.run_once()
        print(f"Worker poll: claimed {claimed} runs")

    def stop(self) -> None:
        self._stop_event.set()

    def run_forever(self, *, iterations: int | None = None, sleep_fn=time.sleep) -> None:
        self._stop_event = getattr(self, "_stop_event", Event())
        completed_iterations = 0
        try:
            while not self._stop_event.is_set() and (iterations is None or completed_iterations < iterations):
                try:
                    self.run_once()
                except Exception as error:
                    print(f"Worker iteration failed: {error}")
                    traceback.print_exc()
                completed_iterations += 1
                if iterations is not None and completed_iterations >= iterations:
                    break
                if sleep_fn is time.sleep:
                    self._stop_event.wait(self.config.poll_seconds)
                else:
                    sleep_fn(self.config.poll_seconds)
        finally:
            close = getattr(self.service, "close", None)
            if close:
                close()
