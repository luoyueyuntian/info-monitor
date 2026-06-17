<template>
  <section class="page" v-if="detail">
    <SourceDetailHeader
      :source-name="detail.source.name"
      :theme-id="detail.source.themeId"
      :theme-name="detail.source.themeName"
      :source-type="detail.source.sourceType"
      :is-paused="detail.source.isPaused"
      :onboarding-status="detail.source.onboardingStatus"
      :handle-back="handleBack"
    />

    <article class="card">
      <div class="card-topline">
        <h3>关联主题信号</h3>
        <RouterLink
          class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-ink-link"
          :to="{ path: `/themes/${detail.source.themeId}`, query: { section: 'analysis', ...stockReportQuery } }"
        >
          查看所属主题
          <span aria-hidden="true" class="text-base leading-none">›</span>
        </RouterLink>
      </div>
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <span :class="pillToneClass()" v-if="detail.source.themeType">{{ themeTypeLabel(detail.source.themeType) }}</span>
        <span :class="pillToneClass(themeImpactTone({ type: detail.source.themeType ?? '', latestEventSignal: detail.source.latestEventSignal ?? null }))" v-if="detail.source.latestEventSignal">
          {{ impactToneLabel(themeImpactTone({ type: detail.source.themeType ?? '', latestEventSignal: detail.source.latestEventSignal ?? null })) }}
        </span>
        <span :class="pillToneClass(detail.source.latestEventSignal)" v-if="detail.source.latestEventSignal">
          {{ eventSignalLabel(detail.source.latestEventSignal) }}
        </span>
      </div>
      <div class="text-ink-body">
        {{
          detail.source.latestEventSignal
            ? "这个来源当前属于一个最近已经出现明确信号的主题，适合把来源状态和主题判断一起看。"
            : "这个来源当前没有明确的最近主题信号，适合更多从抓取稳定性和覆盖完整度角度复核。"
        }}
      </div>
    </article>

    <SourceDetailAnalysisCard :analysis="detail.analysis" :review-actions="reviewActions" />

    <SourceHealthExplanationCard
      v-if="healthExplanation"
      :explanation="healthExplanation"
    />

    <SourceDetailStatsGrid
      :theme-name="detail.source.themeName"
      :source-type="detail.source.sourceType"
      :latest-run-status="detail.source.latestRunStatus"
      :status="detail.source.status"
    />

    <SourceDetailRunTrendCard
      :run-count="productionRuns.length"
      :success-rate-label="runSuccessRateLabel"
      :completed-count="runCompletedCount"
      :failed-count="runFailedCount"
      :open-count="runOpenCount"
      :run-sequence-items="runSequenceItems"
      :run-bar-class="runBarClass"
    />

    <SourceDetailConfigCard
      :adapter-key="detail.source.adapterKey"
      :is-paused="detail.source.isPaused"
      :latest-success-at="detail.source.latestSuccessAt"
      :latest-failure-at="detail.source.latestFailureAt"
      :config="detail.source.config"
    />

    <SourceConfigHistoryCard :source-id="detail.source.id" :current-config="detail.source.config" @config-rolled-back="loadSourceDetail(detail.source.id)" />

    <SourceDetailTestRunCard
      :source-id="detail.source.id"
      :onboarding-status="detail.source.onboardingStatus"
      @test-completed="handleTestCompleted"
    />

    <SourceDetailSnapshotsCard :snapshots="detail.snapshots" :replaying-snapshot-id="replayingSnapshotId" @replay="handleReplay" />

    <SourceReplayComparisonCard :comparison="replayComparison" />

    <div class="grid two">
      <SourceDetailRunsCard
        :runs="detail.runs"
        :rerunning-run-id="rerunningRunId"
        @retry="handleRetry"
      />
      <SourceDetailEventsCard :theme-id="detail.source.themeId" :events="detail.events" />
    </div>

    <div class="grid two">
      <SourceDetailRecordsCard :records="detail.records" :record-details="recordDetails" />
      <SourceDetailChangesCard :changes="detail.changes" :change-details="changeDetails" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { RouteLocationRaw } from "vue-router";

import SourceDetailAnalysisCard from "./SourceDetailAnalysisCard.vue";
import SourceConfigHistoryCard from "./SourceConfigHistoryCard.vue";
import SourceDetailConfigCard from "./SourceDetailConfigCard.vue";
import SourceDetailChangesCard from "./SourceDetailChangesCard.vue";
import SourceDetailEventsCard from "./SourceDetailEventsCard.vue";
import SourceDetailHeader from "./SourceDetailHeader.vue";
import SourceDetailRecordsCard from "./SourceDetailRecordsCard.vue";
import { buildSourceDetailReviewActions } from "./source-detail-review-actions";
import SourceDetailRunTrendCard from "./SourceDetailRunTrendCard.vue";
import SourceDetailRunsCard from "./SourceDetailRunsCard.vue";
import SourceDetailSnapshotsCard from "./SourceDetailSnapshotsCard.vue";
import SourceDetailStatsGrid from "./SourceDetailStatsGrid.vue";
import SourceDetailTestRunCard from "./SourceDetailTestRunCard.vue";
import SourceReplayComparisonCard from "./SourceReplayComparisonCard.vue";
import SourceHealthExplanationCard from "../../../../components/SourceHealthExplanationCard.vue";
import { fetchSourceDetail, fetchSourceHealthExplanation, fetchSourceReplayComparison, retrySourceAfterFailure, triggerSourceReplay, triggerSourceRun, type SourceDetail, type SourceHealthExplanation, type SourceReplayComparison } from "../../../../lib/api";
import { impactToneLabel, themeImpactTone } from "../../../../lib/impact";
import { buildStockReportReturnQuery } from "../../../../lib/stock-market-report-navigation";
import {
  eventSignalLabel,
  formatMaybeLabel,
  formatSmartDateTimeLabel,
  pillToneClass,
  themeTypeLabel,
} from "../../../../lib/presentation";

const route = useRoute();
const router = useRouter();
const detail = ref<SourceDetail | null>(null);
const healthExplanation = ref<SourceHealthExplanation | null>(null);
const rerunningRunId = ref<string | null>(null);
const replayingSnapshotId = ref<string | null>(null);
const replayComparison = ref<SourceReplayComparison | null>(null);
const isStockMarketWorkspace = computed(() => String(route.params.workspaceId ?? "") === "stock-market");
const stockMarketInvestigationActions = computed<Array<{ label: string; to: RouteLocationRaw }>>(() => {
  if (!detail.value || !isStockMarketWorkspace.value) {
    return [];
  }

  const actions: Array<{ label: string; to: RouteLocationRaw }> = [
    { label: "返回来源控制台", to: `/workspace/stock-market/sources` },
    { label: "查看所属主题", to: `/workspace/stock-market/topics/${detail.value.source.themeId}` },
  ];

  if (detail.value.source.adapterKey === "eastmoney_market_overview") {
    actions.unshift({ label: "查看收盘概览", to: { path: "/workspace/stock-market/reports", query: { focus: "snapshot", date: typeof route.query.reportDate === "string" ? route.query.reportDate : undefined } } });
    actions.push({ label: "查看板块主线", to: { path: "/workspace/stock-market/reports", query: { focus: "sector", date: typeof route.query.reportDate === "string" ? route.query.reportDate : undefined } } });
    return actions;
  }

  if (detail.value.source.adapterKey === "eastmoney_daily_billboard") {
    actions.unshift({ label: "查看重点异动对象", to: { path: "/workspace/stock-market/reports", query: { focus: "movers", date: typeof route.query.reportDate === "string" ? route.query.reportDate : undefined } } });
    actions.push({ label: "查看来源线索", to: { path: "/workspace/stock-market/reports", query: { focus: "source-clues", date: typeof route.query.reportDate === "string" ? route.query.reportDate : undefined } } });
    return actions;
  }

  actions.unshift({ label: "查看公告线索", to: { path: "/workspace/stock-market/reports", query: { focus: "announcements", date: typeof route.query.reportDate === "string" ? route.query.reportDate : undefined } } });
  return actions;
});
const stockMarketSourceContextSummary = computed(() => {
  if (!detail.value) {
    return "";
  }

  if (detail.value.source.adapterKey === "eastmoney_market_overview") {
    return "这个来源是股市盘后报告的核心总览来源，一旦异常，收盘概览、主催化和连续复盘都会直接受影响。";
  }

  if (detail.value.source.adapterKey === "eastmoney_daily_billboard") {
    return "这个来源主要负责提供龙虎榜异动线索，适合重点查看它最近是否在支持重点异动对象的判断。";
  }

  return "这个来源已经进入股市工作区，适合作为盘后报告里的公告或线索补充来源来复核。";
});
const stockMarketSourceContextBullets = computed(() => {
  if (!detail.value) {
    return [];
  }

  const bullets: string[] = [];

  bullets.push(`适配器: ${formatMaybeLabel(detail.value.source.adapterKey)}`);
  bullets.push(`关联主题: ${detail.value.source.themeName}`);

  if (detail.value.events.length) {
    bullets.push(`关联事件数: ${detail.value.events.length}`);
  }

  if (detail.value.runs.length) {
    bullets.push(`运行记录数: ${detail.value.runs.length}`);
  }

  return bullets.slice(0, 4);
});
const stockReportQuery = computed(() => buildStockReportReturnQuery({
  reportDate: typeof route.query.reportDate === "string" ? route.query.reportDate : null,
  reportFocus: typeof route.query.reportFocus === "string" ? route.query.reportFocus : null,
}));

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
  if (typeof workspaceId === "string") {
    void router.push(`/workspace/${workspaceId}/sources`);
    return;
  }

  if (detail.value) {
    void router.push({ path: "/sources/status", query: { themeId: detail.value.source.themeId } });
    return;
  }

  void router.push("/sources/status");
}

function handleTestCompleted(result: { success: boolean; runId: string }) {
  // Refresh the detail view to pick up any new runs/records
  if (detail.value) {
    void loadSourceDetail(detail.value.source.id);
  }
}

async function handleRetry(runId: string) {
  if (!detail.value) return;
  rerunningRunId.value = runId;
  try {
    await retrySourceAfterFailure(detail.value.source.id, runId);
    // Wait a moment then refresh
    setTimeout(async () => {
      if (detail.value) {
        await loadSourceDetail(detail.value.source.id);
      }
      rerunningRunId.value = null;
    }, 2000);
  } catch {
    rerunningRunId.value = null;
  }
}

async function handleReplay(snapshotId: string) {
  if (!detail.value) return;
  replayingSnapshotId.value = snapshotId;
  replayComparison.value = null;
  try {
    const result = await triggerSourceReplay(detail.value.source.id, snapshotId);
    // Poll for completion instead of fixed wait
    const runId = result.runId;
    const maxAttempts = 15;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (!detail.value) break;
      await loadSourceDetail(detail.value.source.id);
      // Check if run completed
      const run = detail.value.runs.find((r) => r.id === runId);
      if (run && (run.status === "completed" || run.status === "failed")) {
        // Load comparison for the replay run
        try {
          replayComparison.value = await fetchSourceReplayComparison(detail.value.source.id, runId);
        } catch {
          // Comparison is optional
        }
        break;
      }
    }
    replayingSnapshotId.value = null;
  } catch {
    replayingSnapshotId.value = null;
  }
}

function toTimestamp(value?: string | null) {
  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

// Production runs only (exclude test and replay runs) for health metrics
const productionRuns = computed(
  () => detail.value?.runs.filter((run) => run.triggerType !== "test" && run.triggerType !== "replay") ?? [],
);

const runCompletedCount = computed(
  () => productionRuns.value.filter((run) => run.status === "completed").length,
);
const runFailedCount = computed(
  () => productionRuns.value.filter((run) => run.status === "failed").length,
);
const runOpenCount = computed(
  () => productionRuns.value.filter((run) => run.status === "pending" || run.status === "running").length,
);

const runSuccessRateLabel = computed(() => {
  const runs = productionRuns.value;

  if (!runs.length) {
    return "--";
  }

  const terminalRuns = runs.filter((run) => run.status === "completed" || run.status === "failed");

  if (!terminalRuns.length) {
    return "暂无";
  }

  const completed = terminalRuns.filter((run) => run.status === "completed").length;
  return `${((completed / terminalRuns.length) * 100).toFixed(0)}%`;
});

const runSequenceItems = computed(() => {
  const runs = [...productionRuns.value]
    .sort((left, right) => toTimestamp(left.startedAt ?? left.finishedAt) - toTimestamp(right.startedAt ?? right.finishedAt))
    .slice(-8);

  return runs.map((run) => ({
    ...run,
    label: formatSmartDateTimeLabel(run.finishedAt ?? run.startedAt),
  }));
});

const reviewActions = computed(() => {
  if (!detail.value) {
    return [];
  }

  return buildSourceDetailReviewActions(detail.value, {
    reportDate: typeof route.query.reportDate === "string" ? route.query.reportDate : null,
    reportFocus: typeof route.query.reportFocus === "string" ? route.query.reportFocus : null,
  });
});

function runBarClass(status: string) {
  if (status === "completed") {
    return "bg-slate-400";
  }

  if (status === "failed") {
    return "bg-amber-500";
  }

  return "bg-slate-300";
}

function recordDetails(record: SourceDetail["records"][number]) {
  if (record.infoType === "price") {
    return [
      { label: "价格", value: formatMaybeLabel(record.content.price) },
      { label: "币种", value: formatMaybeLabel(record.content.currency) },
      { label: "规格", value: formatMaybeLabel(record.content.spec) },
    ];
  }

  if (record.infoType === "news_announcement") {
    return [
      { label: "主题", value: formatMaybeLabel(record.content.release_topic_label) },
      { label: "发布方", value: formatMaybeLabel(record.content.publisher) },
      { label: "类别", value: formatMaybeLabel(record.content.category) },
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
      ];
    }

    if (record.content.event_class === "daily_billboard") {
      return [
        { label: "个股", value: formatMaybeLabel(record.content.security_name) },
        { label: "代码", value: formatMaybeLabel(record.content.security_code) },
        { label: "净额（亿元）", value: formatMaybeLabel(record.content.amount_billion_cny) },
        { label: "涨跌幅（%）", value: formatMaybeLabel(record.content.change_rate_percent) },
        { label: "上榜次数", value: formatMaybeLabel(record.content.onlist_num) },
      ];
    }

    return [
      { label: "方向", value: formatMaybeLabel(record.content.direction_label) },
      { label: "公告号", value: formatMaybeLabel(record.content.announcement_no) },
      { label: "操作类型", value: formatMaybeLabel(record.content.operation_type) },
      { label: "金额", value: formatMaybeLabel(record.content.amount_billion_cny) },
    ];
  }

  return Object.entries(record.content)
    .slice(0, 4)
    .map(([label, value]) => ({
      label,
      value: formatMaybeLabel(value),
    }));
}

function changeDetails(change: SourceDetail["changes"][number]) {
  const details = change.details ?? {};

  return Object.entries(details)
    .slice(0, 4)
    .map(([label, value]) => ({
      label,
      value: formatMaybeLabel(value),
    }));
}

async function loadSourceDetail(sourceId: string) {
  detail.value = await fetchSourceDetail(sourceId);

  try {
    healthExplanation.value = await fetchSourceHealthExplanation(sourceId);
  } catch {
    // Health explanation is optional
  }
}

onMounted(async () => {
  await loadSourceDetail(String(route.params.sourceId));
});
</script>
