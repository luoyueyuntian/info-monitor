from abc import ABC, abstractmethod
from typing import List

from info_monitor_worker.models import NormalizedRecord


class BaseDetector(ABC):
    @abstractmethod
    def detect(self, current: List[NormalizedRecord], historical: List[NormalizedRecord]):
        raise NotImplementedError
