from info_monitor_worker.adapters.base import BaseAdapter
from info_monitor_worker.adapters.cbirc_announcements import CbircAnnouncementsAdapter
from info_monitor_worker.adapters.csrc_announcements import CsrcAnnouncementsAdapter
from info_monitor_worker.adapters.demo_price_feed import DemoPriceFeedAdapter
from info_monitor_worker.adapters.eastmoney_daily_billboard import (
    EastmoneyDailyBillboardAdapter,
)
from info_monitor_worker.adapters.eastmoney_market_overview import (
    EastmoneyMarketOverviewAdapter,
)
from info_monitor_worker.adapters.eastmoney_stock_kline import EastmoneyStockKlineAdapter
from info_monitor_worker.adapters.generic_announcement_list import GenericAnnouncementListAdapter
from info_monitor_worker.adapters.generic_content_update_list import GenericContentUpdateListAdapter
from info_monitor_worker.adapters.generic_html_price_list import GenericHtmlPriceListAdapter
from info_monitor_worker.adapters.generic_news_announcement_list import (
    GenericNewsAnnouncementListAdapter,
)
from info_monitor_worker.adapters.generic_price_list import GenericPriceListAdapter
from info_monitor_worker.adapters.github_releases import GithubReleasesAdapter
from info_monitor_worker.adapters.ndrc_announcements import NdrcAnnouncementsAdapter
from info_monitor_worker.adapters.pbc_news_list import PbcNewsListAdapter
from info_monitor_worker.adapters.pbc_open_market_announcements import (
    PbcOpenMarketAnnouncementsAdapter,
)
from info_monitor_worker.adapters.pbc_treasury_yield import PbcTreasuryYieldAdapter
from info_monitor_worker.adapters.rss_feed import RssFeedAdapter
from info_monitor_worker.adapters.sina_gold_price import SinaGoldPriceAdapter
from info_monitor_worker.adapters.sina_stock_price import SinaStockPriceAdapter
from info_monitor_worker.adapters.stats_data_release_list import StatsDataReleaseListAdapter
from info_monitor_worker.adapters.yahoo_finance_price import YahooFinancePriceAdapter

ADAPTERS: dict[str, BaseAdapter] = {
    "cbirc_announcements": CbircAnnouncementsAdapter(),
    "csrc_announcements": CsrcAnnouncementsAdapter(),
    "demo_price_feed": DemoPriceFeedAdapter(),
    "eastmoney_daily_billboard": EastmoneyDailyBillboardAdapter(),
    "eastmoney_market_overview": EastmoneyMarketOverviewAdapter(),
    "eastmoney_stock_kline": EastmoneyStockKlineAdapter(),
    "generic_announcement_list": GenericAnnouncementListAdapter(),
    "generic_content_update_list": GenericContentUpdateListAdapter(),
    "generic_html_price_list": GenericHtmlPriceListAdapter(),
    "generic_news_announcement_list": GenericNewsAnnouncementListAdapter(),
    "generic_price_list": GenericPriceListAdapter(),
    "github_releases": GithubReleasesAdapter(),
    "ndrc_announcements": NdrcAnnouncementsAdapter(),
    "pbc_news_list": PbcNewsListAdapter(),
    "pbc_open_market_announcements": PbcOpenMarketAnnouncementsAdapter(),
    "pbc_treasury_yield": PbcTreasuryYieldAdapter(),
    "rss_feed": RssFeedAdapter(),
    "sina_gold_price": SinaGoldPriceAdapter(),
    "sina_stock_price": SinaStockPriceAdapter(),
    "stats_data_release_list": StatsDataReleaseListAdapter(),
    "yahoo_finance_price": YahooFinancePriceAdapter(),
}


def get_adapter(adapter_key: str) -> BaseAdapter:
    adapter = ADAPTERS.get(adapter_key)

    if not adapter:
        raise ValueError(f"Unsupported adapter_key: {adapter_key}")

    return adapter
