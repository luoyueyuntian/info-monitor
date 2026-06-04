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
      :read-filter="readFilter"
      :bookmark-filter="bookmarkFilter"
      :sort-by="sortBy"
      :recent-only24h="recentOnly24h"
      :since-filter="sinceFilter"
      :incremental-event-count="incrementalEventCount"
      :theme-options="themeOptions"
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
    <EventThemeBucketsCard :items="themeBuckets" :event-workbench-target="eventWorkbenchTarget" />
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

import EventWorkbenchDiagnosticsCard from "./EventWorkbenchDiagnosticsCard.vue";
import EventWorkbenchFiltersPanel from "./EventWorkbenchFiltersPanel.vue";
import EventWorkbenchListCard from "./EventWorkbenchListCard.vue";
import EventThemeBucketsCard from "./EventThemeBucketsCard.vue";
import {
  buildEventDiagnostics,
  buildEventFilterSummary,
  buildEventThemeBuckets,
  buildEventThemeOptions,
  filterWorkbenchEvents,
  type EventWorkbenchFilters,
} from "./event-workbench-model";
import {
  buildEventWorkbenchManagedQuery,
  eventWorkbenchManagedQueryKeys,
  matchesEventWorkbenchPreset,
  readEventWorkbenchRouteFilters,
} from "./event-workbench-query";
import { fetchEvents, type EventSummary, updateEvent, updateEventStatus } from "../../../lib/api";
import { sameQuery } from "../../../lib/query";
import { toTimestamp } from "../../../lib/time";
import {
  eventStatusLabel,
  formatSmartDateTimeLabel,
  themeTypeLabel,
} from "../../../lib/presentation";

const events = ref<EventSummary[]>([]);
const query = ref("");
const themeFilter = ref("all");
const statusFilter = ref("all");
const typeFilter = ref("all");
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
const eventPresets = [
  { id: "all", label: "全部事件", filters: { query: "", theme: "all", status: "all", type: "all", sort: "occurredAt", recent: false } },
  { id: "open", label: "待处理", filters: { query: "", theme: "all", status: "open", type: "all", sort: "occurredAt", recent: false } },
  { id: "tracking", label: "关注中", filters: { query: "", theme: "all", status: "tracking", type: "all", sort: "occurredAt", recent: false } },
  { id: "ignored", label: "已忽略", filters: { query: "", theme: "all", status: "ignored", type: "all", sort: "occurredAt", recent: false } },
  { id: "unread", label: "未读", filters: { query: "", theme: "all", status: "all", type: "all", read: "unread", bookmark: "all", sort: "occurredAt", recent: false } },
  { id: "bookmarked", label: "已收藏", filters: { query: "", theme: "all", status: "all", type: "all", read: "all", bookmark: "bookmarked", sort: "statusChanged", recent: false } },
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
  readFilter: readFilter.value,
  bookmarkFilter: bookmarkFilter.value,
  sortBy: sortBy.value,
  recentOnly24h: recentOnly24h.value,
  sinceFilter: sinceFilter.value,
}));

const themeOptions = computed(() => buildEventThemeOptions(events.value));

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

async function handleUpdateStatus(eventId: string, status: string) {
  savingEventId.value = eventId;
  pendingStatus.value = status;

  try {
    await updateEventStatus(eventId, status);
    events.value = events.value.map((event) => (event.id === eventId ? { ...event, status } : event));
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

  try {
    const updated = await updateEvent(eventId, input);
    events.value = events.value.map((event) =>
      event.id === eventId
        ? { ...event, isRead: updated.isRead, isBookmarked: updated.isBookmarked }
        : event,
    );
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

  try {
    const ids = [...selectedEventIds.value];
    await Promise.all(ids.map((eventId) => updateEventStatus(eventId, status)));
    events.value = events.value.map((event) =>
      ids.includes(event.id) ? { ...event, status } : event,
    );
    selectedEventIds.value = [];
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

  try {
    const ids = [...selectedEventIds.value];
    await Promise.all(ids.map((eventId) => updateEvent(eventId, input)));
    events.value = events.value.map((event) =>
      ids.includes(event.id)
        ? {
            ...event,
            isRead: typeof input.isRead === "boolean" ? input.isRead : event.isRead,
            isBookmarked: typeof input.isBookmarked === "boolean" ? input.isBookmarked : event.isBookmarked,
          }
        : event,
    );
    selectedEventIds.value = [];
  } finally {
    bulkUpdating.value = false;
    pendingBulkStatus.value = "";
  }
}

onMounted(async () => {
  events.value = await fetchEvents();
  applyRouteFilters();
});

watch(
  () => route.query,
  () => {
    applyRouteFilters();
  },
);

watch([query, themeFilter, statusFilter, typeFilter, readFilter, bookmarkFilter, sortBy, recentOnly24h, sinceFilter], () => {
  if (selectedPresetId.value && !matchesPreset(selectedPresetId.value)) {
    selectedPresetId.value = "";
  }

  syncRouteQueryFromFilters();
});
</script>
