from __future__ import annotations

import importlib
from types import ModuleType, SimpleNamespace
import sys
import unittest
from unittest.mock import patch

class _SequencedService:
    def __init__(self, outcomes):
        self._outcomes = list(outcomes)
        self.calls = 0

    def run_once(self):
        outcome = self._outcomes[self.calls]
        self.calls += 1
        if isinstance(outcome, Exception):
            raise outcome
        return outcome


class WorkerRuntimeTest(unittest.TestCase):
    def _load_worker_class(self):
        service_module = ModuleType("info_monitor_worker.service")
        service_module.WorkerService = object

        with patch.dict(sys.modules, {"info_monitor_worker.service": service_module}):
            sys.modules.pop("info_monitor_worker.worker", None)
            worker_module = importlib.import_module("info_monitor_worker.worker")

        return worker_module.Worker

    def _make_worker(self, outcomes, poll_seconds: int = 7):
        Worker = self._load_worker_class()
        worker = Worker.__new__(Worker)
        worker.config = SimpleNamespace(
            database_url="postgresql://example",
            raw_storage_dir="./data/raw",
            poll_seconds=poll_seconds,
        )
        worker.service = _SequencedService(outcomes)
        return worker

    def test_run_forever_polls_multiple_iterations(self):
        worker = self._make_worker([0, 2])
        sleep_calls: list[int] = []

        with patch("builtins.print"):
            worker.run_forever(iterations=2, sleep_fn=lambda seconds: sleep_calls.append(seconds))

        self.assertEqual(worker.service.calls, 2)
        self.assertEqual(sleep_calls, [7])

    def test_run_forever_continues_after_iteration_failure(self):
        worker = self._make_worker([ValueError("boom"), 1], poll_seconds=11)
        sleep_calls: list[int] = []

        with patch("builtins.print") as print_mock, patch("traceback.print_exc") as traceback_mock:
            worker.run_forever(iterations=2, sleep_fn=lambda seconds: sleep_calls.append(seconds))

        self.assertEqual(worker.service.calls, 2)
        self.assertEqual(sleep_calls, [11])
        traceback_mock.assert_called_once()
        print_mock.assert_any_call("Worker iteration failed: boom")

    def test_stop_drains_service_and_prevents_more_polls(self):
        worker = self._make_worker([0, 1])
        closed = []
        worker.service.close = lambda: closed.append(True)
        with patch("builtins.print"):
            worker.run_forever(iterations=2, sleep_fn=lambda _: worker.stop())
        self.assertEqual(worker.service.calls, 1)
        self.assertEqual(closed, [True])


if __name__ == "__main__":
    unittest.main()
