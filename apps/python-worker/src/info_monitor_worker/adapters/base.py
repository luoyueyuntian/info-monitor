from abc import ABC, abstractmethod
from typing import Any

from info_monitor_worker.models import RawFetchResult, SourceContext, ThemeContext


class BaseAdapter(ABC):
    @abstractmethod
    def fetch(self, theme: ThemeContext, source: SourceContext) -> RawFetchResult:
        raise NotImplementedError

    @abstractmethod
    def map_to_normalizer_input(self, raw_result: RawFetchResult) -> Any:
        raise NotImplementedError
