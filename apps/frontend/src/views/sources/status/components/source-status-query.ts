type QueryRecord = Record<string, unknown>;

export type SourceStatusRouteFilters = {
  focusFilter: "all" | "warning" | "pending" | "healthy";
  recentOnly24h: boolean;
  sinceFilter: string;
};

export const sourceStatusManagedQueryKeys = ["focus", "recent", "since"] as const;

export function buildSourceStatusManagedQuery(filters: SourceStatusRouteFilters) {
  const nextQuery: Record<string, string> = {};

  if (filters.focusFilter !== "all") {
    nextQuery.focus = filters.focusFilter;
  }

  if (filters.recentOnly24h) {
    nextQuery.recent = "24h";
  }

  if (filters.sinceFilter) {
    nextQuery.since = filters.sinceFilter;
  }

  return nextQuery;
}

export function readSourceStatusRouteFilters(
  query: QueryRecord,
  isValidSince: (value: string) => boolean,
): SourceStatusRouteFilters {
  const queryFocus = query.focus;
  const queryRecent = query.recent;
  const querySince = query.since;
  const allowedFocusFilters = ["all", "warning", "pending", "healthy"];

  return {
    focusFilter:
      typeof queryFocus === "string" && allowedFocusFilters.includes(queryFocus)
        ? (queryFocus as SourceStatusRouteFilters["focusFilter"])
        : "all",
    recentOnly24h: queryRecent === "24h" || queryRecent === "true",
    sinceFilter: typeof querySince === "string" && isValidSince(querySince) ? querySince : "",
  };
}

export function matchesSourceStatusPresetFilters(
  presetId: string,
  presets: ReadonlyArray<{
    id: string;
    filters: {
      focus: string;
      recent: boolean;
    };
  }>,
  filters: SourceStatusRouteFilters,
) {
  const preset = presets.find((item) => item.id === presetId);

  if (!preset) {
    return false;
  }

  return (
    filters.focusFilter === preset.filters.focus &&
    filters.recentOnly24h === preset.filters.recent &&
    filters.sinceFilter === ""
  );
}
