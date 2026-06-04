from __future__ import annotations

import uuid


def create_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4()}"
