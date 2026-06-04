<template>
  <article class="card">
    <div class="card-topline inbox-card-header">
      <div class="inbox-card-copy">
        <h3>来源健康</h3>
        <p>{{ description }}</p>
      </div>
      <RouterLink class="text-action" :to="sourceStatusPanelTarget">
        查看来源状态
        <span aria-hidden="true">›</span>
      </RouterLink>
    </div>
    <div class="inbox-subtoolbar">
      <div class="toolbar-group">
        <button
          v-for="preset in sourcePanelPresets"
          :key="preset.id"
          class="button secondary quick-preset-button quick-preset-button--compact"
          :class="{ 'quick-preset-button--active': sourcePanelFocus === preset.id }"
          @click="sourcePanelFocus = preset.id"
        >
          {{ preset.label }}
        </button>
      </div>
    </div>
    <div class="meta inbox-panel-summary">{{ summary }}</div>
    <div v-if="sortedSources.length" class="list">
      <RouterLink
        v-for="source in sortedSources"
        :key="source.id"
        class="list-item"
        :to="`/sources/${source.id}`"
      >
        <strong>{{ source.name }}</strong>
        <div class="meta">
          {{ source.themeName }} · {{ sourceStatusLabel(source.status) }} · {{ sourceTypeLabel(source.sourceType) }}
        </div>
        <div class="meta-row">
          <span class="meta" v-if="source.latestRunStatus">最近运行 {{ runStatusLabel(source.latestRunStatus) }}</span>
          <span class="meta" v-if="source.isPaused">已暂停</span>
        </div>
        <div class="muted">
          {{
            source.lastErrorMessage
              ? `最近错误：${source.lastErrorMessage}`
              : `最近运行：${formatSmartDateTimeLabel(source.latestRunAt ?? source.latestSuccessAt ?? source.latestFailureAt)}`
          }}
        </div>
      </RouterLink>
    </div>
    <div v-else class="empty-state">
      当前视角下没有匹配的来源。
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

import type { SourceStatus } from "../../../lib/api";
import { sourcePriorityScore } from "../../../lib/source-ranking";
import { toTimestamp } from "../../../lib/time";
import {
  formatSmartDateTimeLabel,
  runStatusLabel,
  sourceStatusLabel,
  sourceTypeLabel,
} from "../../../lib/presentation";

const props = defineProps<{
  sources: SourceStatus[];
}>();

const sourcePanelFocus = ref<"all" | "warning" | "pending" | "healthy">("all");
const sourcePanelPresets = [
  { id: "all", label: "全部来源" },
  { id: "warning", label: "异常来源" },
  { id: "pending", label: "待运行来源" },
  { id: "healthy", label: "正常来源" },
] as const;

const warningSourceCount = computed(() =>
  props.sources.filter((source) => source.status === "warning" || source.status === "unhealthy").length,
);
const pendingSourceCount = computed(() =>
  props.sources.filter((source) => source.latestRunStatus === "pending" || source.status === "pending").length,
);
const healthySourceCount = computed(() => props.sources.filter((source) => source.status === "healthy").length);

const filteredSources = computed(() =>
  props.sources.filter((source) => {
    if (sourcePanelFocus.value === "warning") {
      return source.status === "warning" || source.status === "unhealthy";
    }

    if (sourcePanelFocus.value === "pending") {
      return source.latestRunStatus === "pending" || source.status === "pending";
    }

    if (sourcePanelFocus.value === "healthy") {
      return source.status === "healthy";
    }

    return true;
  }),
);

const description = computed(() => {
  if (sourcePanelFocus.value === "warning") {
    return "优先排查最近运行异常、抓取失败或解析失真的来源。";
  }

  if (sourcePanelFocus.value === "pending") {
    return "优先看仍在排队或还没完成本轮抓取的来源。";
  }

  if (sourcePanelFocus.value === "healthy") {
    return "回看最近运行稳定、当前可作为基线参考的来源。";
  }

  return "快速查看来源运行状态，判断哪些抓取链路需要优先处理。";
});

const summary = computed(() => {
  if (sourcePanelFocus.value === "warning") {
    return `当前有 ${filteredSources.value.length} 个异常来源需要优先排查。`;
  }

  if (sourcePanelFocus.value === "pending") {
    return `当前有 ${filteredSources.value.length} 个来源仍在等待或准备运行。`;
  }

  if (sourcePanelFocus.value === "healthy") {
    return `当前有 ${filteredSources.value.length} 个来源运行状态稳定。`;
  }

  return `共 ${props.sources.length} 个来源，其中 ${warningSourceCount.value} 个异常，${pendingSourceCount.value} 个待运行，${healthySourceCount.value} 个正常。`;
});

const sourceStatusPanelTarget = computed(() => ({
  path: "/sources/status",
  query:
    sourcePanelFocus.value === "all"
      ? { focus: "all", recent: "24h" }
      : { focus: sourcePanelFocus.value, recent: sourcePanelFocus.value === "healthy" ? undefined : "24h" },
}));

const sortedSources = computed(() =>
  [...filteredSources.value]
    .sort((left, right) => {
      const priorityDelta = sourcePriorityScore(right) - sourcePriorityScore(left);

      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      return Math.max(
        toTimestamp(right.latestRunAt),
        toTimestamp(right.latestSuccessAt),
        toTimestamp(right.latestFailureAt),
      ) - Math.max(
        toTimestamp(left.latestRunAt),
        toTimestamp(left.latestSuccessAt),
        toTimestamp(left.latestFailureAt),
      );
    })
    .slice(0, 6),
);
</script>
