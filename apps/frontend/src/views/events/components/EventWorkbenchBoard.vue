<template>
  <div>
    <EventWorkbenchFiltersPanel
      :presets="eventPresets"
      :active-preset-id="activePresetId"
      :filter-summary="filterSummary"
      :query="query"
      :theme-filter="themeFilter"
      :status-filter="statusFilter"
      :type-filter="typeFilter"
      :impact-filter="impactFilter"
      :read-filter="readFilter"
      :bookmark-filter="bookmarkFilter"
      :sort-by="sortBy"
      :recent-only24h="recentOnly24h"
      :since-filter="sinceFilter"
      :incremental-event-count="incrementalEventCount"
      :theme-options="themeOptions"
      :theme-context-label="themeContextLabel"
      :selected-count="selectedEventIds.length"
      :all-visible-selected="allVisibleSelected"
      :bulk-updating="bulkUpdating"
      :pending-bulk-status="pendingBulkStatus"
      :apply-preset="applyPreset"
      :reset-filters="resetFilters"
      :set-query="setQuery"
      :set-theme-filter="setThemeFilter"
      :set-status-filter="setStatusFilter"
      :set-type-filter="setTypeFilter"
      :set-impact-filter="setImpactFilter"
      :set-read-filter="setReadFilter"
      :set-bookmark-filter="setBookmarkFilter"
      :set-sort-by="setSortBy"
      :set-recent-only24h="setRecentOnly24h"
      :clear-since-filter="clearSinceFilter"
      :toggle-select-all-visible="toggleSelectAllVisible"
      :handle-bulk-update-status="handleBulkUpdateStatus"
      :handle-bulk-update-meta="handleBulkUpdateMeta"
    />

    <EventWorkbenchDiagnosticsCard :diagnostic="eventDiagnostics" />
    <EventFeedbackDiagnosticsCard
      v-if="feedbackAggregation"
      :aggregation="feedbackAggregation"
    />
    <EventWorkspaceActionsCard :workspace="eventWorkspaceActions" />
    <EventThemeBucketsCard :items="themeBuckets" :event-workbench-target="eventWorkbenchTarget" />

    <article
      v-if="operationNotice"
      class="rounded-[18px] border border-slate-400/15 bg-white/78 p-[18px] shadow-[0_12px_30px_rgba(15,23,42,0.05)]"
    >
      <strong class="block text-base font-semibold text-ink-heading">操作结果</strong>
      <div class="mt-2 text-ink-body">{{ operationNotice.message }}</div>
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

    <EventWorkbenchListCard
      :events="filteredEvents"
      :selected-event-ids="selectedEventIds"
      :saving-event-id="savingEventId"
      :pending-status="pendingStatus"
      :is-incremental-event="isIncrementalEvent"
      :toggle-event-selection="toggleEventSelection"
      :handle-update-status="handleUpdateStatus"
      :handle-update-meta="handleUpdateMeta"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { RouteLocationRaw } from "vue-router";

import EventFeedbackDiagnosticsCard from "./EventFeedbackDiagnosticsCard.vue";
import EventWorkbenchDiagnosticsCard from "./EventWorkbenchDiagnosticsCard.vue";
import EventWorkbenchFiltersPanel from "./EventWorkbenchFiltersPanel.vue";
import EventWorkbenchListCard from "./EventWorkbenchListCard.vue";
import EventThemeBucketsCard from "./EventThemeBucketsCard.vue";
import EventWorkspaceActionsCard from "./EventWorkspaceActionsCard.vue";
import { buildSingleEventOperationNotice } from "./event-operation-feedback";
import {
  buildEventDiagnostics,
  buildEventFilterSummary,
  buildEventThemeBuckets,
  buildEventThemeOptions,
  buildEventWorkspaceActions,
  filterWorkbenchEvents,
  type EventWorkbenchFilters,
} from "./event-workbench-model";
import {
  buildEventWorkbenchManagedQuery,
  eventWorkbenchManagedQueryKeys,
  matchesEventWorkbenchPreset,
  readEventWorkbenchRouteFilters,
} from "./event-workbench-query";
import { fetchEvents, fetchFeedbackAggregation, type FeedbackAggregation, type EventSummary, updateEvent, updateEventStatus } from "../../../lib/api";
import { sameQuery } from "../../../lib/query";
import { recordRecentEventOperation } from "../../../lib/recent-event-operation";
import { toTimestamp } from "../../../lib/time";
import {
  eventStatusLabel,
  formatSmartDateTimeLabel,
  themeTypeLabel,
} from "../../../lib/presentation";

const events = ref<EventSummary[]>([]);
const feedbackAggregation = ref<FeedbackAggregation | null>(null);
const query = ref("");
const themeFilter = ref("all");
const statusFilter = ref("all");
const typeFilter = ref("all");
const impactFilter = ref("all");
const readFilter = ref("all");
const bookmarkFilter = ref("all");
const sortBy = ref("occurredAt");
const recentOnly24h = ref(false);
const sinceFilter = ref("");
const selectedPresetId = ref("");
const route = useRoute();
const router = useRouter();
const selectedEventIds = ref<string[]>([]);
const savingEventId = ref("");
const pendingStatus = ref("");
const bulkUpdating = ref(false);
const pendingBulkStatus = ref("");
const operationNotice = ref<{
  message: string;
  actions: Array<{ label: string; to: RouteLocationRaw }>;
} | null>(null);
const eventPresets = [
  { id: "all", label: "全部事件", filters: { query: "", theme: "all", status: "all", type: "all", sort: "occurredAt", recent: false } },
  { id: "open", label: "待处理", filters: { query: "", theme: "all", status: "open", type: "all", sort: "occurredAt", recent: false } },
  { id: "tracking", label: "关注中", filters: { query: "", theme: "all", status: "tracking", type: "all", sort: "occurredAt", recent: false } },
  { id: "ignored", label: "已忽略", filters: { query: "", theme: "all", status: "ignored", type: "all", sort: "occurredAt", recent: false } },
  { id: "positive", label: "偏利好", filters: { query: "", theme: "all", status: "all", type: "all", impact: "positive", sort: "occurredAt", recent: false } },
  { id: "negative", label: "偏利空", filters: { query: "", theme: "all", status: "all", type: "all", impact: "negative", sort: "occurredAt", recent: false } },
  { id: "unread", label: "未读", filters: { query: "", theme: "all", status: "all", type: "all", read: "unread", bookmark: "all", sort: "occurredAt", recent: false } },
  { id: "bookmarked", label: "已收藏", filters: { query: "", theme: "all", status: "all", type: "all", read: "all", bookmark: "bookmarked", sort: "bookmarkedAt", recent: false } },
  { id: "recent-open", label: "24h 待处理", filters: { query: "", theme: "all", status: "open", type: "all", sort: "statusChanged", recent: true } },
] as const;

function setQuery(value: string) {
  query.value = value;
}

function setThemeFilter(value: string) {
  themeFilter.value = value;
}

function setStatusFilter(value: string) {
  statusFilter.value = value;
}

function setTypeFilter(value: string) {
  typeFilter.value = value;
}

function setImpactFilter(value: string) {
  impactFilter.value = value;
}

function setReadFilter(value: string) {
  readFilter.value = value;
}

function setBookmarkFilter(value: string) {
  bookmarkFilter.value = value;
}

function setSortBy(value: string) {
  sortBy.value = value;
}

function setRecentOnly24h(value: boolean) {
  recentOnly24h.value = value;
}

function clearSinceFilter() {
  sinceFilter.value = "";
}

function syncRouteQueryFromFilters() {
  const nextManagedQuery = buildEventWorkbenchManagedQuery(activeFilters.value);
  const currentManagedQuery = buildEventWorkbenchManagedQuery(
    readEventWorkbenchRouteFilters(route.query, themeOptions.value, (value) => toTimestamp(value) > 0),
  );

  if (sameQuery(nextManagedQuery, currentManagedQuery)) {
    return;
  }

  const preservedEntries = Object.entries(route.query).filter(([key]) => !eventWorkbenchManagedQueryKeys.includes(key as never));
  const preservedQuery = Object.fromEntries(preservedEntries);

  void router.replace({
    query: {
      ...preservedQuery,
      ...nextManagedQuery,
    },
  });
}

function applyRouteFilters() {
  const nextFilters = readEventWorkbenchRouteFilters(route.query, themeOptions.value, (value) => toTimestamp(value) > 0);
  query.value = nextFilters.query;
  statusFilter.value = nextFilters.statusFilter;
  themeFilter.value = nextFilters.themeFilter;
  typeFilter.value = nextFilters.typeFilter;
  impactFilter.value = nextFilters.impactFilter;
  readFilter.value = nextFilters.readFilter;
  bookmarkFilter.value = nextFilters.bookmarkFilter;
  sortBy.value = nextFilters.sortBy;
  recentOnly24h.value = nextFilters.recentOnly24h;
  sinceFilter.value = nextFilters.sinceFilter;
}

function applyPreset(presetId: string) {
  const preset = eventPresets.find((item) => item.id === presetId);

  if (!preset) {
    return;
  }

  query.value = preset.filters.query;
  themeFilter.value = preset.filters.theme;
  statusFilter.value = preset.filters.status;
  typeFilter.value = preset.filters.type;
  impactFilter.value = "impact" in preset.filters ? preset.filters.impact : "all";
  readFilter.value = "read" in preset.filters ? preset.filters.read : "all";
  bookmarkFilter.value = "bookmark" in preset.filters ? preset.filters.bookmark : "all";
  sortBy.value = preset.filters.sort;
  recentOnly24h.value = preset.filters.recent;
  sinceFilter.value = "";
  selectedPresetId.value = preset.id;
}

function resetFilters() {
  query.value = "";
  statusFilter.value = "all";
  themeFilter.value = "all";
  typeFilter.value = "all";
  impactFilter.value = "all";
  readFilter.value = "all";
  bookmarkFilter.value = "all";
  sortBy.value = "occurredAt";
  recentOnly24h.value = false;
  sinceFilter.value = "";
  selectedPresetId.value = "";
  selectedEventIds.value = [];
}

function matchesPreset(presetId: string) {
  return matchesEventWorkbenchPreset(presetId, eventPresets, activeFilters.value);
}

const activePresetId = computed(() => {
  if (!selectedPresetId.value) {
    return "";
  }

  return matchesPreset(selectedPresetId.value) ? selectedPresetId.value : "";
});

const activeFilters = computed<EventWorkbenchFilters>(() => ({
  query: query.value,
  themeFilter: themeFilter.value,
  statusFilter: statusFilter.value,
  typeFilter: typeFilter.value,
  impactFilter: impactFilter.value,
  readFilter: readFilter.value,
  bookmarkFilter: bookmarkFilter.value,
  sortBy: sortBy.value,
  recentOnly24h: recentOnly24h.value,
  sinceFilter: sinceFilter.value,
}));

const themeOptions = computed(() => buildEventThemeOptions(events.value));
const themeContextLabel = computed(() => {
  if (themeFilter.value === "all" || !themeFilter.value.includes(",")) {
    return "";
  }

  const ids = themeFilter.value.split(",").map((item) => item.trim()).filter(Boolean);
  return `当前 ${ids.length} 个主题`;
});

const allVisibleSelected = computed(() => {
  if (!filteredEvents.value.length) {
    return false;
  }

  return filteredEvents.value.every((event) => selectedEventIds.value.includes(event.id));
});

const filteredEvents = computed(() => filterWorkbenchEvents(events.value, activeFilters.value));

const eventDiagnostics = computed(() =>
  buildEventDiagnostics(filteredEvents.value, eventStatusLabel),
);
const eventWorkspaceActions = computed(() => buildEventWorkspaceActions(filteredEvents.value, activeFilters.value));

const incrementalEventCount = computed(() => filteredEvents.value.filter((event) => isIncrementalEvent(event)).length);

const themeBuckets = computed(() => buildEventThemeBuckets(filteredEvents.value));

const filterSummary = computed(() =>
  buildEventFilterSummary(
    activeFilters.value,
    themeOptions.value,
    eventStatusLabel,
    themeTypeLabel,
    formatSmartDateTimeLabel,
  ),
);

function toggleEventSelection(eventId: string) {
  if (selectedEventIds.value.includes(eventId)) {
    selectedEventIds.value = selectedEventIds.value.filter((id) => id !== eventId);
    return;
  }

  selectedEventIds.value = [...selectedEventIds.value, eventId];
}

function isIncrementalEvent(event: EventSummary) {
  if (!sinceFilter.value) {
    return false;
  }

  const sinceTimestamp = toTimestamp(sinceFilter.value);
  const latestRelevantAt = Math.max(toTimestamp(event.latestStatusChangedAt), toTimestamp(event.occurredAt));
  return latestRelevantAt >= sinceTimestamp;
}

function toggleSelectAllVisible(event: Event) {
  const checked = (event.target as HTMLInputElement | null)?.checked ?? false;
  const visibleIds = filteredEvents.value.map((item) => item.id);

  if (checked) {
    selectedEventIds.value = Array.from(new Set([...selectedEventIds.value, ...visibleIds]));
    return;
  }

  selectedEventIds.value = selectedEventIds.value.filter((id) => !visibleIds.includes(id));
}

function buildOperationNotice(action: "open" | "tracking" | "ignored" | "read" | "unread" | "bookmark" | "unbookmark", count: number) {
  const themeId = themeFilter.value === "all" ? undefined : themeFilter.value;
  const impact = impactFilter.value === "all" ? undefined : impactFilter.value;

  if (action === "open" || action === "tracking" || action === "ignored") {
    const statusLabel = action === "open" ? "待处理" : action === "tracking" ? "关注中" : "已忽略";
    return {
      message: `已将 ${count} 条事件批量标记为${statusLabel}。`,
      actions: [
        { label: `查看${statusLabel}事件`, to: { path: "/events", query: { themeId, impact, status: action, sort: action === "open" ? "statusChanged" : "occurredAt" } } },
        { label: "查看主题中心", to: { path: "/themes", query: { impact, queue: action === "ignored" ? "ignored" : action, sort: "attention" } } },
        { label: "回到事件工作台", to: { path: "/events", query: buildEventWorkbenchManagedQuery(activeFilters.value) } },
      ],
    };
  }

  if (action === "read" || action === "unread") {
    const readValue = action === "read" ? "read" : "unread";
    const label = action === "read" ? "已读" : "未读";

    return {
      message: `已将 ${count} 条事件批量标记为${label}。`,
      actions: [
        { label: `查看${label}事件`, to: { path: "/events", query: { themeId, impact, read: readValue, sort: "occurredAt" } } },
        { label: action === "read" ? "查看观察清单" : "查看主题中心", to: action === "read" ? { path: "/watchlist" } : { path: "/themes", query: { impact, queue: "unread", sort: "attention" } } },
        { label: "回到事件工作台", to: { path: "/events", query: buildEventWorkbenchManagedQuery(activeFilters.value) } },
      ],
    };
  }

  if (action === "bookmark" || action === "unbookmark") {
    return {
      message: action === "bookmark" ? `已将 ${count} 条事件加入收藏。` : `已将 ${count} 条事件取消收藏。`,
      actions: [
        action === "bookmark"
          ? { label: "查看收藏事件", to: { path: "/events", query: { themeId, impact, bookmark: "bookmarked", sort: "bookmarkedAt" } } }
          : { label: "查看事件工作台", to: { path: "/events", query: buildEventWorkbenchManagedQuery(activeFilters.value) } },
        action === "bookmark"
          ? { label: "查看观察清单", to: { path: "/watchlist" } }
          : { label: "查看主题中心", to: { path: "/themes", query: { impact, sort: "attention" } } },
        { label: "回到事件工作台", to: { path: "/events", query: buildEventWorkbenchManagedQuery(activeFilters.value) } },
      ],
    };
  }

  return null;
}

async function handleUpdateStatus(eventId: string, status: string) {
  savingEventId.value = eventId;
  pendingStatus.value = status;
  operationNotice.value = null;

  try {
    const currentEvent = events.value.find((event) => event.id === eventId);
    await updateEventStatus(eventId, status);
    events.value = events.value.map((event) => (event.id === eventId ? { ...event, status } : event));
    if (currentEvent) {
      recordRecentEventOperation({
        action: status as "open" | "tracking" | "ignored",
        count: 1,
        eventTitle: currentEvent.title,
        infoType: currentEvent.infoType,
        themeId: currentEvent.themeId,
        themeName: currentEvent.themeName,
      });
      operationNotice.value = buildSingleEventOperationNotice(
        { ...currentEvent, status },
        status as "open" | "tracking" | "ignored",
      );
    }
  } finally {
    savingEventId.value = "";
    pendingStatus.value = "";
  }
}

async function handleUpdateMeta(
  eventId: string,
  input: {
    isRead?: boolean;
    isBookmarked?: boolean;
  },
  pendingKey: string,
) {
  savingEventId.value = eventId;
  pendingStatus.value = pendingKey;
  operationNotice.value = null;

  try {
    const currentEvent = events.value.find((event) => event.id === eventId);
    const updated = await updateEvent(eventId, input);
    events.value = events.value.map((event) =>
      event.id === eventId
        ? { ...event, isRead: updated.isRead, isBookmarked: updated.isBookmarked, bookmarkedAt: updated.bookmarkedAt }
        : event,
    );
    if (currentEvent) {
      recordRecentEventOperation({
        action:
          typeof input.isBookmarked === "boolean"
            ? input.isBookmarked
              ? "bookmark"
              : "unbookmark"
            : input.isRead
              ? "read"
              : "unread",
        count: 1,
        eventTitle: currentEvent.title,
        infoType: currentEvent.infoType,
        themeId: currentEvent.themeId,
        themeName: currentEvent.themeName,
      });
      operationNotice.value = buildSingleEventOperationNotice(
        {
          ...currentEvent,
          isRead: updated.isRead,
          isBookmarked: updated.isBookmarked,
          bookmarkedAt: updated.bookmarkedAt,
        },
        typeof input.isBookmarked === "boolean"
          ? input.isBookmarked
            ? "bookmark"
            : "unbookmark"
          : input.isRead
            ? "read"
            : "unread",
      );
    }
  } finally {
    savingEventId.value = "";
    pendingStatus.value = "";
  }
}

function eventWorkbenchTarget(themeId: string, status: string) {
  return {
    path: "/events",
    query: {
      ...buildEventWorkbenchManagedQuery(
        readEventWorkbenchRouteFilters(route.query, themeOptions.value, (value) => toTimestamp(value) > 0),
      ),
      themeId,
      status: status === "all" ? undefined : status,
    },
  };
}

async function handleBulkUpdateStatus(status: string) {
  if (!selectedEventIds.value.length) {
    return;
  }

  bulkUpdating.value = true;
  pendingBulkStatus.value = status;
  operationNotice.value = null;

  try {
    const ids = [...selectedEventIds.value];
    await Promise.all(ids.map((eventId) => updateEventStatus(eventId, status)));
    events.value = events.value.map((event) =>
      ids.includes(event.id) ? { ...event, status } : event,
    );
    selectedEventIds.value = [];
    operationNotice.value = buildOperationNotice(status as "open" | "tracking" | "ignored", ids.length);
  } finally {
    bulkUpdating.value = false;
    pendingBulkStatus.value = "";
  }
}

async function handleBulkUpdateMeta(
  input: {
    isRead?: boolean;
    isBookmarked?: boolean;
  },
  pendingKey: string,
) {
  if (!selectedEventIds.value.length) {
    return;
  }

  bulkUpdating.value = true;
  pendingBulkStatus.value = pendingKey;
  operationNotice.value = null;

  try {
    const ids = [...selectedEventIds.value];
    await Promise.all(ids.map((eventId) => updateEvent(eventId, input)));
    events.value = events.value.map((event) =>
      ids.includes(event.id)
        ? {
            ...event,
            isRead: typeof input.isRead === "boolean" ? input.isRead : event.isRead,
            isBookmarked: typeof input.isBookmarked === "boolean" ? input.isBookmarked : event.isBookmarked,
            bookmarkedAt:
              typeof input.isBookmarked === "boolean"
                ? input.isBookmarked
                  ? new Date().toISOString()
                  : null
                : event.bookmarkedAt,
          }
        : event,
    );
    selectedEventIds.value = [];
    operationNotice.value = buildOperationNotice(pendingKey as "read" | "unread" | "bookmark" | "unbookmark", ids.length);
  } finally {
    bulkUpdating.value = false;
    pendingBulkStatus.value = "";
  }
}

onMounted(async () => {
  const [eventsData, aggregationData] = await Promise.all([
    fetchEvents(),
    fetchFeedbackAggregation(),
  ]);

  events.value = eventsData;
  feedbackAggregation.value = aggregationData;
  applyRouteFilters();
});

watch(
  () => route.query,
  () => {
    applyRouteFilters();
  },
);

watch([query, themeFilter, statusFilter, typeFilter, impactFilter, readFilter, bookmarkFilter, sortBy, recentOnly24h, sinceFilter], () => {
  if (selectedPresetId.value && !matchesPreset(selectedPresetId.value)) {
    selectedPresetId.value = "";
  }

  syncRouteQueryFromFilters();
});
</script>
