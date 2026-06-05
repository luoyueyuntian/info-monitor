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
      :impact-filter="impactFilter"
      :recent-only24h="recentOnly24h"
      :sort-by="sortBy"
      :apply-theme-preset="applyThemePreset"
      :reset-filters="resetFilters"
      :set-query="setQuery"
      :set-type-filter="setTypeFilter"
      :set-event-queue-filter="setEventQueueFilter"
      :set-health-filter="setHealthFilter"
      :set-impact-filter="setImpactFilter"
      :set-recent-only24h="setRecentOnly24h"
      :set-sort-by="setSortBy"
      :clear-query="clearQuery"
    />

    <ThemesDiagnosticsCard :diagnostic="themeDiagnostics" />
    <ThemeWorkspaceActionsCard :workspace="themeWorkspaceActions" />
    <ThemeComparisonsCard :items="themeComparisons" :comparison-target="comparisonTarget" />
    <ThemeReviewCard :themes="bookmarkedThemesForReview" />

    <article
      v-if="filteredThemes.length"
      class="rounded-[18px] border border-slate-400/15 bg-white/78 p-[18px] shadow-[0_12px_30px_rgba(15,23,42,0.05)]"
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-3">
          <label class="flex items-center gap-2.5 font-semibold">
            <input
              :checked="allVisibleSelected"
              type="checkbox"
              @change="toggleSelectAllVisible(($event.target as HTMLInputElement).checked)"
            />
            选中当前筛选主题
          </label>
          <span class="text-[0.88rem] text-[#766f63]">
            {{ selectedThemeIds.length > 0 ? `已选 ${selectedThemeIds.length} 个主题` : `未单独选中时，默认使用当前筛选的 ${filteredThemes.length} 个主题` }}
          </span>
        </div>
        <div class="flex flex-wrap gap-3">
          <button
            class="inline-flex items-center justify-center rounded-xl bg-[#e6dcc8] px-4 py-2.5 text-[#3a3126] transition-colors hover:bg-[#ddd1bb] disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="!selectedThemeIds.length || bulkUpdating"
            @click="handleBulkUpdateThemes('archived')"
          >
            {{ bulkUpdating && pendingBulkAction === 'archived' ? "正在更新..." : "批量归档主题" }}
          </button>
          <button
            class="inline-flex items-center justify-center rounded-xl bg-[#e6dcc8] px-4 py-2.5 text-[#3a3126] transition-colors hover:bg-[#ddd1bb] disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="!selectedThemeIds.length || bulkUpdating"
            @click="handleBulkUpdateThemes('active')"
          >
            {{ bulkUpdating && pendingBulkAction === 'active' ? "正在更新..." : "批量恢复主题" }}
          </button>
          <RouterLink
            class="inline-flex items-center justify-center rounded-xl bg-[#e6dcc8] px-4 py-2.5 text-[#3a3126] transition-colors hover:bg-[#ddd1bb]"
            :to="{ path: '/events', query: { themeId: selectedThemeContext ?? undefined, impact: impactFilter === 'all' ? undefined : impactFilter, status: eventQueueFilter === 'open' ? 'open' : eventQueueFilter === 'tracking' ? 'tracking' : undefined, sort: eventQueueFilter === 'open' ? 'statusChanged' : 'occurredAt' } }"
          >
            {{ selectedThemeIds.length > 0 ? "查看选中主题事件" : "查看当前筛选主题事件" }}
          </RouterLink>
          <RouterLink
            class="inline-flex items-center justify-center rounded-xl bg-[#e6dcc8] px-4 py-2.5 text-[#3a3126] transition-colors hover:bg-[#ddd1bb]"
            :to="{ path: '/sources/status', query: { themeId: selectedThemeContext ?? undefined, impact: impactFilter === 'all' ? undefined : impactFilter, focus: healthFilter === 'warning' ? 'warning' : undefined, recent: recentOnly24h ? '24h' : undefined } }"
          >
            {{ selectedThemeIds.length > 0 ? "查看选中主题来源" : "查看当前筛选主题来源" }}
          </RouterLink>
          <RouterLink
            class="inline-flex items-center justify-center rounded-xl bg-[#e6dcc8] px-4 py-2.5 text-[#3a3126] transition-colors hover:bg-[#ddd1bb]"
            :to="{ path: '/themes', query: buildThemeManagedQuery(activeFilters) }"
          >
            回到当前主题视图
          </RouterLink>
        </div>
      </div>
    </article>

    <article
      v-if="operationNotice"
      class="rounded-[18px] border border-slate-400/15 bg-white/78 p-[18px] shadow-[0_12px_30px_rgba(15,23,42,0.05)]"
    >
      <strong class="block text-base font-semibold text-[#2f2618]">操作结果</strong>
      <div class="mt-2 text-[#6f665a]">{{ operationNotice.message }}</div>
      <div v-if="operationNotice.actions.length" class="mt-3 grid gap-2.5 md:grid-cols-3">
        <RouterLink
          v-for="action in operationNotice.actions"
          :key="action.label"
          class="rounded-xl border border-slate-400/15 bg-white/70 px-4 py-3 font-semibold text-slate-700 transition-colors hover:bg-white/90"
          :to="action.to"
        >
          {{ action.label }}
        </RouterLink>
      </div>
    </article>

    <ThemeListCard
      :themes="filteredThemes"
      :selected-theme-ids="selectedThemeIds"
      :toggle-theme-selection="toggleThemeSelection"
    />
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
import ThemeWorkspaceActionsCard from "./ThemeWorkspaceActionsCard.vue";
import {
  buildThemeComparisons,
  buildThemeDiagnostics,
  buildThemeFilterSummary,
  buildThemeWorkspaceActions,
  filterThemes,
  type ThemesBoardFilters,
} from "./themes-model";
import {
  buildThemeManagedQuery,
  matchesThemePresetFilters,
  readThemeRouteFilters,
  themeManagedQueryKeys,
} from "./themes-query";
import { fetchThemes, type ThemeSummary, updateTheme } from "../../../lib/api";
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
const impactFilter = ref("all");
const sortBy = ref("priority");
const recentOnly24h = ref(false);
const selectedThemePresetId = ref("");
const selectedThemeIds = ref<string[]>([]);
const bulkUpdating = ref(false);
const pendingBulkAction = ref("");
const operationNotice = ref<{
  message: string;
  actions: Array<{ label: string; to: { path: string; query?: Record<string, string | undefined> } }>;
} | null>(null);
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
    id: "positive",
    label: "偏利好主题",
    filters: { query: "", type: "all", queue: "all", health: "all", impact: "positive", sort: "attention", recent: false },
  },
  {
    id: "negative",
    label: "偏利空主题",
    filters: { query: "", type: "all", queue: "all", health: "all", impact: "negative", sort: "attention", recent: false },
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
        filters: { query: "", type: "all", queue: "bookmarked", health: "all", sort: "latestBookmarked", recent: false },
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

function setImpactFilter(value: string) {
  impactFilter.value = value;
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
  impactFilter.value = nextFilters.impactFilter;
  sortBy.value = nextFilters.sortBy;
  recentOnly24h.value = nextFilters.recentOnly24h;
}

function resetFilters() {
  query.value = "";
  typeFilter.value = "all";
  eventQueueFilter.value = "all";
  healthFilter.value = "all";
  impactFilter.value = "all";
  sortBy.value = "priority";
  recentOnly24h.value = false;
  selectedThemePresetId.value = "";
  selectedThemeIds.value = [];
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
  impactFilter.value = "impact" in preset.filters ? preset.filters.impact : "all";
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
  impactFilter: impactFilter.value,
  sortBy: sortBy.value,
  recentOnly24h: recentOnly24h.value,
}));

const themeFilterSummary = computed(() =>
  buildThemeFilterSummary(activeFilters.value, themeTypeLabel),
);

const filteredThemes = computed(() => filterThemes(themes.value, activeFilters.value));

const allVisibleSelected = computed(() => {
  if (!filteredThemes.value.length) {
    return false;
  }

  return filteredThemes.value.every((theme) => selectedThemeIds.value.includes(theme.id));
});

const selectedThemeContext = computed(() => {
  const ids = selectedThemeIds.value.length
    ? selectedThemeIds.value
    : filteredThemes.value.map((theme) => theme.id);

  return ids.length ? ids.join(",") : null;
});

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
const themeWorkspaceActions = computed(() => buildThemeWorkspaceActions(filteredThemes.value, activeFilters.value));

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

function toggleThemeSelection(themeId: string) {
  if (selectedThemeIds.value.includes(themeId)) {
    selectedThemeIds.value = selectedThemeIds.value.filter((id) => id !== themeId);
    return;
  }

  selectedThemeIds.value = [...selectedThemeIds.value, themeId];
}

function toggleSelectAllVisible(checked: boolean) {
  const visibleIds = filteredThemes.value.map((theme) => theme.id);

  if (checked) {
    selectedThemeIds.value = Array.from(new Set([...selectedThemeIds.value, ...visibleIds]));
    return;
  }

  selectedThemeIds.value = selectedThemeIds.value.filter((id) => !visibleIds.includes(id));
}

function buildBulkThemeOperationNotice(status: "active" | "archived", count: number) {
  const impact = impactFilter.value === "all" ? undefined : impactFilter.value;
  const themeId = selectedThemeContext.value ?? undefined;

  if (status === "archived") {
    return {
      message: `已将 ${count} 个主题批量归档。`,
      actions: [
        { label: "查看当前主题视图", to: { path: "/themes", query: buildThemeManagedQuery(activeFilters.value) } },
        { label: "查看相关来源状态", to: { path: "/sources/status", query: { themeId, impact, recent: recentOnly24h.value ? "24h" : undefined } } },
        { label: "查看相关事件", to: { path: "/events", query: { themeId, impact, sort: "occurredAt" } } },
      ],
    };
  }

  return {
    message: `已将 ${count} 个主题恢复为 active。`,
    actions: [
      { label: "查看当前主题视图", to: { path: "/themes", query: buildThemeManagedQuery(activeFilters.value) } },
      { label: "查看相关事件", to: { path: "/events", query: { themeId, impact, sort: "occurredAt" } } },
      { label: "查看相关来源状态", to: { path: "/sources/status", query: { themeId, impact, recent: recentOnly24h.value ? "24h" : undefined } } },
    ],
  };
}

async function handleBulkUpdateThemes(status: "active" | "archived") {
  if (!selectedThemeIds.value.length) {
    return;
  }

  bulkUpdating.value = true;
  pendingBulkAction.value = status;
  operationNotice.value = null;

  try {
    const ids = [...selectedThemeIds.value];
    await Promise.all(ids.map((themeId) => updateTheme({ themeId, status })));
    themes.value = themes.value.map((theme) =>
      ids.includes(theme.id) ? { ...theme, status } : theme,
    );
    selectedThemeIds.value = [];
    operationNotice.value = buildBulkThemeOperationNotice(status, ids.length);
  } finally {
    bulkUpdating.value = false;
    pendingBulkAction.value = "";
  }
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

watch([query, typeFilter, eventQueueFilter, healthFilter, impactFilter, sortBy, recentOnly24h], () => {
  if (selectedThemePresetId.value && !matchesPresetFilters(selectedThemePresetId.value)) {
    selectedThemePresetId.value = "";
  }

  syncRouteQueryFromFilters();
});
</script>
