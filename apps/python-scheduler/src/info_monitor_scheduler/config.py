import os
from dataclasses import dataclass


@dataclass
class SchedulerConfig:
    poll_seconds: int


def load_config() -> SchedulerConfig:
    return SchedulerConfig(
        poll_seconds=int(os.getenv("SCHEDULER_POLL_SECONDS", "30")),
    )
