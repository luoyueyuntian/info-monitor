import type { EventWorkbenchFilters } from "./event-workbench-model";

type QueryRecord = Record<string, unknown>;

export const eventWorkbenchManagedQueryKeys = [
  "q",
  "query",
  "themeId",
  "theme",
  "status",
  "type",
  "read",
  "bookmark",
  "sort",
  "recent",
  "since",
] as const;

export function buildEventWorkbenchManagedQuery(filters: EventWorkbenchFilters) {
  const nextQuery: Record<string, string> = {};

  if (filters.query.trim()) {
    nextQuery.q = filters.query.trim();
  }

  if (filters.statusFilter !== "all") {
    nextQuery.status = filters.statusFilter;
  }

  if (filters.themeFilter !== "all") {
    nextQuery.themeId = filters.themeFilter;
  }

  if (filters.typeFilter !== "all") {
    nextQuery.type = filters.typeFilter;
  }

  if (filters.readFilter !== "all") {
    nextQuery.read = filters.readFilter;
  }

  if (filters.bookmarkFilter !== "all") {
    nextQuery.bookmark = filters.bookmarkFilter;
  }

  if (filters.sortBy !== "occurredAt") {
    nextQuery.sort = filters.sortBy;
  }

  if (filters.recentOnly24h) {
    nextQuery.recent = "24h";
  }

  if (filters.sinceFilter) {
    nextQuery.since = filters.sinceFilter;
  }

  return nextQuery;
}

export function readEventWorkbenchRouteFilters(
  query: QueryRecord,
  themeOptions: Array<{ id: string }>,
  isValidSince: (value: string) => boolean,
): EventWorkbenchFilters {
  const queryText = query.q ?? query.query;
  const queryTheme = query.themeId ?? query.theme;
  const queryStatus = query.status;
  const queryType = query.type;
  const queryRead = query.read;
  const queryBookmark = query.bookmark;
  const querySort = query.sort;
  const queryRecent = query.recent;
  const querySince = query.since;
  const allowedStatuses = ["all", "open", "tracking", "ignored"];
  const allowedTypes = ["all", "price", "news_announcement", "financial_event"];
  const allowedReadStates = ["all", "unread", "read"];
  const allowedBookmarkStates = ["all", "bookmarked"];
  const allowedSort = ["occurredAt", "statusChanged"];

  return {
    query: typeof queryText === "string" ? queryText : "",
    statusFilter:
      typeof queryStatus === "string" && allowedStatuses.includes(queryStatus) ? queryStatus : "all",
    themeFilter:
      typeof queryTheme === "string" && themeOptions.some((item) => item.id === queryTheme) ? queryTheme : "all",
    typeFilter: typeof queryType === "string" && allowedTypes.includes(queryType) ? queryType : "all",
    readFilter:
      typeof queryRead === "string" && allowedReadStates.includes(queryRead) ? queryRead : "all",
    bookmarkFilter:
      typeof queryBookmark === "string" && allowedBookmarkStates.includes(queryBookmark) ? queryBookmark : "all",
    sortBy: typeof querySort === "string" && allowedSort.includes(querySort) ? querySort : "occurredAt",
    recentOnly24h: queryRecent === "24h" || queryRecent === "true",
    sinceFilter: typeof querySince === "string" && isValidSince(querySince) ? querySince : "",
  };
}

export function matchesEventWorkbenchPreset(
  presetId: string,
  presets: ReadonlyArray<{
    id: string;
    filters: {
      query: string;
      theme: string;
      status: string;
      type: string;
      sort: string;
      recent: boolean;
      read?: string;
      bookmark?: string;
    };
  }>,
  filters: EventWorkbenchFilters,
) {
  const preset = presets.find((item) => item.id === presetId);

  if (!preset) {
    return false;
  }

  return (
    filters.query === preset.filters.query &&
    filters.themeFilter === preset.filters.theme &&
    filters.statusFilter === preset.filters.status &&
    filters.typeFilter === preset.filters.type &&
    filters.readFilter === (preset.filters.read ?? "all") &&
    filters.bookmarkFilter === (preset.filters.bookmark ?? "all") &&
    filters.sortBy === preset.filters.sort &&
    filters.recentOnly24h === preset.filters.recent &&
    filters.sinceFilter === ""
  );
}
