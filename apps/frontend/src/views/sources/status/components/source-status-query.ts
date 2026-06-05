type QueryRecord = Record<string, unknown>;

function normalizeThemeFilter(value: string, themeOptions: Array<{ id: string }>) {
  const ids = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!ids.length) {
    return "all";
  }

  return ids.every((id) => themeOptions.some((item) => item.id === id)) ? ids.join(",") : "all";
}

export type SourceStatusRouteFilters = {
  focusFilter: "all" | "warning" | "pending" | "healthy";
  impactFilter: "all" | "negative" | "positive" | "neutral";
  themeFilter: string;
  recentOnly24h: boolean;
  sinceFilter: string;
};

export const sourceStatusManagedQueryKeys = ["focus", "impact", "themeId", "theme", "recent", "since"] as const;

export function buildSourceStatusManagedQuery(filters: SourceStatusRouteFilters) {
  const nextQuery: Record<string, string> = {};

  if (filters.focusFilter !== "all") {
    nextQuery.focus = filters.focusFilter;
  }

  if (filters.impactFilter !== "all") {
    nextQuery.impact = filters.impactFilter;
  }

  if (filters.themeFilter !== "all") {
    nextQuery.themeId = filters.themeFilter;
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
  themeOptions: Array<{ id: string }>,
  isValidSince: (value: string) => boolean,
): SourceStatusRouteFilters {
  const queryFocus = query.focus;
  const queryImpact = query.impact;
  const queryTheme = query.themeId ?? query.theme;
  const queryRecent = query.recent;
  const querySince = query.since;
  const allowedFocusFilters = ["all", "warning", "pending", "healthy"];
  const allowedImpactFilters = ["all", "negative", "positive", "neutral"];

  return {
    focusFilter:
      typeof queryFocus === "string" && allowedFocusFilters.includes(queryFocus)
        ? (queryFocus as SourceStatusRouteFilters["focusFilter"])
        : "all",
    impactFilter:
      typeof queryImpact === "string" && allowedImpactFilters.includes(queryImpact)
        ? (queryImpact as SourceStatusRouteFilters["impactFilter"])
        : "all",
    themeFilter:
      typeof queryTheme === "string" ? normalizeThemeFilter(queryTheme, themeOptions) : "all",
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
      impact?: string;
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
    filters.impactFilter === (preset.filters.impact ?? "all") &&
    filters.themeFilter === "all" &&
    filters.recentOnly24h === preset.filters.recent &&
    filters.sinceFilter === ""
  );
}
