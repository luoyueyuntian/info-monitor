import type { EventSummary } from "../../../lib/api";
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
