import type { RouteLocationRaw } from "vue-router";

import type { SourceDetail } from "../../../../lib/api";
import { themeImpactTone } from "../../../../lib/impact";

export function buildSourceDetailReviewActions(detail: SourceDetail) {
  const actions: Array<{ label: string; to: RouteLocationRaw }> = [];
  const impactTone = themeImpactTone({
    type: detail.source.themeType ?? "",
    latestEventSignal: detail.source.latestEventSignal ?? null,
  });

  if (detail.events.length > 0) {
    actions.push({
      label: "查看所属主题事件队列",
      to: { path: `/themes/${detail.source.themeId}`, query: { section: "events" } },
    });
  }

  if (impactTone === "negative") {
    actions.push({
      label: "优先回看所属主题分析",
      to: { path: `/themes/${detail.source.themeId}`, query: { section: "analysis" } },
    });
  }

  actions.push({
    label: "查看所属主题时间线",
    to: { path: `/themes/${detail.source.themeId}`, query: { section: "timeline" } },
  });

  if (detail.source.themeType === "price") {
    actions.push({
      label: "查看所属主题趋势",
      to: { path: `/themes/${detail.source.themeId}`, query: { section: "trend" } },
    });
  }

  actions.push({
    label: "查看所属主题",
    to: { path: `/themes/${detail.source.themeId}`, query: { section: "analysis" } },
  });

  return actions
    .filter((action, index, list) => list.findIndex((item) => item.label === action.label) === index)
    .slice(0, 4);
}
