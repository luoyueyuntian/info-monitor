from __future__ import annotations

from contextlib import nullcontext
import unittest
from unittest.mock import patch

import info_monitor_worker.service as service_module
from info_monitor_worker.service import WorkerService


class _DummyEngine:
    def begin(self):
        return nullcontext(object())


class WorkerServiceFailureHandlingTest(unittest.TestCase):
    def test_process_run_marks_failure_without_crashing_worker(self):
        service = WorkerService.__new__(WorkerService)
        service.engine = _DummyEngine()

        marked_failure: dict[str, object] = {}

        class _BrokenAdapter:
            def fetch(self, theme, source):
                raise ValueError("generic_content_update_list adapter requires config.url")

        run = {
            "theme_id": "theme-1",
            "theme_name": "Theme 1",
            "info_type": "content_update",
            "source_id": "source-1",
            "source_name": "Broken source",
            "source_type": "page_list",
            "adapter_key": "generic_content_update_list",
            "source_config": {},
            "run_id": "run-1",
            "trigger_type": "manual",
        }

        with (
            patch.object(service_module, "mark_run_running", lambda connection, run_id: None),
            patch.object(
                service_module,
                "mark_run_failed",
                lambda connection, run_id, source_id, error_message, is_test=False: marked_failure.update(
                    {
                        "run_id": run_id,
                        "source_id": source_id,
                        "error_message": error_message,
                        "is_test": is_test,
                    }
                ),
            ),
            patch.object(service_module, "get_adapter", lambda adapter_key: _BrokenAdapter()),
        ):
            service._process_run(run)

        self.assertEqual(
            marked_failure,
            {
                "run_id": "run-1",
                "source_id": "source-1",
                "error_message": "generic_content_update_list adapter requires config.url",
                "is_test": False,
            },
        )


if __name__ == "__main__":
    unittest.main()
