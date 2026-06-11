"""Registry for change detectors."""

from __future__ import annotations

from typing import Dict, Type

from info_monitor_worker.detectors.base import BaseDetector
from info_monitor_worker.detectors.record_change import RecordChangeDetector

# Default detector used for all info_types
_default_detector = RecordChangeDetector()

# Info-type specific detectors (register here when needed)
_detectors: Dict[str, BaseDetector] = {}


def register_detector(info_type: str, detector: BaseDetector) -> None:
    """Register a detector for a specific info_type."""
    _detectors[info_type] = detector


def get_detector(info_type: str) -> BaseDetector:
    """Get the detector for a given info_type.

    Falls back to the default RecordChangeDetector if no specific
    detector is registered for the info_type.
    """
    return _detectors.get(info_type, _default_detector)
