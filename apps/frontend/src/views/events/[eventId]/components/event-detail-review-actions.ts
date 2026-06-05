import type { RouteLocationRaw } from "vue-router";

import type { EventDetail } from "../../../../lib/api";
import { eventImpactTone } from "../../../../lib/impact";

export function buildEventDetailReviewActions(detail: EventDetail) {
  const actions: Array<{ label: string; to: RouteLocationRaw }> = [];

  if ((detail.status ?? "open") === "open") {
    actions.push({
      label: "处理所属主题事件队列",
      to: { path: `/themes/${detail.themeId}`, query: { section: "events" } },
    });
  }

  if (eventImpactTone(detail) === "negative") {
    actions.push({
      label: "优先回看主题分析",
      to: { path: `/themes/${detail.themeId}`, query: { section: "analysis" } },
    });
    actions.push({
      label: "查看主题时间线",
      to: { path: `/themes/${detail.themeId}`, query: { section: "timeline" } },
    });
  } else if (eventImpactTone(detail) === "positive") {
    actions.push({
      label: detail.infoType === "price" ? "确认价格趋势是否成立" : "回看主题近期变化",
      to: {
        path: `/themes/${detail.themeId}`,
        query: { section: detail.infoType === "price" ? "trend" : "timeline" },
      },
    });
  } else if (detail.infoType === "content_update") {
    actions.push({
      label: "查看主题时间线",
      to: { path: `/themes/${detail.themeId}`, query: { section: "timeline" } },
    });
  }

  if (detail.infoType === "price") {
    actions.push({
      label: "查看所属主题趋势",
      to: { path: `/themes/${detail.themeId}`, query: { section: "trend" } },
    });
  }

  actions.push({
    label: "查看所属主题",
    to: { path: `/themes/${detail.themeId}`, query: { section: "analysis" } },
  });

  return actions
    .filter((action, index, list) => list.findIndex((item) => item.label === action.label) === index)
    .slice(0, 4);
}
