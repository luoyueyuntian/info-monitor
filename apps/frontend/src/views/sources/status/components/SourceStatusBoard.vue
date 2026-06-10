<template>
  <section class="page">
    <SourceStatusHeader />
    <SourceStatusFiltersPanel
      :presets="sourcePresets"
      :active-preset-id="activeSourcePresetId"
      :filter-summary="sourceFilterSummary"
      :focus-filter="focusFilter"
      :theme-filter="themeFilter"
      :theme-options="themeOptions"
      :theme-context-label="themeContextLabel"
      :impact-filter="impactFilter"
      :recent-only24h="recentOnly24h"
      :since-filter="sinceFilter"
      :incremental-source-count="incrementalSourceCount"
      :apply-source-preset="applySourcePreset"
      :reset-filters="resetFilters"
      :set-focus-filter="setFocusFilter"
      :set-theme-filter="setThemeFilter"
      :set-impact-filter="setImpactFilter"
      :set-recent-only24h="setRecentOnly24h"
      :clear-since-filter="clearSinceFilter"
    />
    <SourceStatusDiagnosticsCard :diagnostic="sourceDiagnostics" />

    <article class="card" v-if="sourceWorkspaceActions.length">
      <div class="card-topline">
        <h3>跨页处理</h3>
        <span class="text-[0.88rem] text-[#766f63]">{{ sourceWorkspaceSummary }}</span>
      </div>
      <div class="grid gap-2.5 md:grid-cols-3">
        <RouterLink
          v-for="action in sourceWorkspaceActions"
          :key="action.label"
          class="rounded-xl border border-slate-400/15 bg-white/70 px-4 py-3 font-semibold text-slate-700 transition-colors hover:bg-white/90"
          :to="action.to"
        >
          {{ action.label }}
        </RouterLink>
      </div>
    </article>

    <article
      v-if="filteredSources.length"
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
            选中当前筛选来源
          </label>
          <span class="text-[0.88rem] text-[#766f63]">
            {{ selectedSourceIds.length > 0 ? `已选 ${selectedSourceIds.length} 个来源` : `未单独选中时，默认使用当前筛选的 ${filteredSources.length} 个来源` }}
          </span>
        </div>
        <div class="flex flex-wrap gap-3">
          <button
            class="inline-flex items-center justify-center rounded-xl bg-[#e6dcc8] px-4 py-2.5 text-[#3a3126] transition-colors hover:bg-[#ddd1bb] disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="!effectiveBulkSourceIds.length || bulkUpdating"
            @click="handleBulkTriggerSources"
          >
            {{
              bulkUpdating && pendingBulkAction === 'trigger'
                ? "正在入队..."
                : selectedSourceIds.length > 0
                  ? "批量入队运行"
                  : "入队当前筛选来源"
            }}
          </button>
          <button
            class="inline-flex items-center justify-center rounded-xl bg-[#e6dcc8] px-4 py-2.5 text-[#3a3126] transition-colors hover:bg-[#ddd1bb] disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="!effectiveBulkSourceIds.length || bulkUpdating"
            @click="handleBulkToggleSourcesPaused(true)"
          >
            {{
              bulkUpdating && pendingBulkAction === 'pause'
                ? "正在更新..."
                : selectedSourceIds.length > 0
                  ? "批量暂停来源"
                  : "暂停当前筛选来源"
            }}
          </button>
          <button
            class="inline-flex items-center justify-center rounded-xl bg-[#e6dcc8] px-4 py-2.5 text-[#3a3126] transition-colors hover:bg-[#ddd1bb] disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="!effectiveBulkSourceIds.length || bulkUpdating"
            @click="handleBulkToggleSourcesPaused(false)"
          >
            {{
              bulkUpdating && pendingBulkAction === 'resume'
                ? "正在更新..."
                : selectedSourceIds.length > 0
                  ? "批量恢复来源"
                  : "恢复当前筛选来源"
            }}
          </button>
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

    <SourceStatusListCard
      :sources="filteredSources"
      :selected-source-ids="selectedSourceIds"
      :pending-source-id="pendingSourceId"
      :toggling-source-id="togglingSourceId"
      :is-incremental-source="isIncrementalSource"
      :toggle-source-selection="toggleSourceSelection"
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
import { themeImpactTone } from "../../../../lib/impact";
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
const selectedSourceIds = ref<string[]>([]);
const pendingSourceId = ref<string | null>(null);
const togglingSourceId = ref<string | null>(null);
const bulkUpdating = ref(false);
const pendingBulkAction = ref("");
const operationNotice = ref<{
  message: string;
  actions: Array<{ label: string; to: { path: string; query?: Record<string, string | undefined> } }>;
} | null>(null);
const route = useRoute();
const router = useRouter();
const focusFilter = ref("all");
const themeFilter = ref("all");
const impactFilter = ref("all");
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
    id: "negative",
    label: "关联偏利空",
    filters: { focus: "all", impact: "negative", recent: false },
  },
  {
    id: "positive",
    label: "关联偏利好",
    filters: { focus: "all", impact: "positive", recent: false },
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
    impactFilter: impactFilter.value as "all" | "negative" | "positive" | "neutral",
    themeFilter: themeFilter.value,
    recentOnly24h: recentOnly24h.value,
    sinceFilter: sinceFilter.value,
  });
  const currentManagedQuery = buildSourceStatusManagedQuery(
    readSourceStatusRouteFilters(route.query, themeOptions.value, (value) => toTimestamp(value) > 0),
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
  const nextFilters = readSourceStatusRouteFilters(route.query, themeOptions.value, (value) => toTimestamp(value) > 0);
  focusFilter.value = nextFilters.focusFilter;
  impactFilter.value = nextFilters.impactFilter;
  themeFilter.value = nextFilters.themeFilter;
  recentOnly24h.value = nextFilters.recentOnly24h;
  sinceFilter.value = nextFilters.sinceFilter;
}

function resetFilters() {
  focusFilter.value = "all";
  themeFilter.value = "all";
  impactFilter.value = "all";
  recentOnly24h.value = false;
  sinceFilter.value = "";
  selectedSourcePresetId.value = "";
  selectedSourceIds.value = [];
}

function setFocusFilter(value: string) {
  focusFilter.value = value;
}

function setThemeFilter(value: string) {
  themeFilter.value = value;
}

function setImpactFilter(value: string) {
  impactFilter.value = value;
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
  impactFilter.value = "impact" in preset.filters ? preset.filters.impact : "all";
  recentOnly24h.value = preset.filters.recent;
  sinceFilter.value = "";
  selectedSourcePresetId.value = preset.id;
}

async function loadSources() {
  sources.value = await fetchSourceStatuses();
}

const themeOptions = computed(() => {
  const grouped = new Map<string, string>();

  for (const source of sources.value) {
    if (!grouped.has(source.themeId)) {
      grouped.set(source.themeId, source.themeName);
    }
  }

  return [...grouped.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((left, right) => left.name.localeCompare(right.name, "zh-CN"));
});
const themeContextLabel = computed(() => {
  if (themeFilter.value === "all" || !themeFilter.value.includes(",")) {
    return "";
  }

  const ids = themeFilter.value.split(",").map((item) => item.trim()).filter(Boolean);
  return `当前 ${ids.length} 个主题`;
});

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

  const matchesImpact = (source: SourceStatus) => {
    if (impactFilter.value === "all") {
      return true;
    }

    return (
      themeImpactTone({ type: source.themeType ?? "", latestEventSignal: source.latestEventSignal ?? null }) ===
      impactFilter.value
    );
  };

  const matchesTheme = (source: SourceStatus) => {
    if (themeFilter.value === "all") {
      return true;
    }

    const themeIds = themeFilter.value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    return themeIds.includes(source.themeId);
  };

  if (focusFilter.value === "all") {
    return sources.value.filter(sourcePassed).filter(afterSince).filter(matchesTheme).filter(matchesImpact);
  }

  if (focusFilter.value === "warning") {
    return sources.value
      .filter((source) => source.status === "warning" || source.status === "unhealthy")
      .filter(sourcePassed)
      .filter(afterSince)
      .filter(matchesTheme)
      .filter(matchesImpact);
  }

  if (focusFilter.value === "pending") {
    return sources.value
      .filter((source) => source.latestRunStatus === "pending" || source.status === "pending")
      .filter(sourcePassed)
      .filter(afterSince)
      .filter(matchesTheme)
      .filter(matchesImpact);
  }

  return sources.value
    .filter((source) => source.status === "healthy")
    .filter(sourcePassed)
    .filter(afterSince)
    .filter(matchesTheme)
    .filter(matchesImpact);
});

function matchesPresetFilters(presetId: string) {
  return matchesSourceStatusPresetFilters(presetId, sourcePresets, {
    focusFilter: focusFilter.value as "all" | "warning" | "pending" | "healthy",
    impactFilter: impactFilter.value as "all" | "negative" | "positive" | "neutral",
    themeFilter: themeFilter.value,
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
  buildSourceFilterSummary(
    focusFilter.value,
    impactFilter.value,
    themeFilter.value === "all"
      ? ""
      : themeFilter.value.includes(",")
        ? `${themeFilter.value.split(",").filter(Boolean).length} 个主题`
        : themeOptions.value.find((item) => item.id === themeFilter.value)?.name ?? "",
    recentOnly24h.value,
    sinceFilter.value,
  ),
);

const sourceWorkspaceSummary = computed(() => {
  const negativeCount = filteredSources.value.filter((source) =>
    themeImpactTone({ type: source.themeType ?? "", latestEventSignal: source.latestEventSignal ?? null }) === "negative",
  ).length;
  const positiveCount = filteredSources.value.filter((source) =>
    themeImpactTone({ type: source.themeType ?? "", latestEventSignal: source.latestEventSignal ?? null }) === "positive",
  ).length;

  return `当前筛选结果里有 ${filteredSources.value.length} 个来源，可继续切到主题或事件工作台处理；其中 ${negativeCount} 个关联偏利空主题、${positiveCount} 个关联偏利好主题。`;
});

const sourceWorkspaceActions = computed(() => {
  const actions: Array<{ label: string; to: { path: string; query?: Record<string, string | undefined> } }> = [];
  const impact = impactFilter.value === "all" ? undefined : impactFilter.value;
  const themeId = themeFilter.value === "all" ? undefined : themeFilter.value;
  const themeIds = themeId
    ? themeId
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
  const singleThemeId = themeIds.length === 1 ? themeIds[0] : undefined;
  const themeDetailPath = singleThemeId ? `/themes/${singleThemeId}` : undefined;

  actions.push({
    label:
      singleThemeId
        ? impactFilter.value === "negative"
          ? "查看该主题分析"
          : impactFilter.value === "positive"
            ? "查看该主题时间线"
            : "查看该主题"
        : themeIds.length > 1
          ? impactFilter.value === "negative"
            ? "查看这组主题"
            : impactFilter.value === "positive"
              ? "查看这组主题"
              : "查看当前主题集合"
        : impactFilter.value === "negative"
          ? "查看关联偏利空主题"
          : impactFilter.value === "positive"
            ? "查看关联偏利好主题"
            : "查看主题中心",
    to: {
      path: themeDetailPath ?? "/themes",
      query: {
        section: singleThemeId ? (impactFilter.value === "negative" ? "analysis" : "timeline") : undefined,
        impact,
        sort: "attention",
      },
    },
  });

  actions.push({
    label: impactFilter.value === "negative" ? "查看偏利空事件" : impactFilter.value === "positive" ? "查看偏利好事件" : "查看最近24小时事件",
    to: {
      path: "/events",
      query: {
        themeId,
        impact,
        recent: recentOnly24h.value ? "24h" : "24h",
        sort: "occurredAt",
      },
    },
  });

  if (focusFilter.value === "warning" || focusFilter.value === "pending") {
    actions.push({
      label: focusFilter.value === "warning" ? "继续处理异常来源" : "继续处理待运行来源",
      to: {
        path: "/sources/status",
        query: {
          focus: focusFilter.value,
          themeId,
          impact,
          recent: recentOnly24h.value ? "24h" : undefined,
        },
      },
    });
  } else {
    actions.push({
      label: "查看全部来源状态",
      to: {
        path: "/sources/status",
        query: {
          themeId,
          impact,
          recent: recentOnly24h.value ? "24h" : undefined,
        },
      },
    });
  }

  return actions;
});

const allVisibleSelected = computed(() => {
  if (!filteredSources.value.length) {
    return false;
  }

  return filteredSources.value.every((source) => selectedSourceIds.value.includes(source.id));
});
const effectiveBulkSourceIds = computed(() => {
  return selectedSourceIds.value.length
    ? selectedSourceIds.value
    : filteredSources.value.map((source) => source.id);
});

function toggleSourceSelection(sourceId: string) {
  if (selectedSourceIds.value.includes(sourceId)) {
    selectedSourceIds.value = selectedSourceIds.value.filter((id) => id !== sourceId);
    return;
  }

  selectedSourceIds.value = [...selectedSourceIds.value, sourceId];
}

function toggleSelectAllVisible(checked: boolean) {
  const visibleIds = filteredSources.value.map((source) => source.id);

  if (checked) {
    selectedSourceIds.value = Array.from(new Set([...selectedSourceIds.value, ...visibleIds]));
    return;
  }

  selectedSourceIds.value = selectedSourceIds.value.filter((id) => !visibleIds.includes(id));
}

function buildBulkOperationNotice(action: "trigger" | "pause" | "resume", count: number) {
  const impact = impactFilter.value === "all" ? undefined : impactFilter.value;
  const themeId = themeFilter.value === "all" ? undefined : themeFilter.value;

  if (action === "trigger") {
    return {
      message: `已为 ${count} 个来源入队运行。`,
      actions: [
        {
          label: "查看待运行来源",
          to: { path: "/sources/status", query: { focus: "pending", themeId, impact, recent: "24h" } },
        },
        {
          label: "查看最近24小时事件",
          to: { path: "/events", query: { themeId, impact, recent: "24h", sort: "occurredAt" } },
        },
        {
          label: themeId ? "返回该主题来源状态" : "查看全部来源状态",
          to: { path: "/sources/status", query: { themeId, impact, recent: recentOnly24h.value ? "24h" : undefined } },
        },
      ],
    };
  }

  if (action === "pause") {
    return {
      message: `已暂停 ${count} 个来源。`,
      actions: [
        {
          label: "查看当前来源状态",
          to: { path: "/sources/status", query: { themeId, impact, recent: recentOnly24h.value ? "24h" : undefined } },
        },
        {
          label: "查看相关主题",
          to: themeId ? { path: `/themes/${themeId}`, query: { section: "sources" } } : { path: "/themes", query: { impact, sort: "attention" } },
        },
      ],
    };
  }

  return {
    message: `已恢复 ${count} 个来源。`,
    actions: [
      {
        label: "查看当前来源状态",
        to: { path: "/sources/status", query: { themeId, impact, recent: recentOnly24h.value ? "24h" : undefined } },
      },
      {
        label: "查看最近24小时事件",
        to: { path: "/events", query: { themeId, impact, recent: "24h", sort: "occurredAt" } },
      },
    ],
  };
}

function buildSourceOperationNotice(action: "trigger" | "pause" | "resume", source: SourceStatus) {
  const impact =
    themeImpactTone({ type: source.themeType ?? "", latestEventSignal: source.latestEventSignal ?? null }) !== "neutral"
      ? themeImpactTone({ type: source.themeType ?? "", latestEventSignal: source.latestEventSignal ?? null })
      : undefined;

  if (action === "trigger") {
    return {
      message: `已为来源「${source.name}」入队运行。`,
      actions: [
        {
          label: "查看待运行来源",
          to: { path: "/sources/status", query: { focus: "pending", themeId: source.themeId, recent: "24h" } },
        },
        {
          label: "查看相关事件",
          to: { path: "/events", query: { themeId: source.themeId, impact, recent: "24h", sort: "occurredAt" } },
        },
        {
          label: "查看来源详情",
          to: { path: `/sources/${source.id}` },
        },
      ],
    };
  }

  if (action === "pause") {
    return {
      message: `已暂停来源「${source.name}」。`,
      actions: [
        {
          label: "查看当前主题来源状态",
          to: { path: "/sources/status", query: { themeId: source.themeId, focus: "all", recent: recentOnly24h.value ? "24h" : undefined } },
        },
        {
          label: "查看相关主题",
          to: { path: `/themes/${source.themeId}`, query: { section: "sources" } },
        },
        {
          label: "查看来源详情",
          to: { path: `/sources/${source.id}` },
        },
      ],
    };
  }

  return {
    message: `已恢复来源「${source.name}」。`,
    actions: [
      {
        label: "查看当前主题来源状态",
        to: { path: "/sources/status", query: { themeId: source.themeId, recent: recentOnly24h.value ? "24h" : undefined } },
      },
      {
        label: "查看相关事件",
        to: { path: "/events", query: { themeId: source.themeId, impact, recent: "24h", sort: "occurredAt" } },
      },
      {
        label: "查看来源详情",
        to: { path: `/sources/${source.id}` },
      },
    ],
  };
}

async function handleTrigger(sourceId: string) {
  pendingSourceId.value = sourceId;
  operationNotice.value = null;
  const source = sources.value.find((item) => item.id === sourceId);

  try {
    await triggerSourceRun(sourceId);
    await loadSources();
    if (source) {
      operationNotice.value = buildSourceOperationNotice("trigger", source);
    }
  } finally {
    pendingSourceId.value = null;
  }
}

async function handleBulkTriggerSources() {
  if (!effectiveBulkSourceIds.value.length) {
    return;
  }

  bulkUpdating.value = true;
  pendingBulkAction.value = "trigger";

  try {
    const ids = [...effectiveBulkSourceIds.value];
    await Promise.all(ids.map((sourceId) => triggerSourceRun(sourceId)));
    await loadSources();
    selectedSourceIds.value = [];
    operationNotice.value = buildBulkOperationNotice("trigger", ids.length);
  } finally {
    bulkUpdating.value = false;
    pendingBulkAction.value = "";
  }
}

async function handleBulkToggleSourcesPaused(isPaused: boolean) {
  if (!effectiveBulkSourceIds.value.length) {
    return;
  }

  bulkUpdating.value = true;
  pendingBulkAction.value = isPaused ? "pause" : "resume";

  try {
    const ids = [...effectiveBulkSourceIds.value];
    await Promise.all(ids.map((sourceId) => updateSourcePaused(sourceId, isPaused)));
    await loadSources();
    selectedSourceIds.value = [];
    operationNotice.value = buildBulkOperationNotice(isPaused ? "pause" : "resume", ids.length);
  } finally {
    bulkUpdating.value = false;
    pendingBulkAction.value = "";
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
  operationNotice.value = null;
  const source = sources.value.find((item) => item.id === sourceId);

  try {
    await updateSourcePaused(sourceId, isPaused);
    await loadSources();
    if (source) {
      operationNotice.value = buildSourceOperationNotice(isPaused ? "pause" : "resume", source);
    }
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

watch([focusFilter, themeFilter, impactFilter, recentOnly24h, sinceFilter], () => {
  if (selectedSourcePresetId.value && !matchesPresetFilters(selectedSourcePresetId.value)) {
    selectedSourcePresetId.value = "";
  }

  syncRouteQueryFromFilters();
});
</script>
