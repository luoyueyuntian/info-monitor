import type { RouteLocationRaw } from "vue-router";

import type { ThemeDetail } from "../../../../lib/api";
import { buildStockReportReturnQuery } from "../../../../lib/stock-market-report-navigation";

export function buildThemeDetailAnalysisActions(
  detail: ThemeDetail,
  options?: { reportDate?: string | null; reportFocus?: string | null },
) {
  const actions: Array<{ label: string; to: RouteLocationRaw }> = [];
  const hasOpenEvents = detail.events.some((event) => (event.status ?? "open") === "open");
  const hasUnreadEvents = detail.events.some((event) => !event.isRead);
  const hasWarningSource = detail.sources.some((source) => source.status === "warning");
  const stockReportQuery = buildStockReportReturnQuery({
    reportDate: options?.reportDate,
    reportFocus: options?.reportFocus,
  });

  if (hasOpenEvents) {
    actions.push({
      label: "先处理待处理事件",
      to: { path: `/themes/${detail.theme.id}`, query: { section: "events", ...stockReportQuery } },
    });
  } else if (hasUnreadEvents) {
    actions.push({
      label: "先回看未读事件",
      to: { path: `/themes/${detail.theme.id}`, query: { section: "events", ...stockReportQuery } },
    });
  }

  if (detail.analysis.tone === "negative") {
    actions.push({
      label: hasWarningSource ? "先检查来源状态" : "优先回看主题时间线",
      to: { path: `/themes/${detail.theme.id}`, query: { section: hasWarningSource ? "sources" : "timeline", ...stockReportQuery } },
    });
  } else if (detail.analysis.tone === "positive") {
    actions.push({
      label:
        detail.theme.type === "price"
          ? detail.sources.length > 1
            ? "先确认跨来源价差"
            : "确认价格趋势是否成立"
          : "回看近期变化与趋势",
      to: {
        path: `/themes/${detail.theme.id}`,
        query: {
          section: detail.theme.type === "price" ? (detail.sources.length > 1 ? "compare" : "trend") : "timeline",
          ...stockReportQuery,
        },
      },
    });
  }

  if (detail.breakdown) {
    actions.push({
      label: "查看结构分布",
      to: { path: `/themes/${detail.theme.id}`, query: { section: "breakdown", ...stockReportQuery } },
    });
  }

  actions.push({
    label: "查看主题时间线",
    to: { path: `/themes/${detail.theme.id}`, query: { section: "timeline", ...stockReportQuery } },
  });

  if (detail.theme.type === "price") {
    actions.push({
      label: detail.sources.length > 1 ? "查看跨来源快照" : "查看价格趋势",
      to: { path: `/themes/${detail.theme.id}`, query: { section: detail.sources.length > 1 ? "compare" : "trend", ...stockReportQuery } },
    });
  }

  return actions
    .filter((action, index, list) => list.findIndex((item) => item.label === action.label) === index)
    .slice(0, 4);
}
