from __future__ import annotations

import unittest

from info_monitor_worker.info_types import canonicalize_info_type


class CanonicalizeInfoTypeTest(unittest.TestCase):
    def test_maps_price_aliases_to_price(self):
        self.assertEqual(canonicalize_info_type("stock_price"), "price")
        self.assertEqual(canonicalize_info_type("commodity_price"), "price")

    def test_keeps_supported_types_unchanged(self):
        self.assertEqual(canonicalize_info_type("price"), "price")
        self.assertEqual(canonicalize_info_type("news_announcement"), "news_announcement")


if __name__ == "__main__":
    unittest.main()
