from __future__ import annotations


def canonicalize_info_type(info_type: str) -> str:
    if info_type in {"stock_price", "commodity_price"}:
        return "price"

    return info_type
