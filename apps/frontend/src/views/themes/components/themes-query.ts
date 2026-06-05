import type { ThemesBoardFilters } from "./themes-model";

type QueryRecord = Record<string, unknown>;

export const themeManagedQueryKeys = [
  "q",
  "query",
  "type",
  "typeFilter",
  "queue",
  "eventQueue",
  "health",
  "healthFilter",
  "impact",
  "impactFilter",
  "sort",
  "sortBy",
  "recent",
] as const;

export function buildThemeManagedQuery(filters: ThemesBoardFilters) {
  const nextQuery: Record<string, string> = {};

  if (filters.query.trim()) {
    nextQuery.q = filters.query.trim();
  }

  if (filters.typeFilter !== "all") {
    nextQuery.type = filters.typeFilter;
  }

  if (filters.eventQueueFilter !== "all") {
    nextQuery.queue = filters.eventQueueFilter;
  }

  if (filters.healthFilter !== "all") {
    nextQuery.health = filters.healthFilter;
  }

  if (filters.impactFilter !== "all") {
    nextQuery.impact = filters.impactFilter;
  }

  if (filters.sortBy !== "priority") {
    nextQuery.sort = filters.sortBy;
  }

  if (filters.recentOnly24h) {
    nextQuery.recent = "24h";
  }

  return nextQuery;
}

export function readThemeRouteFilters(query: QueryRecord): ThemesBoardFilters {
  const queryText = query.q ?? query.query;
  const queryType = query.type ?? query.typeFilter;
  const queryQueue = query.queue ?? query.eventQueue;
  const queryHealth = query.health ?? query.healthFilter;
  const queryImpact = query.impact ?? query.impactFilter;
  const querySort = query.sort ?? query.sortBy;
  const queryRecent = query.recent;

  const allowedTypes = ["price", "content_update", "news_announcement", "financial_event", "all"];
  const allowedQueues = ["open", "tracking", "ignored", "unread", "bookmarked", "all"];
  const allowedHealth = ["healthy", "warning", "all"];
  const allowedImpact = ["positive", "negative", "neutral", "all"];
  const allowedSort = ["attention", "priority", "latestEvent", "latestRun", "latestBookmarked", "name"];

  return {
    query: typeof queryText === "string" ? queryText : "",
    typeFilter: typeof queryType === "string" && allowedTypes.includes(queryType) ? queryType : "all",
    eventQueueFilter:
      typeof queryQueue === "string" && allowedQueues.includes(queryQueue) ? queryQueue : "all",
    healthFilter:
      typeof queryHealth === "string" && allowedHealth.includes(queryHealth) ? queryHealth : "all",
    impactFilter:
      typeof queryImpact === "string" && allowedImpact.includes(queryImpact) ? queryImpact : "all",
    sortBy: typeof querySort === "string" && allowedSort.includes(querySort) ? querySort : "priority",
    recentOnly24h: queryRecent === "24h" || queryRecent === "true",
  };
}

export function matchesThemePresetFilters(
  presetId: string,
  presets: ReadonlyArray<{
    id: string;
    filters: {
      query: string;
      type: string;
      queue: string;
      health: string;
      impact?: string;
      sort: string;
      recent: boolean;
    };
  }>,
  filters: ThemesBoardFilters,
) {
  const preset = presets.find((item) => item.id === presetId);

  if (!preset) {
    return false;
  }

  return (
    filters.query === preset.filters.query &&
    filters.typeFilter === preset.filters.type &&
    filters.eventQueueFilter === preset.filters.queue &&
    filters.healthFilter === preset.filters.health &&
    filters.impactFilter === (preset.filters.impact ?? "all") &&
    filters.sortBy === preset.filters.sort &&
    filters.recentOnly24h === preset.filters.recent
  );
}
