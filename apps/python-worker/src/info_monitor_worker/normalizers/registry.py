from info_monitor_worker.normalizers.base import BaseNormalizer
from info_monitor_worker.normalizers.financial_event import FinancialEventNormalizer
from info_monitor_worker.normalizers.news_announcement import NewsAnnouncementNormalizer
from info_monitor_worker.normalizers.price import PriceNormalizer

NORMALIZERS: dict[str, BaseNormalizer] = {
    "price": PriceNormalizer(),
    "news_announcement": NewsAnnouncementNormalizer(),
    "financial_event": FinancialEventNormalizer(),
}


def get_normalizer(info_type: str) -> BaseNormalizer:
    normalizer = NORMALIZERS.get(info_type)

    if not normalizer:
        raise ValueError(f"Unsupported info_type: {info_type}")

    return normalizer
