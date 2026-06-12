<template>
  <section class="page" v-if="detail">
    <SourceDetailHeader
      :source-name="detail.source.name"
      :theme-id="detail.source.themeId"
      :theme-name="detail.source.themeName"
      :source-type="detail.source.sourceType"
      :is-paused="detail.source.isPaused"
      :handle-back="handleBack"
    />

    <article class="card">
      <div class="card-topline">
        <h3>关联主题信号</h3>
        <RouterLink class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-ink-link" :to="{ path: `/themes/${detail.source.themeId}`, query: { section: 'analysis' } }">
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

    <SourceDetailStatsGrid
      :theme-name="detail.source.themeName"
      :source-type="detail.source.sourceType"
      :latest-run-status="detail.source.latestRunStatus"
      :status="detail.source.status"
    />

    <SourceDetailRunTrendCard
      :run-count="detail.runs.length"
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

    <SourceDetailSnapshotsCard :snapshots="detail.snapshots" />

    <div class="grid two">
      <SourceDetailRunsCard :runs="detail.runs" />
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

import SourceDetailAnalysisCard from "./SourceDetailAnalysisCard.vue";
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
import { fetchSourceDetail, type SourceDetail } from "../../../../lib/api";
import { impactToneLabel, themeImpactTone } from "../../../../lib/impact";
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

function handleBack() {
  if (window.history.length > 1) {
    router.back();
    return;
  }

  if (detail.value) {
    void router.push({ path: "/sources/status", query: { themeId: detail.value.source.themeId } });
    return;
  }

  void router.push("/sources/status");
}

function toTimestamp(value?: string | null) {
  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

const runCompletedCount = computed(
  () => detail.value?.runs.filter((run) => run.status === "completed").length ?? 0,
);
const runFailedCount = computed(
  () => detail.value?.runs.filter((run) => run.status === "failed").length ?? 0,
);
const runOpenCount = computed(
  () => detail.value?.runs.filter((run) => run.status === "pending" || run.status === "running").length ?? 0,
);

const runSuccessRateLabel = computed(() => {
  const runs = detail.value?.runs ?? [];

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
  const runs = [...(detail.value?.runs ?? [])]
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

  return buildSourceDetailReviewActions(detail.value);
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

onMounted(async () => {
  const sourceId = String(route.params.sourceId);
  detail.value = await fetchSourceDetail(sourceId);
});
</script>
