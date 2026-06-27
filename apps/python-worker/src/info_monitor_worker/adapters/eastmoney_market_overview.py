from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from info_monitor_worker.adapters.base import BaseAdapter
from info_monitor_worker.http_client import get_http_client
from info_monitor_worker.models import RawFetchResult, SourceContext, ThemeContext

INDEX_CODES = {
    "a_share": [
        ("1.000001", "上证指数"),
        ("0.399001", "深证成指"),
        ("0.399006", "创业板指"),
    ],
    "hk": [
        ("100.HSI", "恒生指数"),
        ("100.HSCEI", "国企指数"),
    ],
}

INDEX_QUOTE_URL = "https://push2.eastmoney.com/api/qt/ulist.np/get"
FLOW_URL = "https://push2.eastmoney.com/api/qt/kamt/get"
CLIST_URL = "https://push2.eastmoney.com/api/qt/clist/get"
SECTOR_FIELDS = "f12,f14,f3,f62,f204,f205"
MOVER_FIELDS = "f12,f14,f2,f3,f4,f6"


def _now_cst() -> datetime:
    return datetime.now(timezone(timedelta(hours=8)))


def _to_close_iso(date_text: str, market_region: str) -> str:
    close_hour = 15 if market_region == "a_share" else 16
    return f"{date_text}T{close_hour:02d}:00:00+08:00"


def _to_billion(raw_value: Any) -> float | None:
    try:
        value = float(raw_value)
    except (TypeError, ValueError):
        return None
    return round(value / 10000, 2)


def _safe_float(raw_value: Any) -> float | None:
    try:
        return float(raw_value)
    except (TypeError, ValueError):
        return None


def _scale_cents(raw_value: Any) -> float | None:
    value = _safe_float(raw_value)
    if value is None:
        return None
    return round(value / 100, 2)


def _format_signed_percent(value: float | None) -> str | None:
    if value is None:
        return None
    return f"{value:+.2f}%"


def _market_direction(
    average_change_percent: float | None,
    fund_flow_net_billion: float | None,
) -> tuple[str, str, str]:
    score = 0

    if average_change_percent is not None:
        if average_change_percent >= 1.0:
            score += 2
        elif average_change_percent >= 0.3:
            score += 1
        elif average_change_percent <= -1.0:
            score -= 2
        elif average_change_percent <= -0.3:
            score -= 1

    if fund_flow_net_billion is not None:
        if fund_flow_net_billion >= 20:
            score += 1
        elif fund_flow_net_billion <= -20:
            score -= 1

    if score >= 2:
        return (
            "bullish",
            "偏强",
            "指数表现和资金流向同时偏多，市场整体情绪较强。",
        )

    if score <= -2:
        return (
            "bearish",
            "偏弱",
            "指数表现和资金流向同时偏空，市场整体承压。",
        )

    return (
        "neutral",
        "震荡",
        "指数与资金流向没有形成单边共振，市场整体以震荡观察为主。",
    )


def _flow_direction_label(fund_flow_net_billion: float | None) -> str:
    if fund_flow_net_billion is None:
        return "flat"
    if fund_flow_net_billion > 0:
        return "inflow"
    if fund_flow_net_billion < 0:
        return "outflow"
    return "flat"


def _build_market_item(
    market_region: str,
    market_label: str,
    quote_map: Dict[str, Dict[str, Any]],
    flow_data: Dict[str, Dict[str, Any]],
    date_text: str,
    sector_flows: List[Dict[str, Any]] | None = None,
    top_movers: List[Dict[str, Any]] | None = None,
    top_decliners: List[Dict[str, Any]] | None = None,
) -> Dict[str, Any]:
    index_defs = INDEX_CODES[market_region]
    indices: List[Dict[str, Any]] = []

    for secid, fallback_label in index_defs:
        code = secid.split(".")[-1]
        quote = quote_map.get(code, {})
        indices.append(
            {
                "code": quote.get("f12", code),
                "label": quote.get("f14", fallback_label),
                "latest": _safe_float(quote.get("f2")),
                "change_percent": _safe_float(quote.get("f3")),
            }
        )

    available_changes = [
        item["change_percent"]
        for item in indices
        if isinstance(item.get("change_percent"), float)
    ]
    average_change_percent = (
        round(sum(available_changes) / len(available_changes), 2)
        if available_changes
        else None
    )

    if market_region == "a_share":
        flow_segments = [flow_data.get("hk2sh", {}), flow_data.get("hk2sz", {})]
        fund_flow_currency = "CNY"
        benchmark_name = "A股核心指数均值"
        title = "A股市场收盘概览"
    else:
        flow_segments = [flow_data.get("sh2hk", {}), flow_data.get("sz2hk", {})]
        fund_flow_currency = "HKD"
        benchmark_name = "港股核心指数均值"
        title = "港股市场收盘概览"

    fund_flow_net_billion = round(
        sum(_to_billion(segment.get("netBuyAmt")) or 0 for segment in flow_segments),
        2,
    )
    fund_flow_turnover_billion = round(
        sum(_to_billion(segment.get("buySellAmt")) or 0 for segment in flow_segments),
        2,
    )
    direction_label, direction_text, direction_reason = _market_direction(
        average_change_percent,
        fund_flow_net_billion,
    )
    fund_flow_direction = _flow_direction_label(fund_flow_net_billion)

    headline = f"{market_label}整体{direction_text}"
    flow_label = (
        f"{'净流入' if fund_flow_direction == 'inflow' else '净流出' if fund_flow_direction == 'outflow' else '持平'}"
        f" {fund_flow_net_billion:.2f} 亿{fund_flow_currency}"
    )
    index_summary = "，".join(
        filter(
            None,
            [
                f"{item['label']} {_format_signed_percent(item['change_percent'])}"
                for item in indices
            ],
        )
    )
    summary = (
        f"{market_label}主要指数表现为 {index_summary or '暂无指数样本'}；"
        f"资金面 {flow_label}，成交额约 {fund_flow_turnover_billion:.2f} 亿{fund_flow_currency}。"
    )

    return {
        "title": title,
        "occurred_at": _to_close_iso(date_text, market_region),
        "publisher": "东方财富",
        "category": "financial_event",
        "event_class": "market_overview",
        "market_region": market_region,
        "market_label": market_label,
        "operation_type": "市场概览",
        "benchmark_name": benchmark_name,
        "benchmark_change_percent": average_change_percent,
        "fund_flow_direction": fund_flow_direction,
        "fund_flow_net_billion": fund_flow_net_billion,
        "fund_flow_turnover_billion": fund_flow_turnover_billion,
        "fund_flow_currency": fund_flow_currency,
        "major_indices": indices,
        "sector_flows": sector_flows or [],
        "top_movers": top_movers or [],
        "top_decliners": top_decliners or [],
        "summary_points": [
            index_summary or "暂无指数样本",
            flow_label,
            direction_reason,
        ],
        "direction_label": direction_label,
        "direction_reason": direction_reason,
        "signal_title": f"{market_label}市场{direction_text}信号",
        "signal_summary": summary,
        "description": summary,
    }


class EastmoneyMarketOverviewAdapter(BaseAdapter):
    def fetch(self, theme: ThemeContext, source: SourceContext) -> RawFetchResult:
        include_a_share = bool(source.config.get("include_a_share", True))
        include_hk = bool(source.config.get("include_hk", True))

        if not include_a_share and not include_hk:
            raise ValueError(
                "eastmoney_market_overview adapter requires at least one of include_a_share/include_hk to be true"
            )

        secids: List[str] = []
        if include_a_share:
            secids.extend(secid for secid, _ in INDEX_CODES["a_share"])
        if include_hk:
            secids.extend(secid for secid, _ in INDEX_CODES["hk"])

        quote_params = {
            "fltt": "2",
            "invt": "2",
            "fields": "f2,f3,f12,f14",
            "secids": ",".join(secids),
        }
        flow_params = {
            "fields1": "f1,f2,f3,f4",
            "fields2": "f51,f52,f53,f54,f56,f60,f61,f62,f63,f65,f66",
            "ut": "fa5fd1943c7b386f172d6893dbfba10b",
        }
        sector_params = {
            "pn": "1",
            "pz": str(source.config.get("sector_count", 5)),
            "po": "1",
            "fid": "f62",
            "fs": "m:90+t:2",
            "fields": SECTOR_FIELDS,
            "ut": "8dec03ba335b81bf4ebdf7b29ec27d15",
        }
        a_movers_count = str(source.config.get("mover_count", 5))
        a_share_movers_params = {
            "pn": "1",
            "pz": a_movers_count,
            "po": "1",
            "fid": "f3",
            "fs": "m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23",
            "fields": MOVER_FIELDS,
            "ut": "8dec03ba335b81bf4ebdf7b29ec27d15",
        }
        a_share_decliners_params = {
            **a_share_movers_params,
            "po": "0",
        }
        hk_movers_params = {
            "pn": "1",
            "pz": a_movers_count,
            "po": "1",
            "fid": "f3",
            "fs": "m:128+t:1,m:128+t:2,m:128+t:3,m:128+t:4",
            "fields": MOVER_FIELDS,
            "ut": "8dec03ba335b81bf4ebdf7b29ec27d15",
        }
        hk_decliners_params = {
            **hk_movers_params,
            "po": "0",
        }

        client = get_http_client()
        quote_response = client.get(INDEX_QUOTE_URL, params=quote_params, follow_redirects=True)
        flow_response = client.get(FLOW_URL, params=flow_params, follow_redirects=True)
        sector_response = client.get(CLIST_URL, params=sector_params, follow_redirects=True)
        a_share_movers_response = client.get(CLIST_URL, params=a_share_movers_params, follow_redirects=True)
        a_share_decliners_response = client.get(CLIST_URL, params=a_share_decliners_params, follow_redirects=True)
        hk_movers_response = client.get(CLIST_URL, params=hk_movers_params, follow_redirects=True)
        hk_decliners_response = client.get(CLIST_URL, params=hk_decliners_params, follow_redirects=True)

        return RawFetchResult(
            payload={
                "quotes": quote_response.json(),
                "flows": flow_response.json(),
                "sector_flows": sector_response.json(),
                "a_share_movers": a_share_movers_response.json(),
                "a_share_decliners": a_share_decliners_response.json(),
                "hk_movers": hk_movers_response.json(),
                "hk_decliners": hk_decliners_response.json(),
            },
            metadata={
                "include_a_share": include_a_share,
                "include_hk": include_hk,
            },
        )

    def map_to_normalizer_input(self, raw_result: RawFetchResult) -> Any:
        quotes_payload = raw_result.payload.get("quotes", {})
        flows_payload = raw_result.payload.get("flows", {})
        sector_payload = raw_result.payload.get("sector_flows", {})
        a_share_movers_payload = raw_result.payload.get("a_share_movers", {})
        a_share_decliners_payload = raw_result.payload.get("a_share_decliners", {})
        hk_movers_payload = raw_result.payload.get("hk_movers", {})
        hk_decliners_payload = raw_result.payload.get("hk_decliners", {})
        quote_list = ((quotes_payload.get("data") or {}).get("diff") or [])
        flow_data = (flows_payload.get("data") or {})
        sector_list = list(((sector_payload.get("data") or {}).get("diff") or {}).values())
        a_share_movers_list = list(((a_share_movers_payload.get("data") or {}).get("diff") or {}).values())
        a_share_decliners_list = list(((a_share_decliners_payload.get("data") or {}).get("diff") or {}).values())
        hk_movers_list = list(((hk_movers_payload.get("data") or {}).get("diff") or {}).values())
        hk_decliners_list = list(((hk_decliners_payload.get("data") or {}).get("diff") or {}).values())
        quote_map = {
            str(item.get("f12")): item
            for item in quote_list
            if item.get("f12") is not None
        }

        date_text = (
            flow_data.get("hk2sh", {}).get("date2")
            or flow_data.get("sh2hk", {}).get("date2")
            or _now_cst().strftime("%Y-%m-%d")
        )

        items: List[Dict[str, Any]] = []
        sector_flows = [
            {
                "code": str(item.get("f12") or ""),
                "label": str(item.get("f14") or ""),
                "change_percent": _scale_cents(item.get("f3")),
                "net_inflow_billion": _to_billion(item.get("f62")),
                "leading_stock_name": str(item.get("f204") or "") or None,
                "leading_stock_code": str(item.get("f205") or "") or None,
            }
            for item in sector_list
            if item.get("f12") is not None
        ]

        def build_movers(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
            return [
                {
                    "code": str(item.get("f12") or ""),
                    "label": str(item.get("f14") or ""),
                    "latest": _scale_cents(item.get("f2")),
                    "change_percent": _scale_cents(item.get("f3")),
                    "turnover_billion": _to_billion(item.get("f6")),
                }
                for item in rows
                if item.get("f12") is not None
            ]

        a_share_top_movers = build_movers(a_share_movers_list)
        a_share_top_decliners = build_movers(a_share_decliners_list)
        hk_top_movers = build_movers(hk_movers_list)
        hk_top_decliners = build_movers(hk_decliners_list)

        if raw_result.metadata.get("include_a_share", True):
            items.append(
                _build_market_item(
                    market_region="a_share",
                    market_label="A股",
                    quote_map=quote_map,
                    flow_data=flow_data,
                    date_text=date_text,
                    sector_flows=sector_flows,
                    top_movers=a_share_top_movers,
                    top_decliners=a_share_top_decliners,
                )
            )

        if raw_result.metadata.get("include_hk", True):
            items.append(
                _build_market_item(
                    market_region="hk",
                    market_label="港股",
                    quote_map=quote_map,
                    flow_data=flow_data,
                    date_text=date_text,
                    top_movers=hk_top_movers,
                    top_decliners=hk_top_decliners,
                )
            )

        return items
