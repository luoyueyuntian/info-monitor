import type { RouteLocationRaw } from "vue-router";

import type { ThemeDetail } from "../../../../lib/api";

export function buildThemeDetailAnalysisActions(detail: ThemeDetail) {
  const actions: Array<{ label: string; to: RouteLocationRaw }> = [];
  const hasOpenEvents = detail.events.some((event) => (event.status ?? "open") === "open");
  const hasUnreadEvents = detail.events.some((event) => !event.isRead);
  const hasWarningSource = detail.sources.some((source) => source.status === "warning");

  if (hasOpenEvents) {
    actions.push({
      label: "先处理待处理事件",
      to: { path: `/themes/${detail.theme.id}`, query: { section: "events" } },
    });
  } else if (hasUnreadEvents) {
    actions.push({
      label: "先回看未读事件",
      to: { path: `/themes/${detail.theme.id}`, query: { section: "events" } },
    });
  }

  if (detail.analysis.tone === "negative") {
    actions.push({
      label: hasWarningSource ? "先检查来源状态" : "优先回看主题时间线",
      to: { path: `/themes/${detail.theme.id}`, query: { section: hasWarningSource ? "sources" : "timeline" } },
    });
  } else if (detail.analysis.tone === "positive") {
    actions.push({
      label: detail.theme.type === "price" ? "确认价格趋势是否成立" : "回看近期变化与趋势",
      to: {
        path: `/themes/${detail.theme.id}`,
        query: { section: detail.theme.type === "price" ? "trend" : "timeline" },
      },
    });
  }

  if (detail.breakdown) {
    actions.push({
      label: "查看结构分布",
      to: { path: `/themes/${detail.theme.id}`, query: { section: "breakdown" } },
    });
  }

  actions.push({
    label: "查看主题时间线",
    to: { path: `/themes/${detail.theme.id}`, query: { section: "timeline" } },
  });

  if (detail.theme.type === "price") {
    actions.push({
      label: "查看价格趋势",
      to: { path: `/themes/${detail.theme.id}`, query: { section: "trend" } },
    });
  }

  return actions
    .filter((action, index, list) => list.findIndex((item) => item.label === action.label) === index)
    .slice(0, 4);
}
