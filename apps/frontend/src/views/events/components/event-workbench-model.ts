import type { EventSummary } from "../../../lib/api";
import type { RouteLocationRaw } from "vue-router";
import { eventImpactTone } from "../../../lib/impact";
import { toTimestamp } from "../../../lib/time";
import {
  buildEventFilterSummary,
  buildEventThemeOptions,
  filterWorkbenchEvents,
  type EventWorkbenchFilters,
} from "./event-workbench-filtering";

function buildThemeBucketSummary(events: EventSummary[], counts: {
  openCount: number;
  trackingCount: number;
  bookmarkedCount: number;
  unreadCount: number;
  ignoredCount: number;
}) {
  const latest = [...events].sort((left, right) => toTimestamp(right.occurredAt) - toTimestamp(left.occurredAt))[0];
  const inferredInfoType =
    latest?.infoType ??
    (latest?.signal === "30d_low"
      ? "price"
      : latest?.signal === "liquidity_injection" ||
          latest?.signal === "liquidity_withdrawal" ||
          latest?.signal === "new_financial_event" ||
          latest?.signal === "bullish" ||
          latest?.signal === "bearish"
        ? "financial_event"
        : latest?.signal === "content_update"
          ? "content_update"
          : latest
            ? "news_announcement"
            : null);

  if (counts.openCount > 0 && inferredInfoType === "price" && latest?.signal === "30d_low") {
    return `当前有 ${counts.openCount} 条待处理价格事件，且最近已经出现新低信号，适合优先确认最低价是否真实成立。`;
  }

  if (counts.openCount > 0 && inferredInfoType === "financial_event") {
    if (latest.signal === "liquidity_injection") {
      return `当前有 ${counts.openCount} 条待处理金融事件，最近方向偏向流动性投放，适合优先确认宽松判断是否在强化。`;
    }

    if (latest.signal === "liquidity_withdrawal") {
      return `当前有 ${counts.openCount} 条待处理金融事件，最近方向偏向流动性回笼，适合优先确认收紧判断是否在强化。`;
    }
  }

  if (counts.openCount > 0) {
    return `当前有 ${counts.openCount} 条待处理事件，适合优先进入主题分析确认。`;
  }

  if (counts.trackingCount > 0 && latest?.infoType === "financial_event") {
    return `当前有 ${counts.trackingCount} 条关注中金融事件，适合回看最近几轮方向是否继续一致。`;
  }

  if (counts.trackingCount > 0) {
    return `当前有 ${counts.trackingCount} 条关注中事件，适合回看是否需要继续升级。`;
  }

  if (counts.bookmarkedCount > 0) {
    return `当前有 ${counts.bookmarkedCount} 条收藏事件，适合作为长期回看对象。`;
  }

  if (counts.unreadCount > 0) {
    return `当前有 ${counts.unreadCount} 条未读事件，适合先完成快速巡检。`;
  }

  if (counts.ignoredCount > 0) {
    return "当前事件多数已忽略，可作为历史处理结果回看。";
  }

  return "当前更适合作为主题级事件清理的优先对象。";
}

export type EventDiagnostics = {
  tone: string;
  toneLabel: string;
  headline: string;
  summary: string;
  priorityItems: string[];
  actions: Array<{
    label: string;
    to: RouteLocationRaw;
  }>;
};

export type EventWorkspaceActions = {
  summary: string;
  actions: Array<{
    label: string;
    to: RouteLocationRaw;
  }>;
};

export function buildEventDiagnostics(
  visible: EventSummary[],
  eventStatusLabel: (status?: string | null) => string,
) {
  const openCount = visible.filter((event) => (event.status ?? "open") === "open").length;
  const trackingCount = visible.filter((event) => event.status === "tracking").length;
  const ignoredCount = visible.filter((event) => event.status === "ignored").length;
  const unreadCount = visible.filter((event) => !event.isRead).length;
  const bookmarkedCount = visible.filter((event) => Boolean(event.isBookmarked)).length;
  const positiveCount = visible.filter((event) => eventImpactTone(event) === "positive").length;
  const negativeCount = visible.filter((event) => eventImpactTone(event) === "negative").length;
  const neutralCount = visible.length - positiveCount - negativeCount;
  const impactSummary = `影响判断上共有 ${positiveCount} 条偏利好、${negativeCount} 条偏利空、${neutralCount} 条中性事件。`;
  const priorityItems = visible
    .filter((event) => (event.status ?? "open") === "open" || event.status === "tracking")
    .slice(0, 3)
    .map((event) => `${event.title}：${event.themeName}，当前状态为 ${eventStatusLabel(event.status)}。`);

  if (openCount > 0) {
    return {
      tone: "warning",
      toneLabel: "优先清理待处理",
      headline: "当前仍有待处理事件积压，适合先集中清理这一批事件。",
      summary: `当前筛选结果里有 ${openCount} 条待处理事件、${trackingCount} 条关注中事件、${unreadCount} 条未读事件、${bookmarkedCount} 条收藏事件。${impactSummary}`,
      priorityItems: priorityItems.length ? priorityItems : ["当前有待处理事件，建议优先逐条确认。"],
      actions: [
        {
          label: "处理待处理事件",
          to: { path: "/events", query: { status: "open", sort: "statusChanged" } },
        },
        {
          label: "查看偏利空事件",
          to: { path: "/events", query: { status: "open", impact: "negative", sort: "statusChanged" } },
        },
        {
          label: "查看主题中心",
          to: { path: "/themes", query: { queue: "open", sort: "attention" } },
        },
      ],
    } satisfies EventDiagnostics;
  }

  if (trackingCount > 0) {
    return {
      tone: "pending",
      toneLabel: "持续跟进中",
      headline: "当前主要是关注中的事件，适合回看哪些需要继续升级处理。",
      summary: `当前筛选结果里有 ${trackingCount} 条关注中事件、${unreadCount} 条未读事件、${bookmarkedCount} 条收藏事件。${impactSummary}`,
      priorityItems: priorityItems.length ? priorityItems : ["当前主要以关注中的事件为主。"],
      actions: [
        {
          label: "回看关注中事件",
          to: { path: "/events", query: { status: "tracking", sort: "statusChanged" } },
        },
        {
          label: "查看偏利空事件",
          to: { path: "/events", query: { status: "tracking", impact: "negative", sort: "statusChanged" } },
        },
        {
          label: "查看主题中心",
          to: { path: "/themes", query: { queue: "tracking", sort: "attention" } },
        },
      ],
    } satisfies EventDiagnostics;
  }

  if (bookmarkedCount > 0 || unreadCount > 0) {
    return {
      tone: "pending",
      toneLabel: "适合回看",
      headline: "当前更适合回看未读或已收藏事件，把高价值线索沉淀成长期观察素材。",
      summary: `当前筛选结果里有 ${unreadCount} 条未读事件、${bookmarkedCount} 条收藏事件。${impactSummary}`,
      priorityItems:
        priorityItems.length
          ? priorityItems
          : bookmarkedCount > 0
            ? ["当前收藏事件适合作为重点回看与持续跟踪对象。"]
            : ["当前未读事件适合先完成一轮快速巡检。"],
      actions: [
        unreadCount > 0
          ? {
              label: "回看未读事件",
              to: { path: "/events", query: { read: "unread", sort: "occurredAt" } },
            }
          : {
              label: "回看收藏事件",
              to: { path: "/events", query: { bookmark: "bookmarked", sort: "bookmarkedAt" } },
            },
        {
          label: "查看长期观察清单",
          to: { path: "/watchlist" },
        },
        {
          label: "查看主题中心",
          to: { path: "/themes", query: { queue: bookmarkedCount > 0 ? "bookmarked" : "unread", sort: "attention" } },
        },
      ],
    } satisfies EventDiagnostics;
  }

  return {
    tone: "healthy",
    toneLabel: "队列清爽",
    headline: "当前没有明显的事件处理积压，工作台整体较清爽。",
    summary:
      ignoredCount > 0
        ? `当前更多是已忽略事件，共 ${ignoredCount} 条。${impactSummary}`
        : `当前筛选结果里没有需要优先处理的事件。${impactSummary}`,
    priorityItems: ["当前更适合返回首页或主题页继续做新的观察和判断。"],
    actions: [
      {
        label: "查看最近24小时事件",
        to: { path: "/events", query: { recent: "24h", sort: "occurredAt" } },
      },
      {
        label: "查看主题中心",
        to: { path: "/themes", query: { sort: "attention" } },
      },
      {
        label: "返回首页",
        to: { path: "/" },
      },
    ],
  } satisfies EventDiagnostics;
}

export function buildEventThemeBuckets(visible: EventSummary[]) {
  const grouped = new Map<
    string,
    {
      themeId: string;
      themeName: string;
      events: EventSummary[];
      openCount: number;
      trackingCount: number;
      ignoredCount: number;
      unreadCount: number;
      bookmarkedCount: number;
    }
  >();

  for (const event of visible) {
    const current = grouped.get(event.themeId) ?? {
      themeId: event.themeId,
      themeName: event.themeName,
      events: [],
      openCount: 0,
      trackingCount: 0,
      ignoredCount: 0,
      unreadCount: 0,
      bookmarkedCount: 0,
    };

    if ((event.status ?? "open") === "open") {
      current.openCount += 1;
    } else if (event.status === "tracking") {
      current.trackingCount += 1;
    } else if (event.status === "ignored") {
      current.ignoredCount += 1;
    }

    if (!event.isRead) {
      current.unreadCount += 1;
    }

    if (event.isBookmarked) {
      current.bookmarkedCount += 1;
    }

    current.events.push(event);

    grouped.set(event.themeId, current);
  }

  return [...grouped.values()]
    .map((item) => {
      return {
        ...item,
        primaryStatus: item.openCount > 0 ? "open" : item.trackingCount > 0 ? "tracking" : "all",
        summary: buildThemeBucketSummary(item.events, item),
      };
    })
    .sort((left, right) => {
      if (right.openCount !== left.openCount) {
        return right.openCount - left.openCount;
      }

      return right.trackingCount - left.trackingCount;
    })
    .slice(0, 6);
}

export function buildEventWorkspaceActions(
  visible: EventSummary[],
  filters: EventWorkbenchFilters,
) {
  if (!visible.length) {
    return null;
  }

  const topEvent = [...visible].sort((left, right) => toTimestamp(right.latestStatusChangedAt) - toTimestamp(left.latestStatusChangedAt))[0];
  const impact = filters.impactFilter !== "all" ? filters.impactFilter : eventImpactTone(topEvent) !== "neutral" ? eventImpactTone(topEvent) : undefined;

  return {
    summary: `当前筛选结果里共有 ${visible.length} 条事件，优先处理对象是「${topEvent.title}」。`,
    actions: [
      {
        label: `查看 ${topEvent.themeName} 主题`,
        to: { path: `/themes/${topEvent.themeId}`, query: { section: (topEvent.status ?? "open") === "open" ? "events" : "analysis" } },
      },
      {
        label: `查看 ${topEvent.themeName} 来源状态`,
        to: { path: "/sources/status", query: { themeId: topEvent.themeId } },
      },
      {
        label: "只看同主题事件",
        to: {
          path: "/events",
          query: {
            themeId: topEvent.themeId,
            impact,
            status: filters.statusFilter !== "all" ? filters.statusFilter : (topEvent.status ?? "open") === "open" ? "open" : undefined,
            sort: (topEvent.status ?? "open") === "open" ? "statusChanged" : "occurredAt",
          },
        },
      },
    ],
  } satisfies EventWorkspaceActions;
}

export { buildEventFilterSummary, buildEventThemeOptions, filterWorkbenchEvents, type EventWorkbenchFilters };
