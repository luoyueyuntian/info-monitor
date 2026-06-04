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
      :body="operationMessage"
    />

    <div :ref="setSectionRef('analysis')">
      <ThemeDetailAnalysisCard
        :analysis="detail.analysis"
        :analysis-tone-label="analysisToneLabel"
      />
    </div>

    <ThemeDetailEventQueueCard
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

    <div class="grid two">
      <div :ref="setSectionRef('events')">
        <ThemeDetailRecentEventsCard :events="detail.events" />
      </div>

      <div :ref="setSectionRef('sources')">
        <ThemeDetailSourcesCard
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
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, type ComponentPublicInstance, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import ThemeDetailAnalysisCard from "./ThemeDetailAnalysisCard.vue";
import ThemeDetailAddSourceFormCard from "./ThemeDetailAddSourceFormCard.vue";
import ThemeDetailActionsBar from "./ThemeDetailActionsBar.vue";
import ThemeDetailBreakdownCard from "./ThemeDetailBreakdownCard.vue";
import ThemeDetailEditThemeFormCard from "./ThemeDetailEditThemeFormCard.vue";
import ThemeDetailEventQueueCard from "./ThemeDetailEventQueueCard.vue";
import ThemeDetailHeader from "./ThemeDetailHeader.vue";
import ThemeDetailNoticeCard from "./ThemeDetailNoticeCard.vue";
import ThemeDetailRecentEventsCard from "./ThemeDetailRecentEventsCard.vue";
import ThemeDetailRecordsCard from "./ThemeDetailRecordsCard.vue";
import ThemeDetailSectionNav from "./ThemeDetailSectionNav.vue";
import ThemeDetailStatsGrid from "./ThemeDetailStatsGrid.vue";
import ThemeDetailSourcesCard from "./ThemeDetailSourcesCard.vue";
import ThemeDetailTimelineCard from "./ThemeDetailTimelineCard.vue";
import ThemeDetailTrendCard from "./ThemeDetailTrendCard.vue";
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
const operationMessage = ref("");
const themeFormStatus = ref("");
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
  if (window.history.length > 1) {
    router.back();
    return;
  }

  void router.push("/themes");
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

  if (record.infoType === "financial_event") {
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
    return "timeline-event";
  }

  if (entry.kind === "change") {
    return "timeline-change";
  }

  return "timeline-run";
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

function analysisToneLabel(tone: string) {
  if (tone === "positive") {
    return "偏积极";
  }

  if (tone === "negative") {
    return "偏谨慎";
  }

  return "中性观察";
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
  operationMessage.value = "";

  try {
    await updateTheme({
      themeId: detail.value.theme.id,
      name: input.name,
      description: input.description,
      status: input.status,
    });
    await loadThemeDetail();
    showEditThemeForm.value = false;
    operationMessage.value = "主题已更新。";
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
  operationMessage.value = "";

  try {
    await updateTheme({
      themeId: detail.value.theme.id,
      status: nextStatus,
    });
    await loadThemeDetail();
    operationMessage.value = nextStatus === "archived" ? "主题已归档。" : "主题已恢复为 active。";
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
    await router.push("/themes");
  } finally {
    deletingTheme.value = false;
  }
}

async function handleUpdateThemeEventStatus(eventId: string, status: string) {
  savingEventId.value = eventId;
  pendingEventStatus.value = status;
  operationMessage.value = "";

  try {
    await updateEventStatus(eventId, status);
    await loadThemeDetail();
    operationMessage.value = `事件已标记为${eventStatusLabel(status)}。`;
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
  operationMessage.value = "";

  try {
    await updateEvent(eventId, input);
    await loadThemeDetail();
    operationMessage.value =
      typeof input.isBookmarked === "boolean"
        ? input.isBookmarked
          ? "事件已加入收藏。"
          : "事件已取消收藏。"
        : input.isRead
          ? "事件已标记为已读。"
          : "事件已标记为未读。";
  } finally {
    savingEventId.value = null;
    pendingEventStatus.value = "";
  }
}

async function handleToggleSourcePaused(sourceId: string, isPaused: boolean) {
  operationMessage.value = "";

  await updateSourcePaused(sourceId, isPaused);
  await loadThemeDetail();
  operationMessage.value = isPaused ? "来源已暂停。" : "来源已恢复。";
}

async function handleDeleteSource(sourceId: string) {
  const confirmed = window.confirm("删除来源后，与该来源相关的运行、记录、变化和事件都会一起删除。确定继续吗？");

  if (!confirmed) {
    return;
  }

  operationMessage.value = "";

  await deleteSource(sourceId);
  await loadThemeDetail();
  operationMessage.value = "来源已删除。";
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
  operationMessage.value = "";

  await updateSource({
    sourceId,
    name: input.name,
    sourceType: input.sourceType,
    adapterKey: input.adapterKey,
    config: parseSourceConfig(input.configJson),
  });
  await loadThemeDetail();
  operationMessage.value = "来源已更新。";
}

async function handleAddSource(input: {
  name: string;
  sourceType: string;
  adapterKey: string;
  configJson: string;
  runImmediately: boolean;
}) {
  if (!detail.value) {
    return;
  }

  operationMessage.value = "";
  sourceFormStatus.value = "";
  addingSource.value = true;

  try {
    const created = await createSource({
      themeId: detail.value.theme.id,
      name: input.name,
      sourceType: input.sourceType,
      adapterKey: input.adapterKey,
      config: parseSourceConfig(input.configJson),
    });

    if (input.runImmediately) {
      await triggerSourceRun(created.id);
    }

    await loadThemeDetail();
    operationMessage.value = input.runImmediately ? "来源已保存，并已入队运行。" : "来源已保存。";
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
