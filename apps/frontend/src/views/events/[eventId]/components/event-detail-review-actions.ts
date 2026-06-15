import type { RouteLocationRaw } from "vue-router";

import type { EventDetail } from "../../../../lib/api";
import { eventImpactTone } from "../../../../lib/impact";
import { buildStockReportReturnQuery } from "../../../../lib/stock-market-report-navigation";

export function buildEventDetailReviewActions(
  detail: EventDetail,
  options?: { reportDate?: string | null; reportFocus?: string | null },
) {
  const actions: Array<{ label: string; to: RouteLocationRaw }> = [];
  const stockReportQuery = buildStockReportReturnQuery({
    reportDate: options?.reportDate,
    reportFocus: options?.reportFocus,
  });

  if ((detail.status ?? "open") === "open") {
    actions.push({
      label: "处理所属主题事件队列",
      to: { path: `/themes/${detail.themeId}`, query: { section: "events", ...stockReportQuery } },
    });
  }

  if (eventImpactTone(detail) === "negative") {
    actions.push({
      label: "优先回看主题分析",
      to: { path: `/themes/${detail.themeId}`, query: { section: "analysis", ...stockReportQuery } },
    });
    actions.push({
      label: "查看主题时间线",
      to: { path: `/themes/${detail.themeId}`, query: { section: "timeline", ...stockReportQuery } },
    });
  } else if (eventImpactTone(detail) === "positive") {
    actions.push({
      label: detail.infoType === "price" ? "确认价格趋势是否成立" : "回看主题近期变化",
      to: {
        path: `/themes/${detail.themeId}`,
        query: { section: detail.infoType === "price" ? "trend" : "timeline", ...stockReportQuery },
      },
    });
  } else if (detail.infoType === "content_update") {
    actions.push({
      label: "查看主题时间线",
      to: { path: `/themes/${detail.themeId}`, query: { section: "timeline", ...stockReportQuery } },
    });
  }

  if (detail.infoType === "price") {
    actions.push({
      label: "查看所属主题趋势",
      to: { path: `/themes/${detail.themeId}`, query: { section: "trend", ...stockReportQuery } },
    });
  }

  actions.push({
    label: "查看所属主题",
    to: { path: `/themes/${detail.themeId}`, query: { section: "analysis", ...stockReportQuery } },
  });

  return actions
    .filter((action, index, list) => list.findIndex((item) => item.label === action.label) === index)
    .slice(0, 4);
}
