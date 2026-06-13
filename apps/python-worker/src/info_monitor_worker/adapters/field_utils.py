"""Shared field resolution utilities for adapters."""

from __future__ import annotations

from typing import Any


def resolve_field(data: Any, field_path: str) -> Any:
    """Resolve a dot-separated field path against a dict/list structure.

    Example: resolve_field({"a": {"b": 1}}, "a.b") -> 1
    """
    parts = field_path.split(".")
    current = data

    for part in parts:
        if current is None:
            return None

        if isinstance(current, dict):
            current = current.get(part)
        elif isinstance(current, list):
            try:
                current = current[int(part)]
            except (ValueError, IndexError):
                return None
        else:
            return None

    return current
