from __future__ import annotations

import unittest
from datetime import datetime, timedelta, timezone

from info_monitor_worker.adapters.eastmoney_daily_billboard import (
    _should_allow_empty_result,
    build_billboard_query_params,
)


class EastmoneyDailyBillboardQueryTest(unittest.TestCase):
    def test_uses_single_quoted_dates_and_matching_sort_types(self):
        today = datetime(2026, 6, 19, 13, 0, tzinfo=timezone(timedelta(hours=8)))

        params = build_billboard_query_params(today=today, page_size=20, days=1)

        self.assertEqual(
            params["filter"],
            "(TRADE_DATE>='2026-06-19')(TRADE_DATE<='2026-06-19')",
        )
        self.assertEqual(params["sortTypes"], "-1,-1")
        self.assertEqual(params["sortColumns"], "TRADE_DATE,BILLBOARD_NET_AMT")

    def test_treats_empty_response_as_non_failure_before_run_after_time(self):
        before_close = datetime(2026, 6, 19, 13, 50, tzinfo=timezone(timedelta(hours=8)))
        after_close = datetime(2026, 6, 19, 16, 30, tzinfo=timezone(timedelta(hours=8)))

        self.assertTrue(_should_allow_empty_result(before_close, "16:20"))
        self.assertFalse(_should_allow_empty_result(after_close, "16:20"))
        self.assertFalse(_should_allow_empty_result(before_close, None))


if __name__ == "__main__":
    unittest.main()
