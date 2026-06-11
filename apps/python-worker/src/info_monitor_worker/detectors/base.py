"""Base detector for change detection on normalized records."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from info_monitor_worker.models import NormalizedRecord


@dataclass
class ChangeResult:
    """Result of detecting whether a normalized record represents a change."""

    is_new: bool
    """True if this record did not exist before."""

    is_updated: bool
    """True if this record existed but with different content."""

    is_unchanged: bool
    """True if this record already exists with identical content."""

    change_type: str
    """The change type string for the changes table."""

    change_summary: str
    """Human-readable summary of the change."""

    existing_record: Optional[Dict[str, Any]] = None
    """The existing database record if found, None if new."""

    record_id: Optional[str] = None
    """The record ID to use (existing or newly generated)."""

    details: Dict[str, Any] = field(default_factory=dict)
    """Additional details to include in the change record."""


class BaseDetector(ABC):
    """Abstract base for change detectors.

    Each detector handles one info_type and determines whether a normalized
    record is new, updated, or unchanged compared to existing records.
    """

    info_type: str = ""

    @abstractmethod
    def detect_change(
        self,
        normalized_record: NormalizedRecord,
        existing_record: Optional[Dict[str, Any]],
        *,
        fingerprint: str,
    ) -> ChangeResult:
        """Detect whether the normalized record represents a change.

        Args:
            normalized_record: The newly normalized record from the worker.
            existing_record: The existing DB record (by logical_key or fingerprint), or None.
            fingerprint: The computed fingerprint for the normalized record.

        Returns:
            A ChangeResult indicating the type of change.
        """
        raise NotImplementedError
