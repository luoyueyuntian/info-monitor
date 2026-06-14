<template>
  <div>
    <HomeInboxSummaryGrid
      :summary="dashboard.summary"
      :summary-delta-label="summaryDeltaLabel"
      :summary-delta-target="summaryDeltaTarget"
      :open-summary-delta="openSummaryDelta"
    />

    <HomeInboxDailySummaryCard
      v-if="dailySummary"
      :summary="dailySummary"
      class="mb-4"
    />

    <HomeInboxWeeklySummaryCard
      v-if="weeklySummary"
      :summary="weeklySummary"
      :delta="weeklyDelta"
      class="mb-4"
    />

    <HomeInboxDiagnosisCard
      title="今日诊断"
      priority-label="优先处理"
      :trend-summary="diagnosisTrendSummary"
      :diagnostic="inboxDiagnosis"
    />

    <HomeInboxDiagnosisCard
      title="长期观察"
      priority-label="重点对象"
      :diagnostic="longTermWatch"
    />

    <HomeInboxDiagnosisCard
      v-if="recentOperationDiagnostic"
      title="最近操作回响"
      priority-label="变化含义"
      :on-dismiss="dismissRecentOperation"
      :diagnostic="recentOperationDiagnostic"
    />

    <HomeInboxWorkspaceActionsCard :workspace="inboxWorkspaceActions" />

    <div class="grid items-start gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.95fr)]">
      <section class="grid content-start gap-4">
        <HomeInboxFocusToolbar />
        <HomeInboxEventSectionsList
          :sections="eventSections"
          :focused-section-id="focusedSectionId"
          :set-section-ref="setSectionRef"
          :event-header-tone-class="eventHeaderToneClass"
          :event-details="eventDetails"
        />
      </section>

      <aside class="grid content-start gap-4">
        <HomeInboxThemesPanelSection
          :themes="dashboard.themes"
          :theme-detail-target="themeDetailTarget"
        />

        <HomeInboxSourcesPanelSection
          :sources="dashboard.sources"
        />

        <HomeInboxBookmarkedEventsCard :events="dashboard.bookmarkedEvents" />
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, type ComponentPublicInstance, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import HomeInboxDailySummaryCard from "./HomeInboxDailySummaryCard.vue";
import HomeInboxWeeklySummaryCard from "./HomeInboxWeeklySummaryCard.vue";
import HomeInboxDiagnosisCard from "./HomeInboxDiagnosisCard.vue";
import HomeInboxBookmarkedEventsCard from "./HomeInboxBookmarkedEventsCard.vue";
import HomeInboxEventSectionsList from "./HomeInboxEventSectionsList.vue";
import HomeInboxFocusToolbar from "./HomeInboxFocusToolbar.vue";
import HomeInboxSourcesPanelSection from "./HomeInboxSourcesPanelSection.vue";
import HomeInboxSummaryGrid from "./HomeInboxSummaryGrid.vue";
import HomeInboxThemesPanelSection from "./HomeInboxThemesPanelSection.vue";
import HomeInboxWorkspaceActionsCard from "./HomeInboxWorkspaceActionsCard.vue";
import {
  buildDiagnosisTrendSummary,
  buildInboxDiagnosis,
  buildInboxSectionDigest,
  buildRecentOperationDiagnostic,
  buildSummaryDeltaTarget,
  buildSummaryDeltaMeaning,
  buildInboxWorkspaceActions,
  buildLongTermWatch,
} from "./home-inbox-model";
import {
  fetchDashboard,
  fetchDailySummary,
  fetchWeeklySummaryCompare,
  type DailySummary,
  type DashboardSummary,
  type EventSummary,
  type InboxSectionCounts,
  type SourceStatus,
  type ThemeSummary,
  type WeeklySummary,
  type WeeklySummaryCompare,
} from "../../../lib/api";
import { clearRecentEventOperation, loadRecentEventOperation } from "../../../lib/recent-event-operation";
import { toTimestamp } from "../../../lib/time";
import {
  eventSignalLabel,
  formatMaybeLabel,
} from "../../../lib/presentation";

const route = useRoute();
const router = useRouter();

const dailySummary = ref<DailySummary | null>(null);
const weeklySummary = ref<WeeklySummary | null>(null);
const weeklyDelta = ref<WeeklySummaryCompare["delta"]>(null);

const dashboard = reactive<{
  summary: DashboardSummary;
  events: EventSummary[];
  bookmarkedEvents: EventSummary[];
  sectionCounts: InboxSectionCounts;
  themes: ThemeSummary[];
  sources: SourceStatus[];
}>({
  summary: {
    activeThemes: 0,
    openEvents: 0,
    trackingEvents: 0,
    unreadEvents: 0,
    bookmarkedEvents: 0,
    recentEvents: 0,
    warningSources: 0,
    pendingSources: 0,
  },
  events: [],
  bookmarkedEvents: [],
  sectionCounts: {
    "price-signals": { total: 0, recent: 0 },
    "content-updates": { total: 0, recent: 0 },
    "official-releases": { total: 0, recent: 0 },
    "financial-events": { total: 0, recent: 0 },
  },
  themes: [],
  sources: [],
});
const sectionRefs = ref<Record<string, HTMLElement | null>>({});
const previousSnapshot = ref<{ capturedAt: string; summary: DashboardSummary } | null>(null);
const recentEventOperation = ref(loadRecentEventOperation());
const dashboardSummaryStorageKey = "info-monitor:dashboard-snapshot";

function setSectionRef(sectionId: string) {
  return (element: Element | ComponentPublicInstance | null) => {
    sectionRefs.value[sectionId] = element instanceof HTMLElement ? element : null;
  };
}

const focusedSectionId = computed(() => {
  const raw = route.query.focus;

  if (typeof raw !== "string") {
    return "";
  }

  if (raw === "events-price") {
    return "price-signals";
  }

  if (raw === "events-content") {
    return "content-updates";
  }

  if (raw === "events-official") {
    return "official-releases";
  }

  if (raw === "events-financial") {
    return "financial-events";
  }

  return "";
});

const recentEventsFilterEnabled = computed(() => route.query.recent === "24h" || route.query.recent === "true");
const eventStatusFilter = computed(() => {
  const status = route.query.status;

  if (typeof status !== "string") {
    return "";
  }

  if (["open", "tracking", "ignored"].includes(status)) {
    return status;
  }

  return "";
});

const eventListForDashboard = computed(() => {
  let events = dashboard.events;

  if (recentEventsFilterEnabled.value) {
    const threshold = Date.now() - 24 * 60 * 60 * 1000;
    events = events.filter((event) => toTimestamp(event.occurredAt) >= threshold);
  }

  if (eventStatusFilter.value) {
    events = events.filter((event) => (event.status ?? "open") === eventStatusFilter.value);
  }

  return events;
});

function parseStoredDashboardSnapshot(raw: string | null) {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as { capturedAt?: string; summary?: Partial<DashboardSummary> };
    const summary = parsed.summary;

    if (
      typeof parsed.capturedAt !== "string" ||
      !summary ||
      typeof summary.activeThemes !== "number" ||
      typeof summary.openEvents !== "number" ||
      typeof summary.trackingEvents !== "number" ||
      typeof summary.unreadEvents !== "number" ||
      typeof summary.bookmarkedEvents !== "number" ||
      typeof summary.recentEvents !== "number" ||
      typeof summary.warningSources !== "number" ||
      typeof summary.pendingSources !== "number"
    ) {
      return null;
    }

    return {
      capturedAt: parsed.capturedAt,
      summary: {
        activeThemes: summary.activeThemes,
        openEvents: summary.openEvents,
        trackingEvents: summary.trackingEvents,
        unreadEvents: summary.unreadEvents,
        bookmarkedEvents: summary.bookmarkedEvents,
        recentEvents: summary.recentEvents,
        warningSources: summary.warningSources,
        pendingSources: summary.pendingSources,
      } satisfies DashboardSummary,
    };
  } catch {
    return null;
  }
}

function rememberDashboardSummary(summary: DashboardSummary) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    dashboardSummaryStorageKey,
    JSON.stringify({
      capturedAt: new Date().toISOString(),
      summary,
    }),
  );
}

function loadPreviousDashboardSummary() {
  if (typeof window === "undefined") {
    return null;
  }

  return parseStoredDashboardSnapshot(window.localStorage.getItem(dashboardSummaryStorageKey));
}

function summaryDelta<K extends keyof DashboardSummary>(key: K) {
  if (!previousSnapshot.value) {
    return null;
  }

  return dashboard.summary[key] - previousSnapshot.value.summary[key];
}

function summaryDeltaLabel(key: keyof DashboardSummary) {
  const delta = summaryDelta(key);

  if (!delta) {
    return "";
  }

  const meaning = buildSummaryDeltaMeaning(
    dashboard.summary,
    previousSnapshot.value?.summary ?? null,
    key,
  );

  return `${delta > 0 ? `较上次 +${delta}` : `较上次 ${delta}`}${meaning ? ` · ${meaning}` : ""}`;
}

function summaryDeltaTarget(key: keyof DashboardSummary) {
  return buildSummaryDeltaTarget(
    dashboard.summary,
    previousSnapshot.value,
    key,
  );
}

function openSummaryDelta(key: keyof DashboardSummary) {
  const target = summaryDeltaTarget(key);

  if (!target) {
    return;
  }

  void router.push(target);
}

function dismissRecentOperation() {
  clearRecentEventOperation();
  recentEventOperation.value = null;
}

function scrollToSection(sectionId: string) {
  const node = sectionRefs.value[sectionId];

  if (!node) {
    return;
  }

  node.scrollIntoView({ behavior: "smooth", block: "start" });
}

function focusEventsSection() {
  const querySection = focusedSectionId.value;

  if (querySection) {
    void scrollToSection(querySection);
    return;
  }

  if (route.query.focus === "events-all") {
    const firstWithEvents = eventSections.value.find((section) => section.events.length > 0);

    if (firstWithEvents) {
      void scrollToSection(firstWithEvents.id);
    }
  }
}

function eventDetails(event: EventSummary) {
  const context = event.context ?? {};

  if (event.infoType === "price") {
    return [
      { label: "价格", value: formatMaybeLabel(context.price) },
      { label: "币种", value: formatMaybeLabel(context.currency) },
      { label: "规格", value: formatMaybeLabel(context.spec) },
    ];
  }

  if (event.infoType === "news_announcement") {
    return [
      { label: "主题", value: formatMaybeLabel(context.release_topic_label) },
      { label: "发布方", value: formatMaybeLabel(context.publisher) },
      { label: "类别", value: formatMaybeLabel(context.category) },
    ];
  }

  if (event.infoType === "content_update") {
    return [
      { label: "对象", value: formatMaybeLabel(context.object_name) },
      { label: "更新类型", value: formatMaybeLabel(context.update_type) },
      { label: "链接", value: formatMaybeLabel(context.url) },
    ];
  }

  if (event.infoType === "financial_event") {
    return [
      { label: "方向", value: eventSignalLabel(String(context.direction_label ?? "")) },
      { label: "公告号", value: formatMaybeLabel(context.announcement_no) },
      { label: "操作类型", value: formatMaybeLabel(context.operation_type) },
      { label: "金额", value: formatMaybeLabel(context.amount_billion_cny) },
      { label: "利率", value: formatMaybeLabel(context.rate_percent) },
    ];
  }

  return [];
}

function eventHeaderToneClass(event: EventSummary) {
  if (event.infoType === "price") {
    return "bg-tone-price";
  }

  if (event.infoType === "news_announcement") {
    return "bg-tone-news";
  }

  if (event.infoType === "financial_event") {
    return "bg-tone-financial";
  }

  return "bg-tone-content";
}

function themeDetailTarget(theme: ThemeSummary) {
  let section = "analysis";

  if ((theme.openEventCount ?? 0) > 0) {
    section = "events";
  } else if ((theme.unreadEventCount ?? 0) > 0 || (theme.bookmarkedEventCount ?? 0) > 0) {
    section = "events";
  } else if (theme.sourceHealth === "warning") {
    section = "sources";
  } else if (theme.type === "price") {
    section = "trend";
  }

  return {
    path: `/themes/${theme.id}`,
    query: { section },
  };
}

const eventSections = computed(() => [
  {
    id: "price-signals",
    title: "价格信号",
    description: "优先查看新低、价格异常和其他直接影响买入判断的信号。",
    events: eventListForDashboard.value.filter((event) => event.infoType === "price"),
  },
  {
    id: "content-updates",
    title: "内容更新",
    description: "查看产品更新、功能发布、活动页变化和其他内容类更新。",
    events: eventListForDashboard.value.filter((event) => event.infoType === "content_update"),
  },
  {
    id: "official-releases",
    title: "官方发布",
    description: "重点关注机构官方渠道的新公告、新发布和制度类更新。",
    events: eventListForDashboard.value.filter((event) => event.signal === "new_announcement"),
  },
  {
    id: "financial-events",
    title: "金融事件",
    description: "查看结构化的金融事件，例如公开市场业务公告及其方向标签。",
    events: eventListForDashboard.value.filter((event) => event.infoType === "financial_event"),
  },
].map((section) => {
  const visibleEvents = section.events.slice(0, 3);
  const sectionStats = dashboard.sectionCounts[section.id as keyof InboxSectionCounts];
  const totalCount = sectionStats?.total ?? section.events.length;
  const recentCount =
    sectionStats?.recent ??
    section.events.filter((event) => toTimestamp(event.occurredAt) >= Date.now() - 24 * 60 * 60 * 1000).length;
  const digest = buildInboxSectionDigest(section.id, section.events, recentCount, totalCount);

  return {
    ...section,
    visibleEvents,
    totalCount,
    recentCount,
    digest,
  };
}));

const diagnosisTrendSummary = computed(() =>
  buildDiagnosisTrendSummary(
    dashboard.summary,
    previousSnapshot.value?.summary ?? null,
  ),
);

const inboxDiagnosis = computed(() =>
  buildInboxDiagnosis(dashboard.summary, dashboard.themes, dashboard.sources, themeDetailTarget),
);

const longTermWatch = computed(() =>
  buildLongTermWatch(dashboard.themes, dashboard.bookmarkedEvents, themeDetailTarget),
);
const recentOperationDiagnostic = computed(() =>
  buildRecentOperationDiagnostic(recentEventOperation.value),
);

const inboxWorkspaceActions = computed(() =>
  buildInboxWorkspaceActions(dashboard.summary, dashboard.themes, dashboard.sources, dashboard.events),
);

onMounted(async () => {
  previousSnapshot.value = loadPreviousDashboardSummary();
  recentEventOperation.value = loadRecentEventOperation();

  const [data, summaryData, weeklyCompare] = await Promise.all([
    fetchDashboard(),
    fetchDailySummary(),
    fetchWeeklySummaryCompare().catch(() => null),
  ]);

  dailySummary.value = summaryData;
  if (weeklyCompare) {
    weeklySummary.value = weeklyCompare.thisWeek;
    weeklyDelta.value = weeklyCompare.delta;
  }

  dashboard.summary = data.summary;
  dashboard.events = data.events;
  dashboard.bookmarkedEvents = data.bookmarkedEvents ?? [];
  dashboard.sectionCounts = data.sectionCounts;
  dashboard.themes = data.themes;
  dashboard.sources = data.sources;
  rememberDashboardSummary(data.summary);

  await nextTick();
  focusEventsSection();
});

watch(
  () => route.query.focus,
  () => {
    void focusEventsSection();
  },
);
</script>
