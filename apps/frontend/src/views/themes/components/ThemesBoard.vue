<template>
  <div>
    <ThemesFiltersPanel
      :presets="themePresets"
      :active-preset-id="activeThemePresetId"
      :filter-summary="themeFilterSummary"
      :query="query"
      :type-filter="typeFilter"
      :event-queue-filter="eventQueueFilter"
      :health-filter="healthFilter"
      :recent-only24h="recentOnly24h"
      :sort-by="sortBy"
      :apply-theme-preset="applyThemePreset"
      :reset-filters="resetFilters"
      :set-query="setQuery"
      :set-type-filter="setTypeFilter"
      :set-event-queue-filter="setEventQueueFilter"
      :set-health-filter="setHealthFilter"
      :set-recent-only24h="setRecentOnly24h"
      :set-sort-by="setSortBy"
      :clear-query="clearQuery"
    />

    <ThemesDiagnosticsCard :diagnostic="themeDiagnostics" />
    <ThemeComparisonsCard :items="themeComparisons" :comparison-target="comparisonTarget" />
    <ThemeReviewCard :themes="bookmarkedThemesForReview" />
    <ThemeListCard :themes="filteredThemes" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import ThemeComparisonsCard from "./ThemeComparisonsCard.vue";
import ThemesFiltersPanel from "./ThemesFiltersPanel.vue";
import ThemesDiagnosticsCard from "./ThemesDiagnosticsCard.vue";
import ThemeListCard from "./ThemeListCard.vue";
import ThemeReviewCard from "./ThemeReviewCard.vue";
import {
  buildThemeComparisons,
  buildThemeDiagnostics,
  buildThemeFilterSummary,
  filterThemes,
  type ThemesBoardFilters,
} from "./themes-model";
import {
  buildThemeManagedQuery,
  matchesThemePresetFilters,
  readThemeRouteFilters,
  themeManagedQueryKeys,
} from "./themes-query";
import { fetchThemes, type ThemeSummary } from "../../../lib/api";
import { sameQuery } from "../../../lib/query";
import {
  themeAttentionScore,
} from "../../../lib/theme-ranking";
import { themeTypeLabel } from "../../../lib/presentation";

const themes = ref<ThemeSummary[]>([]);
const query = ref("");
const typeFilter = ref("all");
const eventQueueFilter = ref("all");
const healthFilter = ref("all");
const sortBy = ref("priority");
const recentOnly24h = ref(false);
const selectedThemePresetId = ref("");
const route = useRoute();
const router = useRouter();
const themePresets = [
  {
    id: "all",
    label: "全部主题",
    filters: { query: "", type: "all", queue: "all", health: "all", sort: "priority", recent: false },
  },
  {
    id: "price-24h",
    label: "24h 价格",
    filters: { query: "", type: "price", queue: "all", health: "all", sort: "latestEvent", recent: true },
  },
  {
    id: "open-events",
    label: "待处理主题",
    filters: { query: "", type: "all", queue: "open", health: "all", sort: "attention", recent: false },
  },
  {
    id: "unread-events",
    label: "未读主题",
    filters: { query: "", type: "all", queue: "unread", health: "all", sort: "attention", recent: false },
  },
  {
    id: "bookmarked-events",
    label: "收藏主题",
    filters: { query: "", type: "all", queue: "bookmarked", health: "all", sort: "attention", recent: false },
  },
  {
    id: "warning",
    label: "异常主题",
    filters: { query: "", type: "all", queue: "all", health: "warning", sort: "priority", recent: false },
  },
  {
    id: "announcement-24h",
    label: "24h 官方发布",
    filters: { query: "", type: "news_announcement", queue: "all", health: "all", sort: "latestEvent", recent: true },
  },
  {
    id: "financial-24h",
    label: "24h 金融事件",
    filters: { query: "", type: "financial_event", queue: "all", health: "all", sort: "latestEvent", recent: true },
  },
] as const;

function setQuery(value: string) {
  query.value = value;
}

function setTypeFilter(value: string) {
  typeFilter.value = value;
}

function setEventQueueFilter(value: string) {
  eventQueueFilter.value = value;
}

function setHealthFilter(value: string) {
  healthFilter.value = value;
}

function setRecentOnly24h(value: boolean) {
  recentOnly24h.value = value;
}

function setSortBy(value: string) {
  sortBy.value = value;
}

function clearQuery() {
  query.value = "";
}

function syncRouteQueryFromFilters() {
  const nextManagedQuery = buildThemeManagedQuery(activeFilters.value);
  const currentManagedQuery = buildThemeManagedQuery(readThemeRouteFilters(route.query));

  if (sameQuery(nextManagedQuery, currentManagedQuery)) {
    return;
  }

  const preservedEntries = Object.entries(route.query).filter(([key]) => !themeManagedQueryKeys.includes(key as never));
  const preservedQuery = Object.fromEntries(preservedEntries);

  void router.replace({
    query: {
      ...preservedQuery,
      ...nextManagedQuery,
    },
  });
}

function applyQueryFilters() {
  const nextFilters = readThemeRouteFilters(route.query);
  query.value = nextFilters.query;
  typeFilter.value = nextFilters.typeFilter;
  eventQueueFilter.value = nextFilters.eventQueueFilter;
  healthFilter.value = nextFilters.healthFilter;
  sortBy.value = nextFilters.sortBy;
  recentOnly24h.value = nextFilters.recentOnly24h;
}

function resetFilters() {
  query.value = "";
  typeFilter.value = "all";
  eventQueueFilter.value = "all";
  healthFilter.value = "all";
  sortBy.value = "priority";
  recentOnly24h.value = false;
  selectedThemePresetId.value = "";
}

function applyThemePreset(presetId: string) {
  const preset = themePresets.find((item) => item.id === presetId);

  if (!preset) {
    return;
  }

  query.value = preset.filters.query;
  typeFilter.value = preset.filters.type;
  eventQueueFilter.value = preset.filters.queue;
  healthFilter.value = preset.filters.health;
  sortBy.value = preset.filters.sort;
  recentOnly24h.value = preset.filters.recent;
  selectedThemePresetId.value = preset.id;
}

function matchesPresetFilters(presetId: string) {
  return matchesThemePresetFilters(presetId, themePresets, activeFilters.value);
}

const activeThemePresetId = computed(() => {
  if (!selectedThemePresetId.value) {
    return "";
  }

  return matchesPresetFilters(selectedThemePresetId.value) ? selectedThemePresetId.value : "";
});

const activeFilters = computed<ThemesBoardFilters>(() => ({
  query: query.value,
  typeFilter: typeFilter.value,
  eventQueueFilter: eventQueueFilter.value,
  healthFilter: healthFilter.value,
  sortBy: sortBy.value,
  recentOnly24h: recentOnly24h.value,
}));

const themeFilterSummary = computed(() =>
  buildThemeFilterSummary(activeFilters.value, themeTypeLabel),
);

const filteredThemes = computed(() => filterThemes(themes.value, activeFilters.value));

const bookmarkedThemesForReview = computed(() =>
  [...filteredThemes.value]
    .filter((theme) => (theme.bookmarkedEventCount ?? 0) > 0)
    .sort((left, right) => {
      if ((right.bookmarkedEventCount ?? 0) !== (left.bookmarkedEventCount ?? 0)) {
        return (right.bookmarkedEventCount ?? 0) - (left.bookmarkedEventCount ?? 0);
      }

      return themeAttentionScore(right) - themeAttentionScore(left);
    })
    .slice(0, 6),
);

const themeDiagnostics = computed(() => buildThemeDiagnostics(filteredThemes.value));

const themeComparisons = computed(() => buildThemeComparisons(filteredThemes.value));

function comparisonTarget(item: { theme: ThemeSummary | null }) {
  if (!item.theme) {
    return "/themes";
  }

  let section = "analysis";

  if ((item.theme.openEventCount ?? 0) > 0) {
    section = "events";
  } else if (item.theme.sourceHealth === "warning") {
    section = "sources";
  } else if (item.theme.type === "price") {
    section = "trend";
  }

  return {
    path: `/themes/${item.theme.id}`,
    query: { section },
  };
}

onMounted(async () => {
  themes.value = await fetchThemes();
  applyQueryFilters();
});

watch(
  () => route.query,
  () => {
    applyQueryFilters();
  },
);

watch([query, typeFilter, eventQueueFilter, healthFilter, sortBy, recentOnly24h], () => {
  if (selectedThemePresetId.value && !matchesPresetFilters(selectedThemePresetId.value)) {
    selectedThemePresetId.value = "";
  }

  syncRouteQueryFromFilters();
});
</script>
