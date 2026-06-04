from dataclasses import dataclass, field
from typing import Any, Dict, Optional


@dataclass
class ThemeContext:
    theme_id: str
    theme_name: str
    info_type: str


@dataclass
class SourceContext:
    source_id: str
    source_name: str
    source_type: str
    adapter_key: str
    config: Dict[str, Any] = field(default_factory=dict)


@dataclass
class RawFetchResult:
    payload: Any
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class NormalizedRecord:
    record_type: str
    title: str
    occurred_at: str
    content: Dict[str, Any]
    source_url: Optional[str] = None
    logical_key: Optional[str] = None
