from info_monitor_worker.adapters.base import BaseAdapter
from info_monitor_worker.adapters.demo_price_feed import DemoPriceFeedAdapter
from info_monitor_worker.adapters.eastmoney_stock_kline import EastmoneyStockKlineAdapter
from info_monitor_worker.adapters.generic_announcement_list import GenericAnnouncementListAdapter
from info_monitor_worker.adapters.generic_content_update_list import GenericContentUpdateListAdapter
from info_monitor_worker.adapters.generic_price_list import GenericPriceListAdapter
from info_monitor_worker.adapters.pbc_news_list import PbcNewsListAdapter
from info_monitor_worker.adapters.pbc_open_market_announcements import (
    PbcOpenMarketAnnouncementsAdapter,
)
from info_monitor_worker.adapters.stats_data_release_list import StatsDataReleaseListAdapter

ADAPTERS: dict[str, BaseAdapter] = {
    "demo_price_feed": DemoPriceFeedAdapter(),
    "eastmoney_stock_kline": EastmoneyStockKlineAdapter(),
    "generic_announcement_list": GenericAnnouncementListAdapter(),
    "generic_content_update_list": GenericContentUpdateListAdapter(),
    "generic_price_list": GenericPriceListAdapter(),
    "pbc_news_list": PbcNewsListAdapter(),
    "pbc_open_market_announcements": PbcOpenMarketAnnouncementsAdapter(),
    "stats_data_release_list": StatsDataReleaseListAdapter(),
}


def get_adapter(adapter_key: str) -> BaseAdapter:
    adapter = ADAPTERS.get(adapter_key)

    if not adapter:
        raise ValueError(f"Unsupported adapter_key: {adapter_key}")

    return adapter
