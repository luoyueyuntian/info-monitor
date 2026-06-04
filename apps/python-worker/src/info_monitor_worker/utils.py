from __future__ import annotations

import hashlib
import json
import uuid
from typing import Any


def create_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4()}"


def to_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False)


def fingerprint_for_value(value: Any) -> str:
    encoded = json.dumps(value, ensure_ascii=False, sort_keys=True).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()
