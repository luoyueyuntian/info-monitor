<template>
  <section class="page">
    <SourceStatusHeader />
    <SourceStatusFiltersPanel
      :presets="sourcePresets"
      :active-preset-id="activeSourcePresetId"
      :filter-summary="sourceFilterSummary"
      :focus-filter="focusFilter"
      :recent-only24h="recentOnly24h"
      :since-filter="sinceFilter"
      :incremental-source-count="incrementalSourceCount"
      :apply-source-preset="applySourcePreset"
      :reset-filters="resetFilters"
      :set-focus-filter="setFocusFilter"
      :set-recent-only24h="setRecentOnly24h"
      :clear-since-filter="clearSinceFilter"
    />
    <SourceStatusDiagnosticsCard :diagnostic="sourceDiagnostics" />
    <SourceStatusListCard
      :sources="filteredSources"
      :pending-source-id="pendingSourceId"
      :toggling-source-id="togglingSourceId"
      :is-incremental-source="isIncrementalSource"
      :handle-trigger="handleTrigger"
      :handle-toggle-source-paused="handleToggleSourcePaused"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import SourceStatusDiagnosticsCard from "./SourceStatusDiagnosticsCard.vue";
import SourceStatusFiltersPanel from "./SourceStatusFiltersPanel.vue";
import SourceStatusHeader from "./SourceStatusHeader.vue";
import SourceStatusListCard from "./SourceStatusListCard.vue";
import {
  buildSourceStatusManagedQuery,
  matchesSourceStatusPresetFilters,
  readSourceStatusRouteFilters,
  sourceStatusManagedQueryKeys,
} from "./source-status-query";
import { buildSourceDiagnostics, buildSourceFilterSummary } from "./source-status-model";
import { fetchSourceStatuses, triggerSourceRun, type SourceStatus, updateSourcePaused } from "../../../../lib/api";
import { sameQuery } from "../../../../lib/query";
import { toTimestamp } from "../../../../lib/time";

const sources = ref<SourceStatus[]>([]);
const pendingSourceId = ref<string | null>(null);
const togglingSourceId = ref<string | null>(null);
const route = useRoute();
const router = useRouter();
const focusFilter = ref("all");
const recentOnly24h = ref(false);
const sinceFilter = ref("");
const selectedSourcePresetId = ref("");
const sourcePresets = [
  {
    id: "all",
    label: "全部来源",
    filters: { focus: "all", recent: false },
  },
  {
    id: "warning",
    label: "异常来源",
    filters: { focus: "warning", recent: false },
  },
  {
    id: "pending",
    label: "待运行",
    filters: { focus: "pending", recent: false },
  },
  {
    id: "recent-all",
    label: "24h 运行",
    filters: { focus: "all", recent: true },
  },
  {
    id: "recent-warning",
    label: "24h 异常",
    filters: { focus: "warning", recent: true },
  },
] as const;

function syncRouteQueryFromFilters() {
  const nextManagedQuery = buildSourceStatusManagedQuery({
    focusFilter: focusFilter.value as "all" | "warning" | "pending" | "healthy",
    recentOnly24h: recentOnly24h.value,
    sinceFilter: sinceFilter.value,
  });
  const currentManagedQuery = buildSourceStatusManagedQuery(
    readSourceStatusRouteFilters(route.query, (value) => toTimestamp(value) > 0),
  );

  if (sameQuery(nextManagedQuery, currentManagedQuery)) {
    return;
  }

  const preservedEntries = Object.entries(route.query).filter(([key]) => !sourceStatusManagedQueryKeys.includes(key as never));
  const preservedQuery = Object.fromEntries(preservedEntries);

  void router.replace({
    query: {
      ...preservedQuery,
      ...nextManagedQuery,
    },
  });
}

function applyRouteFilters() {
  const nextFilters = readSourceStatusRouteFilters(route.query, (value) => toTimestamp(value) > 0);
  focusFilter.value = nextFilters.focusFilter;
  recentOnly24h.value = nextFilters.recentOnly24h;
  sinceFilter.value = nextFilters.sinceFilter;
}

function resetFilters() {
  focusFilter.value = "all";
  recentOnly24h.value = false;
  sinceFilter.value = "";
  selectedSourcePresetId.value = "";
}

function setFocusFilter(value: string) {
  focusFilter.value = value;
}

function setRecentOnly24h(value: boolean) {
  recentOnly24h.value = value;
}

function clearSinceFilter() {
  sinceFilter.value = "";
}

function applySourcePreset(presetId: string) {
  const preset = sourcePresets.find((item) => item.id === presetId);

  if (!preset) {
    return;
  }

  focusFilter.value = preset.filters.focus;
  recentOnly24h.value = preset.filters.recent;
  sinceFilter.value = "";
  selectedSourcePresetId.value = preset.id;
}

async function loadSources() {
  sources.value = await fetchSourceStatuses();
}

const filteredSources = computed(() => {
  const threshold = Date.now() - 24 * 60 * 60 * 1000;

  const within24h = (value?: string | null) => {
    if (!value) {
      return false;
    }

    const time = new Date(value).getTime();
    return Number.isNaN(time) ? false : time >= threshold;
  };

  const sourcePassed = (source: SourceStatus) => {
    if (!recentOnly24h.value) {
      return true;
    }

    return within24h(source.latestRunAt) || within24h(source.latestSuccessAt) || within24h(source.latestFailureAt);
  };
  const afterSince = (source: SourceStatus) => {
    if (!sinceFilter.value) {
      return true;
    }

    const sinceTimestamp = toTimestamp(sinceFilter.value);
    const latestActivity = Math.max(
      toTimestamp(source.latestRunAt),
      toTimestamp(source.latestSuccessAt),
      toTimestamp(source.latestFailureAt),
    );

    return latestActivity >= sinceTimestamp;
  };

  if (focusFilter.value === "all") {
    return sources.value.filter(sourcePassed).filter(afterSince);
  }

  if (focusFilter.value === "warning") {
    return sources.value
      .filter((source) => source.status === "warning" || source.status === "unhealthy")
      .filter(sourcePassed)
      .filter(afterSince);
  }

  if (focusFilter.value === "pending") {
    return sources.value
      .filter((source) => source.latestRunStatus === "pending" || source.status === "pending")
      .filter(sourcePassed)
      .filter(afterSince);
  }

  return sources.value.filter((source) => source.status === "healthy").filter(sourcePassed).filter(afterSince);
});

function matchesPresetFilters(presetId: string) {
  return matchesSourceStatusPresetFilters(presetId, sourcePresets, {
    focusFilter: focusFilter.value as "all" | "warning" | "pending" | "healthy",
    recentOnly24h: recentOnly24h.value,
    sinceFilter: sinceFilter.value,
  });
}

const activeSourcePresetId = computed(() => {
  if (!selectedSourcePresetId.value) {
    return "";
  }

  return matchesPresetFilters(selectedSourcePresetId.value) ? selectedSourcePresetId.value : "";
});

const sourceDiagnostics = computed(() => buildSourceDiagnostics(filteredSources.value));

const incrementalSourceCount = computed(() => filteredSources.value.filter((source) => isIncrementalSource(source)).length);

const sourceFilterSummary = computed(() =>
  buildSourceFilterSummary(focusFilter.value, recentOnly24h.value, sinceFilter.value),
);

async function handleTrigger(sourceId: string) {
  pendingSourceId.value = sourceId;

  try {
    await triggerSourceRun(sourceId);
    await loadSources();
  } finally {
    pendingSourceId.value = null;
  }
}

function isIncrementalSource(source: SourceStatus) {
  if (!sinceFilter.value) {
    return false;
  }

  const sinceTimestamp = toTimestamp(sinceFilter.value);
  const latestActivity = Math.max(
    toTimestamp(source.latestRunAt),
    toTimestamp(source.latestSuccessAt),
    toTimestamp(source.latestFailureAt),
  );

  return latestActivity >= sinceTimestamp;
}

async function handleToggleSourcePaused(sourceId: string, isPaused: boolean) {
  togglingSourceId.value = sourceId;

  try {
    await updateSourcePaused(sourceId, isPaused);
    await loadSources();
  } finally {
    togglingSourceId.value = null;
  }
}

onMounted(async () => {
  await loadSources();
  applyRouteFilters();
});

watch(
  () => route.query,
  () => {
    applyRouteFilters();
  },
);

watch([focusFilter, recentOnly24h, sinceFilter], () => {
  if (selectedSourcePresetId.value && !matchesPresetFilters(selectedSourcePresetId.value)) {
    selectedSourcePresetId.value = "";
  }

  syncRouteQueryFromFilters();
});
</script>
