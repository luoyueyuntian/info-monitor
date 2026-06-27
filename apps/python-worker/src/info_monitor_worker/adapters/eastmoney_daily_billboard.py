from __future__ import annotations

from datetime import datetime, time, timedelta, timezone
from typing import Any, Dict, List

from info_monitor_worker.adapters.base import BaseAdapter
from info_monitor_worker.http_client import get_http_client
from info_monitor_worker.models import RawFetchResult, SourceContext, ThemeContext

DATA_URL = "https://datacenter-web.eastmoney.com/api/data/v1/get"


def _to_iso(date_text: str) -> str:
    if " " in date_text:
        date_text = date_text.split(" ", 1)[0]
    return f"{date_text}T15:00:00+08:00"


def _to_billion(raw_value: Any) -> float | None:
    try:
        return round(float(raw_value) / 100000000, 2)
    except (TypeError, ValueError):
        return None


def _to_direction(net_amount_billion: float | None) -> tuple[str, str]:
    if net_amount_billion is None:
        return "neutral", "龙虎榜净额暂无，先作为中性线索观察。"

    if net_amount_billion > 0:
        return "bullish", "龙虎榜净买额为正，说明上榜席位整体偏净流入。"

    if net_amount_billion < 0:
        return "bearish", "龙虎榜净买额为负，说明上榜席位整体偏净流出。"

    return "neutral", "龙虎榜净额接近零，说明席位分歧较大。"


def build_billboard_query_params(today: datetime, page_size: int, days: int) -> Dict[str, str]:
    start_date = (today - timedelta(days=max(days - 1, 0))).strftime("%Y-%m-%d")
    end_date = today.strftime("%Y-%m-%d")

    return {
        "reportName": "RPT_DAILYBILLBOARD_PROFILE",
        "columns": "ALL",
        "filter": f"(TRADE_DATE>='{start_date}')(TRADE_DATE<='{end_date}')",
        "pageNumber": "1",
        "pageSize": str(page_size),
        "sortTypes": "-1,-1",
        "sortColumns": "TRADE_DATE,BILLBOARD_NET_AMT",
        "source": "WEB",
        "client": "WEB",
    }


def _parse_run_after_time(value: str | None) -> time | None:
    if not value:
        return None

    try:
        return time.fromisoformat(value.strip())
    except ValueError:
        return None


def _should_allow_empty_result(fetched_at: datetime, run_after_time_local: str | None) -> bool:
    run_after_time = _parse_run_after_time(run_after_time_local)
    if run_after_time is None:
        return False

    return fetched_at.astimezone(timezone(timedelta(hours=8))).time() < run_after_time


class EastmoneyDailyBillboardAdapter(BaseAdapter):
    def fetch(self, theme: ThemeContext, source: SourceContext) -> RawFetchResult:
        page_size = int(source.config.get("page_size", 20))
        days = int(source.config.get("days", 1))

        today = datetime.now(timezone(timedelta(hours=8)))
        run_after_time_local = (
            str(source.config.get("run_after_time_local"))
            if source.config.get("run_after_time_local")
            else None
        )
        params = build_billboard_query_params(today=today, page_size=page_size, days=days)

        response = get_http_client().get(DATA_URL, params=params)
        payload = response.json()

        if payload.get("success") is False:
            message = str(payload.get("message") or "unknown upstream error")
            if message == "返回数据为空" and _should_allow_empty_result(today, run_after_time_local):
                return RawFetchResult(
                    payload={"result": {"data": []}},
                    metadata={
                        "params": params,
                        "allow_empty_result": True,
                    },
                )
            raise ValueError(f"eastmoney_daily_billboard upstream error: {message}")

        return RawFetchResult(payload=payload, metadata={"params": params, "allow_empty_result": False})

    def map_to_normalizer_input(self, raw_result: RawFetchResult) -> Any:
        payload = raw_result.payload
        rows = ((payload.get("result") or {}).get("data") or [])
        allow_empty_result = bool(raw_result.metadata.get("allow_empty_result"))

        items: List[Dict[str, Any]] = []

        for row in rows:
            security_code = str(row.get("SECURITY_CODE") or "")
            security_name = str(row.get("SECURITY_NAME_ABBR") or "")
            trade_date = str(row.get("TRADE_DATE") or "")
            change_rate = row.get("CHANGE_RATE")
            onlist_num = row.get("ONLIST_NUM")
            market_suffix = str(row.get("MARKET_SUFFIX") or "")
            net_amount_billion = _to_billion(row.get("BILLBOARD_NET_AMT"))
            direction_label, direction_reason = _to_direction(net_amount_billion)

            if not security_code or not security_name or not trade_date:
                continue

            title = f"龙虎榜异动：{security_name}"
            summary_parts = [
                f"{security_name} 登上龙虎榜",
                f"净额 {net_amount_billion:.2f} 亿" if net_amount_billion is not None else None,
                f"涨跌幅 {float(change_rate):+.2f}%" if change_rate is not None else None,
                f"上榜次数 {onlist_num}" if onlist_num is not None else None,
            ]

            items.append(
                {
                    "title": title,
                    "occurred_at": _to_iso(trade_date),
                    "url": f"https://data.eastmoney.com/stock/lhb/{security_code}.html",
                    "publisher": "东方财富",
                    "category": "financial_event",
                    "event_class": "daily_billboard",
                    "market_region": "a_share" if market_suffix in {"SH", "SZ", "BJ"} else None,
                    "market_label": "A股" if market_suffix in {"SH", "SZ", "BJ"} else None,
                    "operation_type": "龙虎榜",
                    "amount_billion_cny": net_amount_billion,
                    "direction_label": direction_label,
                    "direction_reason": direction_reason,
                    "description": "；".join([part for part in summary_parts if part]),
                    "security_code": security_code,
                    "security_name": security_name,
                    "change_rate_percent": float(change_rate) if change_rate is not None else None,
                    "onlist_num": int(onlist_num) if onlist_num is not None else None,
                    "market_suffix": market_suffix,
                    "signal_title": f"{security_name} 龙虎榜{ '净流入' if direction_label == 'bullish' else '净流出' if direction_label == 'bearish' else '分歧' }信号",
                    "signal_summary": "；".join([part for part in summary_parts if part]),
                }
            )

        if not items:
            if allow_empty_result:
                return []
            raise ValueError("eastmoney_daily_billboard returned no valid billboard rows")

        return items
