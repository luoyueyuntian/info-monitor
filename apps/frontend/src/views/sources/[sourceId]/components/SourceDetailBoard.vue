<template>
  <section class="page" v-if="detail">
    <SourceDetailHeader
      :source-name="detail.source.name"
      :theme-name="detail.source.themeName"
      :source-type="detail.source.sourceType"
      :is-paused="detail.source.isPaused"
      :handle-back="handleBack"
    />

    <SourceDetailAnalysisCard :analysis="detail.analysis" />

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
      <SourceDetailEventsCard :events="detail.events" />
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
import SourceDetailRunTrendCard from "./SourceDetailRunTrendCard.vue";
import SourceDetailRunsCard from "./SourceDetailRunsCard.vue";
import SourceDetailSnapshotsCard from "./SourceDetailSnapshotsCard.vue";
import SourceDetailStatsGrid from "./SourceDetailStatsGrid.vue";
import { fetchSourceDetail, type SourceDetail } from "../../../../lib/api";
import {
  formatMaybeLabel,
  formatSmartDateTimeLabel,
} from "../../../../lib/presentation";

const route = useRoute();
const router = useRouter();
const detail = ref<SourceDetail | null>(null);

function handleBack() {
  if (window.history.length > 1) {
    router.back();
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
