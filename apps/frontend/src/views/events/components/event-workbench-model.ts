import type { EventSummary } from "../../../lib/api";
import type { RouteLocationRaw } from "vue-router";
import { eventImpactTone } from "../../../lib/impact";
import { toTimestamp } from "../../../lib/time";

export type EventWorkbenchFilters = {
  query: string;
  themeFilter: string;
  statusFilter: string;
  typeFilter: string;
  impactFilter: string;
  readFilter: string;
  bookmarkFilter: string;
  sortBy: string;
  recentOnly24h: boolean;
  sinceFilter: string;
};

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

export function buildEventThemeOptions(events: EventSummary[]) {
  const grouped = new Map<string, string>();

  for (const event of events) {
    if (!grouped.has(event.themeId)) {
      grouped.set(event.themeId, event.themeName);
    }
  }

  return [...grouped.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((left, right) => left.name.localeCompare(right.name, "zh-CN"));
}

export function filterWorkbenchEvents(
  events: EventSummary[],
  filters: EventWorkbenchFilters,
) {
  let items = [...events];
  const themeIds =
    filters.themeFilter === "all"
      ? []
      : filters.themeFilter
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);

  if (filters.query) {
    const normalized = filters.query.toLowerCase();
    items = items.filter(
      (event) =>
        event.title.toLowerCase().includes(normalized) ||
        event.themeName.toLowerCase().includes(normalized),
    );
  }

  if (filters.statusFilter !== "all") {
    items = items.filter((event) => (event.status ?? "open") === filters.statusFilter);
  }

  if (themeIds.length) {
    items = items.filter((event) => themeIds.includes(event.themeId));
  }

  if (filters.typeFilter !== "all") {
    items = items.filter((event) => event.infoType === filters.typeFilter);
  }

  if (filters.impactFilter !== "all") {
    items = items.filter((event) => eventImpactTone(event) === filters.impactFilter);
  }

  if (filters.readFilter === "read") {
    items = items.filter((event) => Boolean(event.isRead));
  } else if (filters.readFilter === "unread") {
    items = items.filter((event) => !event.isRead);
  }

  if (filters.bookmarkFilter === "bookmarked") {
    items = items.filter((event) => Boolean(event.isBookmarked));
  }

  if (filters.recentOnly24h) {
    const threshold = Date.now() - 24 * 60 * 60 * 1000;
    items = items.filter((event) => toTimestamp(event.occurredAt) >= threshold);
  }

  if (filters.sinceFilter) {
    const sinceTimestamp = toTimestamp(filters.sinceFilter);
    items = items.filter((event) => {
      const latestRelevantAt = Math.max(toTimestamp(event.latestStatusChangedAt), toTimestamp(event.occurredAt));
      return latestRelevantAt >= sinceTimestamp;
    });
  }

  items.sort((left, right) => {
    if (filters.sortBy === "bookmarkedAt") {
      return toTimestamp(right.bookmarkedAt) - toTimestamp(left.bookmarkedAt);
    }

    if (filters.sortBy === "statusChanged") {
      return toTimestamp(right.latestStatusChangedAt) - toTimestamp(left.latestStatusChangedAt);
    }

    return toTimestamp(right.occurredAt) - toTimestamp(left.occurredAt);
  });

  return items;
}

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

    grouped.set(event.themeId, current);
  }

  return [...grouped.values()]
    .map((item) => {
      let summary = "当前更适合作为主题级事件清理的优先对象。";

      if (item.openCount > 0) {
        summary = `当前有 ${item.openCount} 条待处理事件，适合优先进入主题分析确认。`;
      } else if (item.trackingCount > 0) {
        summary = `当前有 ${item.trackingCount} 条关注中事件，适合回看是否需要继续升级。`;
      } else if (item.bookmarkedCount > 0) {
        summary = `当前有 ${item.bookmarkedCount} 条收藏事件，适合作为长期回看对象。`;
      } else if (item.unreadCount > 0) {
        summary = `当前有 ${item.unreadCount} 条未读事件，适合先完成快速巡检。`;
      } else if (item.ignoredCount > 0) {
        summary = "当前事件多数已忽略，可作为历史处理结果回看。";
      }

      return {
        ...item,
        primaryStatus: item.openCount > 0 ? "open" : item.trackingCount > 0 ? "tracking" : "all",
        summary,
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

export function buildEventFilterSummary(
  filters: EventWorkbenchFilters,
  themeOptions: Array<{ id: string; name: string }>,
  eventStatusLabel: (status?: string | null) => string,
  themeTypeLabel: (type: string) => string,
  formatSmartDateTimeLabel: (value?: string | null) => string,
) {
  const themeIds =
    filters.themeFilter === "all"
      ? []
      : filters.themeFilter
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
  const themeLabel =
    themeIds.length === 0
      ? ""
      : themeIds.length === 1
        ? themeOptions.find((item) => item.id === themeIds[0])?.name ?? themeIds[0]
        : `${themeIds.length} 个主题`;
  const parts = [
    filters.query ? `搜索“${filters.query}”` : "",
    themeLabel ? `主题 ${themeLabel}` : "",
    filters.statusFilter !== "all" ? `状态 ${eventStatusLabel(filters.statusFilter)}` : "",
    filters.typeFilter !== "all" ? `类型 ${themeTypeLabel(filters.typeFilter)}` : "",
    filters.impactFilter === "positive" ? "影响 偏利好" : "",
    filters.impactFilter === "negative" ? "影响 偏利空" : "",
    filters.impactFilter === "neutral" ? "影响 中性" : "",
    filters.readFilter === "read" ? "只看已读" : "",
    filters.readFilter === "unread" ? "只看未读" : "",
    filters.bookmarkFilter === "bookmarked" ? "只看收藏" : "",
    filters.sortBy === "bookmarkedAt" ? "按最近收藏排序" : "",
    filters.sortBy === "statusChanged" ? "按最近状态变化排序" : "",
    filters.recentOnly24h ? "最近24小时" : "",
    filters.sinceFilter ? `仅看 ${formatSmartDateTimeLabel(filters.sinceFilter)} 之后变化` : "",
  ].filter(Boolean);

  return parts.length ? parts.join(" · ") : "全部事件";
}
