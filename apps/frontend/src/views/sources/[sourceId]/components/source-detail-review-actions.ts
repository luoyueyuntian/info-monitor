import type { RouteLocationRaw } from "vue-router";

import type { SourceDetail } from "../../../../lib/api";
import { themeImpactTone } from "../../../../lib/impact";
import { buildStockReportReturnQuery } from "../../../../lib/stock-market-report-navigation";

export function buildSourceDetailReviewActions(
  detail: SourceDetail,
  options?: { reportDate?: string | null; reportFocus?: string | null },
) {
  const actions: Array<{ label: string; to: RouteLocationRaw }> = [];
  const impactTone = themeImpactTone({
    type: detail.source.themeType ?? "",
    latestEventSignal: detail.source.latestEventSignal ?? null,
  });
  const stockReportQuery = buildStockReportReturnQuery({
    reportDate: options?.reportDate,
    reportFocus: options?.reportFocus,
  });

  if (detail.events.length > 0) {
    actions.push({
      label: "查看所属主题事件队列",
      to: { path: `/themes/${detail.source.themeId}`, query: { section: "events", ...stockReportQuery } },
    });
  }

  if (impactTone === "negative") {
    actions.push({
      label: "优先回看所属主题分析",
      to: { path: `/themes/${detail.source.themeId}`, query: { section: "analysis", ...stockReportQuery } },
    });
  }

  actions.push({
    label: "查看所属主题时间线",
    to: { path: `/themes/${detail.source.themeId}`, query: { section: "timeline", ...stockReportQuery } },
  });

  if (detail.source.themeType === "price") {
    actions.push({
      label: "查看所属主题趋势",
      to: { path: `/themes/${detail.source.themeId}`, query: { section: "trend", ...stockReportQuery } },
    });
  }

  actions.push({
    label: "查看所属主题",
    to: { path: `/themes/${detail.source.themeId}`, query: { section: "analysis", ...stockReportQuery } },
  });

  return actions
    .filter((action, index, list) => list.findIndex((item) => item.label === action.label) === index)
    .slice(0, 4);
}
