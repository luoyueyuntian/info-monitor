"""Shared time normalization utilities for adapters.

All timestamps are normalized to ISO 8601 with Asia/Shanghai (+08:00) timezone.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone, timedelta
from typing import Optional

from dateutil import parser as dateutil_parser

# Timezone for default timestamps
TZ_CST = timezone(timedelta(hours=8))

# Regex to detect timezone suffix in ISO 8601 strings
# Matches: Z, z, +HH:MM, -HH:MM, +HH, -HH
_TZ_SUFFIX_RE = re.compile(r"[Zz]|[+-]\d{2}(?::?\d{2})?$")


def has_tz_suffix(value: str) -> bool:
    """Check if an ISO 8601 string already has timezone info."""
    return bool(_TZ_SUFFIX_RE.search(value))


def now_cst() -> str:
    """Return current time in Asia/Shanghai as ISO 8601 string."""
    return datetime.now(TZ_CST).isoformat(timespec="seconds")


def ensure_iso_with_tz(value: str, fallback: Optional[str] = None) -> str:
    """Ensure the string is an ISO 8601 timestamp with timezone info.

    If the string already contains 'T' and timezone info, return as-is.
    If it looks like an ISO date-only (YYYY-MM-DD), append T00:00:00+08:00.
    Otherwise, try dateutil parsing and convert to ISO.
    If parsing fails, return the fallback (defaults to current CST time).
    """
    stripped = value.strip()
    if not stripped:
        return fallback if fallback is not None else now_cst()

    # Has T and already has timezone suffix — return as-is
    if "T" in stripped and has_tz_suffix(stripped):
        return stripped

    # ISO date-only: YYYY-MM-DD
    if "T" not in stripped and len(stripped) == 10 and stripped.count("-") == 2:
        return f"{stripped}T00:00:00+08:00"

    # Has T but no timezone — append CST
    if "T" in stripped:
        return f"{stripped}+08:00"

    # Human-readable date — try dateutil parse
    try:
        parsed = dateutil_parser.parse(stripped)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=TZ_CST)
        return parsed.isoformat()
    except (ValueError, OverflowError):
        # Can't parse — return fallback (current time if not provided)
        return fallback if fallback is not None else now_cst()


def normalize_pub_date(pub_date: str) -> str:
    """Normalize a PubDate string to ISO 8601 with timezone.

    Handles: YYYY/MM/DD, YYYY-MM-DD, already-ISO, and human-readable formats.
    Avoids double-appending timezone if already present.
    Falls back to current CST time for empty or unparseable input.
    """
    stripped = pub_date.strip()
    if not stripped:
        return now_cst()

    # Already has timezone — return as-is
    if "T" in stripped and has_tz_suffix(stripped):
        return stripped

    # Simple slash-separated date: YYYY/MM/DD or YYYY/MM/DD HH:MM:SS
    normalized = stripped.replace("/", "-").replace(" ", "T")

    # Date-only: YYYY-MM-DD
    if len(normalized) == 10 and normalized.count("-") == 2:
        return f"{normalized}T00:00:00+08:00"

    # Has T but no timezone
    if "T" in normalized:
        return f"{normalized}+08:00"

    # Other formats — try dateutil
    try:
        parsed = dateutil_parser.parse(stripped)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=TZ_CST)
        return parsed.isoformat()
    except (ValueError, OverflowError):
        # Can't parse — return current time as safe fallback
        return now_cst()
