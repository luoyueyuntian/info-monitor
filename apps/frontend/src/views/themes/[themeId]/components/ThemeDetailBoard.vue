<template>
  <section v-if="detail">
    <ThemeDetailHeader
      :theme-name="detail.theme.name"
      :theme-type="detail.theme.type"
      :source-count="detail.sources.length"
      :event-count="detail.events.length"
      :on-back="handleBack"
    />

    <ThemeDetailActionsBar
      :running-all-sources="runningAllSources"
      :saving-theme-archive="savingThemeArchive"
      :theme-status="detail.theme.status"
      :show-edit-theme-form="showEditThemeForm"
      :show-add-source-form="showAddSourceForm"
      :deleting-theme="deletingTheme"
      :handle-run-all-sources="handleRunAllSources"
      :handle-toggle-theme-archived="handleToggleThemeArchived"
      :toggle-edit-theme-form="toggleEditThemeForm"
      :toggle-add-source-form="toggleAddSourceForm"
      :handle-delete-theme="handleDeleteTheme"
    />

    <ThemeDetailSectionNav :scroll-to-named-section="scrollToNamedSection" />

    <ThemeDetailNoticeCard
      v-if="statusBanner"
      :title="statusBanner.title"
      :body="statusBanner.body"
    />

    <ThemeDetailNoticeCard
      v-if="operationMessage"
      title="操作结果"
      :body="operationMessage.message"
      :actions="operationMessage.actions"
    />

    <div :ref="setSectionRef('analysis')">
      <ThemeDetailAnalysisCard
        :analysis="detail.analysis"
        :analysis-tone-label="analysisToneLabel"
        :review-actions="analysisReviewActions"
      />
    </div>

    <div v-if="detail.marketOverview">
      <ThemeDetailMarketOverviewCard :market-overview="detail.marketOverview" />
    </div>

    <div v-if="marketStructureTrendData">
      <ThemeDetailMarketStructureCard :data="marketStructureTrendData" />
    </div>

    <ThemeDetailEventQueueCard
      :theme-id="detail.theme.id"
      :theme-type="detail.theme.type"
      :events="detail.events"
      :saving-event-id="savingEventId"
      :pending-event-status="pendingEventStatus"
      :handle-update-status="handleUpdateThemeEventStatus"
      :handle-update-meta="handleUpdateThemeEventMeta"
    />

    <ThemeDetailEditThemeFormCard
      v-if="showEditThemeForm"
      :saving="savingTheme"
      :status-message="themeFormStatus"
      :theme="{
        name: detail.theme.name,
        description: detail.theme.description,
        status: detail.theme.status,
      }"
      @submit="handleSaveTheme"
    />

    <ThemeDetailAddSourceFormCard
      v-if="showAddSourceForm"
      :saving="addingSource"
      :status-message="sourceFormStatus"
      :info-type="detail.theme.infoType"
      @submit="handleAddSource"
    />

    <ThemeDetailStatsGrid
      :theme-type="detail.theme.type"
      :record-count="detail.records.length"
      :source-count="detail.sources.length"
      :event-count="detail.events.length"
    />

    <div
      :ref="setSectionRef('trend')"
      v-if="detail.theme.type === 'price' ? priceTrendPoints.length > 1 : eventActivityBars.length > 0"
    >
      <ThemeDetailTrendCard
        :theme-type="detail.theme.type"
        :price-trend-points="priceTrendPoints"
        :price-trend-polyline="priceTrendPolyline"
        :price-trend-min="priceTrendMin"
        :price-trend-max="priceTrendMax"
        :price-trend-latest="priceTrendLatest"
        :price-vs-min-label="priceVsMinLabel"
        :price-vs-max-label="priceVsMaxLabel"
        :price-range-label="priceRangeLabel"
        :event-activity-bars="eventActivityBars"
      />
    </div>

    <div v-if="detail.breakdown" :ref="setSectionRef('breakdown')">
      <ThemeDetailBreakdownCard
        :breakdown="detail.breakdown"
        :bar-items="breakdownBarItems"
      />
    </div>

    <div :ref="setSectionRef('compare')">
      <ThemeDetailSourceCompareCard :compare="sourceCompareData" />
    </div>

    <div v-if="continuousSnapshotData" :ref="setSectionRef('continuous-snapshot')">
      <ThemeDetailContinuousSnapshotCard :data="continuousSnapshotData" />
    </div>

    <div v-if="financialRhythmData" :ref="setSectionRef('financial-rhythm')">
      <ThemeDetailFinancialRhythmCard :data="financialRhythmData" />
    </div>

    <div :ref="setSectionRef('weekly-review')">
      <ThemeDetailWeeklyReviewCard :theme-id="detail.theme.id" />
    </div>

    <div class="grid two">
      <div :ref="setSectionRef('events')">
        <ThemeDetailRecentEventsCard :theme-id="detail.theme.id" :events="detail.events" />
      </div>

      <div :ref="setSectionRef('sources')">
        <ThemeDetailSourcesCard
          :theme-id="detail.theme.id"
          :sources="detail.sources"
          :on-toggle-source-paused="handleToggleSourcePaused"
          :on-delete-source="handleDeleteSource"
          :on-save-source="handleSaveSource"
        />
      </div>
    </div>

    <div :ref="setSectionRef('records')">
      <ThemeDetailRecordsCard
        :records="detail.records"
        :record-details="recordDetails"
        :record-link="recordLink"
      />
    </div>

    <div :ref="setSectionRef('timeline')">
      <ThemeDetailTimelineCard
        :timeline="detail.timeline"
        :format-timeline-kind-label="formatTimelineKindLabel"
        :timeline-item-class="timelineItemClass"
        :timeline-meta="timelineMeta"
      />
    </div>

    <div :ref="setSectionRef('review-note')">
      <ThemeDetailReviewNoteCard :theme-id="detail.theme.id" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, type ComponentPublicInstance, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { RouteLocationRaw } from "vue-router";

import ThemeDetailAnalysisCard from "./ThemeDetailAnalysisCard.vue";
import ThemeDetailAddSourceFormCard from "./ThemeDetailAddSourceFormCard.vue";
import ThemeDetailActionsBar from "./ThemeDetailActionsBar.vue";
import ThemeDetailBreakdownCard from "./ThemeDetailBreakdownCard.vue";
import ThemeDetailReviewNoteCard from "./ThemeDetailReviewNoteCard.vue";
import ThemeDetailEditThemeFormCard from "./ThemeDetailEditThemeFormCard.vue";
import ThemeDetailEventQueueCard from "./ThemeDetailEventQueueCard.vue";
import ThemeDetailHeader from "./ThemeDetailHeader.vue";
import ThemeDetailMarketOverviewCard from "./ThemeDetailMarketOverviewCard.vue";
import ThemeDetailMarketStructureCard from "./ThemeDetailMarketStructureCard.vue";
import ThemeDetailNoticeCard from "./ThemeDetailNoticeCard.vue";
import ThemeDetailRecentEventsCard from "./ThemeDetailRecentEventsCard.vue";
import ThemeDetailRecordsCard from "./ThemeDetailRecordsCard.vue";
import ThemeDetailSectionNav from "./ThemeDetailSectionNav.vue";
import ThemeDetailSourceCompareCard from "./ThemeDetailSourceCompareCard.vue";
import ThemeDetailContinuousSnapshotCard from "./ThemeDetailContinuousSnapshotCard.vue";
import ThemeDetailFinancialRhythmCard from "./ThemeDetailFinancialRhythmCard.vue";
import ThemeDetailStatsGrid from "./ThemeDetailStatsGrid.vue";
import ThemeDetailSourcesCard from "./ThemeDetailSourcesCard.vue";
import ThemeDetailTimelineCard from "./ThemeDetailTimelineCard.vue";
import ThemeDetailTrendCard from "./ThemeDetailTrendCard.vue";
import ThemeDetailWeeklyReviewCard from "./ThemeDetailWeeklyReviewCard.vue";
import { buildSingleEventOperationNotice } from "../../../events/components/event-operation-feedback";
import { buildStockReportReturnQuery } from "../../../../lib/stock-market-report-navigation";
import { buildThemeDetailAnalysisActions } from "./theme-detail-analysis-actions";
import { buildThemeSourceCompareData, buildContinuousSnapshotCompareData } from "./theme-detail-source-compare";
import { buildFinancialRhythmData } from "./theme-detail-financial-rhythm";
import { buildMarketStructureTrendData } from "./theme-detail-market-structure";
import { recordRecentEventOperation } from "../../../../lib/recent-event-operation";
import {
  createSource,
  deleteSource,
  deleteTheme,
  fetchThemeDetail,
  triggerSourceRun,
  type ThemeDetail,
  type ThemeRecord,
  updateEvent,
  updateEventStatus,
  updateTheme,
  updateSource,
  updateSourcePaused,
} from "../../../../lib/api";
import {
  eventSignalLabel,
  eventStatusLabel,
  formatMaybeLabel,
  runStatusLabel,
  timelineKindLabel as formatTimelineKindLabel,
} from "../../../../lib/presentation";

const route = useRoute();
const router = useRouter();
const detail = ref<ThemeDetail | null>(null);
const sectionRefs = ref<Record<string, HTMLElement | null>>({});
const runningAllSources = ref(false);
const savingEventId = ref<string | null>(null);
const pendingEventStatus = ref("");
const showEditThemeForm = ref(false);
const savingThemeArchive = ref(false);
const savingTheme = ref(false);
const deletingTheme = ref(false);
const showAddSourceForm = ref(false);
const addingSource = ref(false);
const sourceFormStatus = ref("");
const operationMessage = ref<{
  message: string;
  actions: Array<{ label: string; to: RouteLocationRaw }>;
} | null>(null);
const themeFormStatus = ref("");
const isStockMarketWorkspace = computed(() => String(route.params.workspaceId ?? "") === "stock-market");
const stockMarketInvestigationActions = computed<Array<{ label: string; to: RouteLocationRaw }>>(() => {
  if (!detail.value || !isStockMarketWorkspace.value) {
    return [];
  }

  const actions: Array<{ label: string; to: RouteLocationRaw }> = [
    { label: "查看动作台", to: `/workspace/stock-market/actions` },
    { label: "查看来源控制台", to: `/workspace/stock-market/sources` },
  ];

  if (detail.value.marketOverview) {
    actions.unshift({ label: "查看收盘概览", to: { path: "/workspace/stock-market/reports", query: { focus: "snapshot", date: typeof route.query.reportDate === "string" ? route.query.reportDate : undefined } } });
    actions.push({ label: "查看连续复盘", to: { path: "/workspace/stock-market/reports", query: { focus: "evolution", date: typeof route.query.reportDate === "string" ? route.query.reportDate : undefined } } });
    return actions;
  }

  if (detail.value.theme.type === "news_announcement") {
    actions.unshift({ label: "查看公告线索", to: { path: "/workspace/stock-market/reports", query: { focus: "announcements", date: typeof route.query.reportDate === "string" ? route.query.reportDate : undefined } } });
    actions.push({ label: "查看催化归并", to: { path: "/workspace/stock-market/reports", query: { focus: "catalysts", date: typeof route.query.reportDate === "string" ? route.query.reportDate : undefined } } });
    return actions;
  }

  actions.unshift({ label: "查看重点异动对象", to: { path: "/workspace/stock-market/reports", query: { focus: "movers", date: typeof route.query.reportDate === "string" ? route.query.reportDate : undefined } } });
  actions.push({ label: "查看来源线索", to: { path: "/workspace/stock-market/reports", query: { focus: "source-clues", date: typeof route.query.reportDate === "string" ? route.query.reportDate : undefined } } });
  return actions;
});
const stockMarketThemeContextSummary = computed(() => {
  if (!detail.value) {
    return "";
  }

  if (detail.value.marketOverview) {
    return "这是股市工作区里的核心复盘主题，适合优先结合市场总览、板块资金流、重点异动对象和连续复盘一起看。";
  }

  if (detail.value.theme.type === "news_announcement") {
    return "这个主题更像公告和线索资产，适合作为盘后报告里异动对象的解释来源，而不是单独脱离市场总览来看。";
  }

  return "这个主题已经进入股市工作区，适合放回盘后报告和动作台里一起判断它在当前市场故事中的位置。";
});
const stockMarketThemeContextBullets = computed(() => {
  if (!detail.value) {
    return [];
  }

  const bullets: string[] = [];

  if (detail.value.marketOverview?.snapshots.length) {
    bullets.push(`已覆盖市场快照: ${detail.value.marketOverview.snapshots.map((item) => item.marketLabel).join("、")}`);
  }

  if (marketStructureTrendData.value?.leaders.length) {
    bullets.push(`当前板块主线: ${marketStructureTrendData.value.leaders[0].label}`);
  }

  if (detail.value.events.length) {
    bullets.push(`主题事件数: ${detail.value.events.length}，最近优先复盘最新事件和时间线`);
  }

  if (detail.value.sources.length) {
    bullets.push(`关联来源数: ${detail.value.sources.length}`);
  }

  return bullets.slice(0, 4);
});
const stockReportQuery = computed(() => buildStockReportReturnQuery({
  reportDate: typeof route.query.reportDate === "string" ? route.query.reportDate : null,
  reportFocus: typeof route.query.reportFocus === "string" ? route.query.reportFocus : null,
}));
const shortDateFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  month: "2-digit",
  day: "2-digit",
});

function setSectionRef(sectionId: string) {
  return (element: Element | ComponentPublicInstance | null) => {
    sectionRefs.value[sectionId] = element instanceof HTMLElement ? element : null;
  };
}

function scrollToNamedSection(sectionId: string) {
  const node = sectionRefs.value[sectionId];

  if (!node) {
    return;
  }

  node.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function focusRequestedSection() {
  await nextTick();

  const section = route.query.section;

  if (typeof section === "string" && sectionRefs.value[section]) {
    scrollToNamedSection(section);
  }
}

function handleBack() {
  if (isStockMarketWorkspace.value && route.query.returnTo === "stock-report") {
    void router.push({
      path: "/workspace/stock-market/reports",
      query: {
        date: typeof route.query.reportDate === "string" ? route.query.reportDate : undefined,
        focus: typeof route.query.reportFocus === "string" ? route.query.reportFocus : undefined,
      },
    });
    return;
  }

  if (window.history.length > 1) {
    router.back();
    return;
  }

  const workspaceId = route.params.workspaceId;
  void router.push(typeof workspaceId === "string" ? `/workspace/${workspaceId}/topics` : "/themes");
}

function toggleEditThemeForm() {
  showEditThemeForm.value = !showEditThemeForm.value;
}

function toggleAddSourceForm() {
  showAddSourceForm.value = !showAddSourceForm.value;
}

function parseSourceConfig(configJson: string) {
  const parsed = JSON.parse(configJson || "{}");

  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return parsed as Record<string, unknown>;
  }

  throw new Error("Config JSON 必须是对象。");
}

function recordLink(record: ThemeRecord) {
  const url = record.content.url;
  return typeof url === "string" ? url : null;
}

function formatShortDate(value?: string | null) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return shortDateFormatter.format(date).replace(/\//g, "-");
}

function recordDetails(record: ThemeRecord) {
  if (record.infoType === "price") {
    return [
      { label: "价格", value: formatMaybeLabel(record.content.price) },
      { label: "币种", value: formatMaybeLabel(record.content.currency) },
      { label: "规格", value: formatMaybeLabel(record.content.spec) },
      { label: "标识", value: formatMaybeLabel(record.content.symbol) },
    ];
  }

  if (record.infoType === "news_announcement") {
    return [
      { label: "主题", value: formatMaybeLabel(record.content.release_topic_label) },
      { label: "发布方", value: formatMaybeLabel(record.content.publisher) },
      { label: "类别", value: formatMaybeLabel(record.content.category) },
      { label: "说明", value: formatMaybeLabel(record.content.description) },
    ];
  }

  if (record.infoType === "content_update") {
    return [
      { label: "对象", value: formatMaybeLabel(record.content.object_name) },
      { label: "更新类型", value: formatMaybeLabel(record.content.update_type) },
      { label: "链接", value: formatMaybeLabel(record.content.url) },
      { label: "摘要", value: formatMaybeLabel(record.content.summary) },
    ];
  }

  if (record.infoType === "financial_event") {
    if (record.content.event_class === "market_overview") {
      return [
        { label: "市场", value: formatMaybeLabel(record.content.market_label) },
        { label: "基准", value: formatMaybeLabel(record.content.benchmark_name) },
        { label: "基准涨跌", value: formatMaybeLabel(record.content.benchmark_change_percent) },
        { label: "资金流向", value: formatMaybeLabel(record.content.fund_flow_direction) },
        { label: "净流向（亿）", value: formatMaybeLabel(record.content.fund_flow_net_billion) },
        { label: "成交额（亿）", value: formatMaybeLabel(record.content.fund_flow_turnover_billion) },
        { label: "摘要", value: formatMaybeLabel(record.content.description) },
      ];
    }

    if (record.content.event_class === "daily_billboard") {
      return [
        { label: "个股", value: formatMaybeLabel(record.content.security_name) },
        { label: "代码", value: formatMaybeLabel(record.content.security_code) },
        { label: "净额（亿元）", value: formatMaybeLabel(record.content.amount_billion_cny) },
        { label: "涨跌幅（%）", value: formatMaybeLabel(record.content.change_rate_percent) },
        { label: "上榜次数", value: formatMaybeLabel(record.content.onlist_num) },
        { label: "方向", value: eventSignalLabel(String(record.content.direction_label ?? "")) },
      ];
    }

    return [
      { label: "方向", value: eventSignalLabel(String(record.content.direction_label ?? "")) },
      { label: "公告号", value: formatMaybeLabel(record.content.announcement_no) },
      { label: "操作类型", value: formatMaybeLabel(record.content.operation_type) },
      { label: "金额（亿元）", value: formatMaybeLabel(record.content.amount_billion_cny) },
      { label: "期限（天）", value: formatMaybeLabel(record.content.term_days) },
      { label: "利率（%）", value: formatMaybeLabel(record.content.rate_percent) },
      { label: "方式", value: formatMaybeLabel(record.content.bidding_method) },
      { label: "判断依据", value: formatMaybeLabel(record.content.direction_reason) },
    ];
  }

  return Object.entries(record.content)
    .slice(0, 6)
    .map(([label, value]) => ({
      label,
      value: formatMaybeLabel(value),
    }));
}

function timelineMeta(entry: ThemeDetail["timeline"][number]) {
  const meta = entry.meta ?? {};

  if (entry.kind === "event") {
    return {
      emphasis: eventSignalLabel(String(meta.signal ?? "")),
      sourceName: typeof meta.sourceName === "string" ? meta.sourceName : null,
      details: [
        { label: "事件类型", value: formatMaybeLabel(meta.eventType) },
      ],
    };
  }

  if (entry.kind === "change") {
    const details = typeof meta.details === "object" && meta.details ? meta.details : {};
    return {
      emphasis: null,
      sourceName: typeof meta.sourceName === "string" ? meta.sourceName : null,
      details: [
        { label: "标题", value: formatMaybeLabel((details as Record<string, unknown>).title) },
        { label: "逻辑键", value: formatMaybeLabel((details as Record<string, unknown>).logical_key) },
      ],
    };
  }

  return {
    emphasis: runStatusLabel(String(meta.status ?? "")),
    sourceName: typeof meta.sourceName === "string" ? meta.sourceName : null,
    details: [
      { label: "触发方式", value: formatMaybeLabel(meta.triggerType) },
    ],
  };
}

function timelineItemClass(entry: ThemeDetail["timeline"][number]) {
  if (entry.kind === "event") {
    return "bg-[rgba(247,249,252,0.96)] border-slate-400/20 shadow-[0_10px_26px_rgba(15,23,42,0.04)]";
  }

  if (entry.kind === "change") {
    return "bg-[rgba(244,247,250,0.94)] border-slate-400/20";
  }

  return "bg-[rgba(242,246,250,0.96)] border-slate-400/20";
}

const priceTrendPoints = computed(() => {
  if (!detail.value || detail.value.theme.type !== "price") {
    return [];
  }

  const pricedRecords = [...detail.value.records]
    .filter((record) => typeof record.content.price === "number")
    .reverse()
    .slice(-8);

  if (pricedRecords.length < 2) {
    return [];
  }

  const values = pricedRecords.map((record) => Number(record.content.price));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return pricedRecords.map((record, index) => ({
    label: formatShortDate(record.occurredAt),
    value: Number(record.content.price),
    x: 24 + (index * 272) / Math.max(pricedRecords.length - 1, 1),
    y: 132 - ((Number(record.content.price) - min) / range) * 92,
  }));
});

const priceTrendPolyline = computed(() => priceTrendPoints.value.map((point) => `${point.x},${point.y}`).join(" "));
const priceTrendMin = computed(() => {
  const values = priceTrendPoints.value.map((point) => point.value);
  return values.length ? Math.min(...values) : null;
});
const priceTrendMax = computed(() => {
  const values = priceTrendPoints.value.map((point) => point.value);
  return values.length ? Math.max(...values) : null;
});
const priceTrendLatest = computed(() => {
  const latest = priceTrendPoints.value[priceTrendPoints.value.length - 1];
  return latest?.value ?? null;
});
const priceVsMinLabel = computed(() => {
  if (priceTrendLatest.value == null || priceTrendMin.value == null || priceTrendMin.value === 0) {
    return "--";
  }

  const delta = ((priceTrendLatest.value - priceTrendMin.value) / priceTrendMin.value) * 100;
  return `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`;
});
const priceVsMaxLabel = computed(() => {
  if (priceTrendLatest.value == null || priceTrendMax.value == null || priceTrendMax.value === 0) {
    return "--";
  }

  const delta = ((priceTrendLatest.value - priceTrendMax.value) / priceTrendMax.value) * 100;
  return `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`;
});
const priceRangeLabel = computed(() => {
  if (priceTrendMin.value == null || priceTrendMax.value == null || priceTrendMin.value === 0) {
    return "--";
  }

  const delta = ((priceTrendMax.value - priceTrendMin.value) / priceTrendMin.value) * 100;
  return `${delta.toFixed(1)}%`;
});

const eventActivityBars = computed(() => {
  if (!detail.value || detail.value.theme.type === "price") {
    return [];
  }

  const counts = new Map<string, number>();

  for (const event of detail.value.events) {
    const label = formatShortDate(event.occurredAt);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  const items = [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => left.label.localeCompare(right.label))
    .slice(-7);

  const maxCount = Math.max(...items.map((item) => item.count), 1);

  return items.map((item) => ({
    ...item,
    height: (item.count / maxCount) * 100,
  }));
});

const breakdownBarItems = computed(() => {
  const items = detail.value?.breakdown?.items ?? [];

  if (!items.length) {
    return [];
  }

  const maxCount = Math.max(...items.map((item) => item.count), 1);

  return items.map((item) => ({
    ...item,
    width: (item.count / maxCount) * 100,
  }));
});

const sourceCompareData = computed(() => {
  if (!detail.value) {
    return {
      headline: "跨来源快照",
      summary: "这个主题当前还没有可用于跨来源比较的记录。",
      stats: ["已覆盖 0/0 个来源"],
      items: [],
    };
  }

  return buildThemeSourceCompareData(detail.value);
});

const continuousSnapshotData = computed(() => {
  if (!detail.value) {
    return null;
  }

  return buildContinuousSnapshotCompareData(detail.value);
});

const financialRhythmData = computed(() => {
  if (!detail.value) {
    return null;
  }

  return buildFinancialRhythmData(detail.value);
});

const marketStructureTrendData = computed(() => {
  if (!detail.value) {
    return null;
  }

  return buildMarketStructureTrendData(detail.value);
});

const analysisReviewActions = computed(() => {
  if (!detail.value) {
    return [];
  }

  return buildThemeDetailAnalysisActions(detail.value, {
    reportDate: typeof route.query.reportDate === "string" ? route.query.reportDate : null,
    reportFocus: typeof route.query.reportFocus === "string" ? route.query.reportFocus : null,
  });
});

function analysisToneLabel(tone: string) {
  if (tone === "positive") {
    return "偏积极";
  }

  if (tone === "negative") {
    return "偏谨慎";
  }

  return "中性观察";
}

function setOperationMessage(
  message: string,
  actions: Array<{ label: string; to: RouteLocationRaw }> = [],
) {
  operationMessage.value = { message, actions };
}

const statusBanner = computed(() => {
  if (!detail.value) {
    return null;
  }

  const queued = route.query.queued === "1";
  const queuedSources = Number(route.query.queuedSources ?? "0");
  const hasPendingRun = detail.value.sources.some((source) => source.latestRunStatus === "pending");
  const hasNoRecordsYet = detail.value.records.length === 0;

  if (queued) {
    return {
      title: "初始来源已入队",
      body:
        queuedSources > 0
          ? `主题已创建成功，且已有 ${queuedSources} 个来源运行入队。Worker 完成后，记录和事件会出现在这里。`
          : "主题已创建成功，首个来源运行已经入队。",
    };
  }

  if (hasPendingRun && hasNoRecordsYet) {
    return {
      title: "等待首批记录",
      body: "最近一次来源运行仍在排队或执行中，完成后这个主题会自动出现记录和事件。",
    };
  }

  return null;
});

async function loadThemeDetail() {
  const themeId = String(route.params.themeId);
  detail.value = await fetchThemeDetail(themeId);
  await focusRequestedSection();
}

async function handleRunAllSources() {
  if (!detail.value) {
    return;
  }

  runningAllSources.value = true;

  try {
    await Promise.all(detail.value.sources.map((source) => triggerSourceRun(source.id)));
    await loadThemeDetail();
  } finally {
    runningAllSources.value = false;
  }
}

async function handleSaveTheme(input: {
  name: string;
  description: string;
  status: string;
}) {
  if (!detail.value) {
    return;
  }

  savingTheme.value = true;
  themeFormStatus.value = "";
  operationMessage.value = null;

  try {
    await updateTheme({
      themeId: detail.value.theme.id,
      name: input.name,
      description: input.description,
      status: input.status,
    });
    await loadThemeDetail();
    showEditThemeForm.value = false;
    setOperationMessage("主题已更新。", [
      { label: "查看主题分析", to: { path: `/themes/${detail.value.theme.id}`, query: { section: "analysis" } } },
      { label: "查看主题来源", to: { path: `/themes/${detail.value.theme.id}`, query: { section: "sources" } } },
    ]);
  } catch (error) {
    themeFormStatus.value = error instanceof Error ? error.message : "更新主题失败。";
  } finally {
    savingTheme.value = false;
  }
}

async function handleToggleThemeArchived() {
  if (!detail.value) {
    return;
  }

  const nextStatus = detail.value.theme.status === "archived" ? "active" : "archived";
  savingThemeArchive.value = true;
  operationMessage.value = null;

  try {
    await updateTheme({
      themeId: detail.value.theme.id,
      status: nextStatus,
    });
    await loadThemeDetail();
    setOperationMessage(
      nextStatus === "archived" ? "主题已归档。" : "主题已恢复为 active。",
      [
        { label: nextStatus === "archived" ? "查看归档主题" : "查看主题详情", to: nextStatus === "archived" ? { path: "/themes", query: { status: "archived", sort: "latestEvent" } } : { path: `/themes/${detail.value.theme.id}`, query: { section: "analysis" } } },
      ],
    );
  } finally {
    savingThemeArchive.value = false;
  }
}

async function handleDeleteTheme() {
  if (!detail.value) {
    return;
  }

  const confirmed = window.confirm("删除主题后，其来源、运行记录、变化和事件都会一起删除。确定继续吗？");

  if (!confirmed) {
    return;
  }

  deletingTheme.value = true;

  try {
    await deleteTheme(detail.value.theme.id);
    const workspaceId = route.params.workspaceId;
    await router.push(typeof workspaceId === "string" ? `/workspace/${workspaceId}/topics` : "/themes");
  } finally {
    deletingTheme.value = false;
  }
}

async function handleUpdateThemeEventStatus(eventId: string, status: string) {
  savingEventId.value = eventId;
  pendingEventStatus.value = status;
  operationMessage.value = null;

  try {
    const currentEvent = detail.value?.events.find((event) => event.id === eventId);
    await updateEventStatus(eventId, status);
    await loadThemeDetail();
    if (currentEvent) {
      recordRecentEventOperation({
        action: status as "open" | "tracking" | "ignored",
        count: 1,
        eventTitle: currentEvent.title,
        infoType: detail.value?.theme.type === "price"
          ? "price"
          : detail.value?.theme.type === "financial_event"
            ? "financial_event"
            : detail.value?.theme.type === "content_update"
              ? "content_update"
              : "news_announcement",
        themeId: String(route.params.themeId),
        themeName: detail.value?.theme.name ?? "",
      });
      const notice = buildSingleEventOperationNotice(
        {
          ...currentEvent,
          themeId: String(route.params.themeId),
          themeName: detail.value?.theme.name ?? "",
          status,
        },
        status as "open" | "tracking" | "ignored",
      );
      setOperationMessage(notice.message, notice.actions);
    } else {
      setOperationMessage(`事件已标记为${eventStatusLabel(status)}。`, [
        { label: "查看主题事件队列", to: { path: `/themes/${route.params.themeId}`, query: { section: "events" } } },
        { label: "查看事件工作台", to: { path: "/events", query: { themeId: String(route.params.themeId), status, sort: status === "open" ? "statusChanged" : "occurredAt" } } },
      ]);
    }
  } finally {
    savingEventId.value = null;
    pendingEventStatus.value = "";
  }
}

async function handleUpdateThemeEventMeta(
  eventId: string,
  input: {
    isRead?: boolean;
    isBookmarked?: boolean;
  },
  pendingKey: string,
) {
  savingEventId.value = eventId;
  pendingEventStatus.value = pendingKey;
  operationMessage.value = null;

  try {
    const currentEvent = detail.value?.events.find((event) => event.id === eventId);
    await updateEvent(eventId, input);
    await loadThemeDetail();
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
        infoType: detail.value?.theme.type === "price"
          ? "price"
          : detail.value?.theme.type === "financial_event"
            ? "financial_event"
            : detail.value?.theme.type === "content_update"
              ? "content_update"
              : "news_announcement",
        themeId: String(route.params.themeId),
        themeName: detail.value?.theme.name ?? "",
      });
      const notice = buildSingleEventOperationNotice(
        {
          ...currentEvent,
          themeId: String(route.params.themeId),
          themeName: detail.value?.theme.name ?? "",
          isRead: typeof input.isRead === "boolean" ? input.isRead : currentEvent.isRead,
          isBookmarked: typeof input.isBookmarked === "boolean" ? input.isBookmarked : currentEvent.isBookmarked,
        },
        typeof input.isBookmarked === "boolean"
          ? input.isBookmarked
            ? "bookmark"
            : "unbookmark"
          : input.isRead
            ? "read"
            : "unread",
      );
      setOperationMessage(notice.message, notice.actions);
    } else {
      setOperationMessage(
        typeof input.isBookmarked === "boolean"
          ? input.isBookmarked
            ? "事件已加入收藏。"
            : "事件已取消收藏。"
          : input.isRead
            ? "事件已标记为已读。"
            : "事件已标记为未读。",
        [
          { label: "查看主题事件队列", to: { path: `/themes/${route.params.themeId}`, query: { section: "events" } } },
          {
            label: typeof input.isBookmarked === "boolean" && input.isBookmarked ? "查看观察清单" : "查看事件工作台",
            to:
              typeof input.isBookmarked === "boolean" && input.isBookmarked
                ? { path: "/watchlist" }
                : { path: "/events", query: { themeId: String(route.params.themeId), sort: "occurredAt" } },
          },
        ],
      );
    }
  } finally {
    savingEventId.value = null;
    pendingEventStatus.value = "";
  }
}

async function handleToggleSourcePaused(sourceId: string, isPaused: boolean) {
  operationMessage.value = null;

  await updateSourcePaused(sourceId, isPaused);
  await loadThemeDetail();
  setOperationMessage(isPaused ? "来源已暂停。" : "来源已恢复。", [
    { label: "查看本主题来源状态", to: { path: "/sources/status", query: { themeId: String(route.params.themeId), focus: isPaused ? "all" : undefined } } },
    { label: "查看主题来源区", to: { path: `/themes/${route.params.themeId}`, query: { section: "sources" } } },
  ]);
}

async function handleDeleteSource(sourceId: string) {
  const confirmed = window.confirm("删除来源后，与该来源相关的运行、记录、变化和事件都会一起删除。确定继续吗？");

  if (!confirmed) {
    return;
  }

  operationMessage.value = null;

  await deleteSource(sourceId);
  await loadThemeDetail();
  setOperationMessage("来源已删除。", [
    { label: "查看本主题来源状态", to: { path: "/sources/status", query: { themeId: String(route.params.themeId) } } },
    { label: "查看主题来源区", to: { path: `/themes/${route.params.themeId}`, query: { section: "sources" } } },
  ]);
}

async function handleSaveSource(
  sourceId: string,
  input: {
    name: string;
    sourceType: string;
    adapterKey: string;
    configJson: string;
  },
) {
  operationMessage.value = null;

  await updateSource({
    sourceId,
    name: input.name,
    sourceType: input.sourceType,
    adapterKey: input.adapterKey,
    config: parseSourceConfig(input.configJson),
  });
  await loadThemeDetail();
  setOperationMessage("来源已更新。", [
    { label: "查看来源详情", to: { path: `/sources/${sourceId}` } },
    { label: "查看本主题来源状态", to: { path: "/sources/status", query: { themeId: String(route.params.themeId) } } },
  ]);
}

async function handleAddSource(input: {
  name: string;
  sourceType: string;
  adapterKey: string;
  config: Record<string, unknown>;
  runImmediately: boolean;
  onboardingStatus: "draft" | "ready_to_test" | "active";
}) {
  if (!detail.value) {
    return;
  }

  operationMessage.value = null;
  sourceFormStatus.value = "";
  addingSource.value = true;

  try {
    const created = await createSource({
      themeId: detail.value.theme.id,
      name: input.name,
      sourceType: input.sourceType,
      adapterKey: input.adapterKey,
      config: input.config,
      onboardingStatus: input.onboardingStatus,
    });

    if (input.runImmediately && input.onboardingStatus === "active") {
      await triggerSourceRun(created.id);
    }

    await loadThemeDetail();
    const statusLabel = input.onboardingStatus === "draft" ? "草稿已保存。" : input.onboardingStatus === "ready_to_test" ? "来源已保存，可在详情页手动触发测试。" : input.runImmediately ? "来源已保存，并已入队运行。" : "来源已保存，已启用。";
    setOperationMessage(statusLabel, [
      { label: "查看本主题来源状态", to: { path: "/sources/status", query: { themeId: String(route.params.themeId), recent: input.runImmediately ? "24h" : undefined } } },
      { label: "查看主题来源区", to: { path: `/themes/${route.params.themeId}`, query: { section: "sources" } } },
    ]);
    showAddSourceForm.value = false;
  } catch (error) {
    sourceFormStatus.value = error instanceof Error ? error.message : "保存来源失败。";
  } finally {
    addingSource.value = false;
  }
}

onMounted(async () => {
  await loadThemeDetail();
});

watch(
  () => route.query.section,
  () => {
    void focusRequestedSection();
  },
);
</script>
