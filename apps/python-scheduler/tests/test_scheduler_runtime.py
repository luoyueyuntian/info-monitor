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


class SchedulerRuntimeTest(unittest.TestCase):
    def _load_scheduler_class(self):
        service_module = ModuleType("info_monitor_scheduler.service")
        service_module.SchedulerService = object

        with patch.dict(sys.modules, {"info_monitor_scheduler.service": service_module}):
            sys.modules.pop("info_monitor_scheduler.scheduler", None)
            scheduler_module = importlib.import_module("info_monitor_scheduler.scheduler")

        return scheduler_module.Scheduler

    def _make_scheduler(self, outcomes, poll_seconds: int = 13):
        Scheduler = self._load_scheduler_class()
        scheduler = Scheduler.__new__(Scheduler)
        scheduler.config = SimpleNamespace(poll_seconds=poll_seconds)
        scheduler.service = _SequencedService(outcomes)
        return scheduler

    def test_run_forever_polls_multiple_iterations(self):
        scheduler = self._make_scheduler([0, 3])
        sleep_calls: list[int] = []

        with patch("builtins.print"):
            scheduler.run_forever(iterations=2, sleep_fn=lambda seconds: sleep_calls.append(seconds))

        self.assertEqual(scheduler.service.calls, 2)
        self.assertEqual(sleep_calls, [13])

    def test_run_forever_continues_after_iteration_failure(self):
        scheduler = self._make_scheduler([RuntimeError("queue failed"), 1], poll_seconds=17)
        sleep_calls: list[int] = []

        with patch("builtins.print") as print_mock, patch("traceback.print_exc") as traceback_mock:
            scheduler.run_forever(iterations=2, sleep_fn=lambda seconds: sleep_calls.append(seconds))

        self.assertEqual(scheduler.service.calls, 2)
        self.assertEqual(sleep_calls, [17])
        traceback_mock.assert_called_once()
        print_mock.assert_any_call("Scheduler iteration failed: queue failed")


if __name__ == "__main__":
    unittest.main()
