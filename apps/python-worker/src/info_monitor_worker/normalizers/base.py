from abc import ABC, abstractmethod
from typing import Any, List

from info_monitor_worker.models import NormalizedRecord


class BaseNormalizer(ABC):
    @abstractmethod
    def normalize(self, payload: Any) -> List[NormalizedRecord]:
        raise NotImplementedError
