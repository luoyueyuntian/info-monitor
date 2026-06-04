from abc import ABC, abstractmethod
from typing import Any


class BaseEventRule(ABC):
    @abstractmethod
    def evaluate(self, change: Any):
        raise NotImplementedError
