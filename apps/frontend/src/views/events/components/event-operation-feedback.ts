import type { RouteLocationRaw } from "vue-router";

import type { EventSummary } from "../../../lib/api";

export type EventOperationNotice = {
  message: string;
  actions: Array<{
    label: string;
    to: RouteLocationRaw;
  }>;
};

type EventOperationAction =
  | "open"
  | "tracking"
  | "ignored"
  | "read"
  | "unread"
  | "bookmark"
  | "unbookmark";

function themeFollowupSection(event: EventSummary, action: EventOperationAction) {
  if (action === "open") {
    return "events";
  }

  if (event.infoType === "price") {
    return "trend";
  }

  if (event.infoType === "financial_event") {
    return "analysis";
  }

  return "timeline";
}

function themeFollowupLabel(event: EventSummary, action: EventOperationAction) {
  if (action === "open") {
    return `回到 ${event.themeName} 事件区`;
  }

  if (event.infoType === "price") {
    return `查看 ${event.themeName} 趋势`;
  }

  if (event.infoType === "financial_event") {
    return `查看 ${event.themeName} 分析`;
  }

  return `查看 ${event.themeName} 时间线`;
}

function homeFocusFromEvent(event: EventSummary) {
  if (event.infoType === "price") {
    return "events-price";
  }

  if (event.infoType === "financial_event") {
    return "events-financial";
  }

  if (event.infoType === "content_update") {
    return "events-content";
  }

  return "events-official";
}

export function buildSingleEventOperationNotice(
  event: EventSummary,
  action: EventOperationAction,
): EventOperationNotice {
  const themeTarget = {
    path: `/themes/${event.themeId}`,
    query: { section: themeFollowupSection(event, action) },
  } satisfies RouteLocationRaw;

  if (action === "open") {
    return {
      message: "事件已重新标记为待处理，已经回到当前主要处理链。",
      actions: [
        { label: `查看 ${event.themeName} 待处理事件`, to: { path: `/themes/${event.themeId}`, query: { section: "events" } } },
        { label: "返回事件工作台", to: { path: "/events", query: { status: "open", themeId: event.themeId, sort: "statusChanged" } } },
        { label: "返回首页查看变化", to: { path: "/", query: { focus: homeFocusFromEvent(event), status: "open" } } },
      ],
    };
  }

  if (action === "tracking") {
    return {
      message:
        event.infoType === "price"
          ? "事件已转为关注中，下一步更适合回看主题趋势和时间线，确认低价是否持续。"
          : event.infoType === "financial_event"
            ? "事件已转为关注中，下一步更适合回看主题分析和时间线，确认方向是否继续强化。"
            : "事件已转为关注中，下一步更适合回看主题时间线，确认是否还需要继续升级。",
      actions: [
        { label: themeFollowupLabel(event, action), to: themeTarget },
        { label: "查看关注中事件", to: { path: "/events", query: { status: "tracking", themeId: event.themeId, sort: "statusChanged" } } },
        { label: "返回首页查看变化", to: { path: "/", query: { focus: homeFocusFromEvent(event), status: "tracking" } } },
      ],
    };
  }

  if (action === "ignored") {
    return {
      message: "事件已标记为已忽略，会退出当前主要处理链，但仍可在历史里回看。",
      actions: [
        { label: `查看 ${event.themeName} 时间线`, to: { path: `/themes/${event.themeId}`, query: { section: "timeline" } } },
        { label: "查看已忽略事件", to: { path: "/events", query: { status: "ignored", themeId: event.themeId, sort: "occurredAt" } } },
        { label: "返回首页查看变化", to: { path: "/", query: { focus: homeFocusFromEvent(event), status: "ignored" } } },
      ],
    };
  }

  if (action === "read") {
    return {
      message: "事件已标记为已读，已从首轮巡检链里退出。",
      actions: [
        { label: themeFollowupLabel(event, action), to: themeTarget },
        { label: "回看未读事件", to: { path: "/events", query: { read: "unread", themeId: event.themeId, sort: "occurredAt" } } },
        { label: "返回首页查看变化", to: { path: "/", query: { focus: homeFocusFromEvent(event) } } },
      ],
    };
  }

  if (action === "unread") {
    return {
      message: "事件已恢复为未读，方便重新进入当前巡检链。",
      actions: [
        { label: `回到 ${event.themeName} 事件区`, to: { path: `/themes/${event.themeId}`, query: { section: "events" } } },
        { label: "查看未读事件", to: { path: "/events", query: { read: "unread", themeId: event.themeId, sort: "occurredAt" } } },
        { label: "返回首页查看变化", to: { path: "/", query: { focus: homeFocusFromEvent(event) } } },
      ],
    };
  }

  if (action === "bookmark") {
    return {
      message: "事件已加入收藏，适合纳入长期观察和后续回看。",
      actions: [
        { label: "查看观察清单", to: { path: "/watchlist" } },
        { label: "查看收藏事件", to: { path: "/events", query: { bookmark: "bookmarked", themeId: event.themeId, sort: "bookmarkedAt" } } },
        { label: "返回首页查看变化", to: { path: "/", query: { focus: homeFocusFromEvent(event) } } },
      ],
    };
  }

  return {
    message: "事件已取消收藏，如后续信号再次强化，可以重新加入长期观察。",
    actions: [
      { label: themeFollowupLabel(event, action), to: themeTarget },
      { label: "返回事件工作台", to: { path: "/events", query: { themeId: event.themeId, sort: "occurredAt" } } },
      { label: "返回首页查看变化", to: { path: "/", query: { focus: homeFocusFromEvent(event) } } },
    ],
  };
}
