<template>
  <article class="rounded-[18px] border border-slate-400/15 bg-white/78 p-[18px] shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
    <div class="mb-3 flex flex-wrap items-start justify-between gap-4">
      <div class="grid min-w-0 gap-1">
        <h3 class="m-0 text-[1.02rem] font-semibold text-ink-heading">来源健康</h3>
        <p class="m-0 text-[0.9rem] leading-[1.45] text-[#756a5b]">{{ description }}</p>
      </div>
      <RouterLink class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-ink-link" :to="sourceStatusPanelTarget">
        查看来源状态
        <span aria-hidden="true" class="text-base leading-none">›</span>
      </RouterLink>
    </div>
    <div class="mb-2.5 flex flex-wrap items-center justify-between gap-x-3.5 gap-y-2.5">
      <div class="flex flex-wrap items-center gap-2.5">
        <button
          v-for="preset in sourcePanelPresets"
          :key="preset.id"
          class="inline-flex items-center justify-center rounded-xl border border-border bg-white px-3 py-2 text-[0.88rem] text-ink transition-colors hover:bg-slate-50"
          :class="sourcePanelFocus === preset.id ? 'border-[#2f2618] bg-btn-dark text-ink-on-dark hover:bg-btn-dark' : ''"
          @click="sourcePanelFocus = preset.id"
        >
          {{ preset.label }}
        </button>
      </div>
    </div>
    <div class="mb-3 text-[0.88rem] text-ink-secondary">{{ summary }}</div>
    <div v-if="sortedSources.length" class="flex flex-col gap-3">
      <article
        v-for="source in sortedSources"
        :key="source.id"
        class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5"
      >
        <RouterLink
          class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.98rem] font-semibold text-ink-link"
          :to="`/sources/${source.id}`"
        >
          {{ source.name }}
          <span aria-hidden="true" class="text-base leading-none">›</span>
        </RouterLink>
        <div class="text-[0.88rem] text-ink-secondary">
          {{ source.themeName }} · {{ sourceStatusLabel(source.status) }} · {{ sourceTypeLabel(source.sourceType) }}
        </div>
        <div class="flex flex-wrap gap-x-2.5 gap-y-2" v-if="source.themeType || source.latestEventSignal">
          <span :class="pillToneClass()" v-if="source.themeType">{{ themeTypeLabel(source.themeType) }}</span>
          <span :class="pillToneClass(themeImpactTone({ type: source.themeType ?? '', latestEventSignal: source.latestEventSignal ?? null }))" v-if="source.latestEventSignal">
            {{ impactToneLabel(themeImpactTone({ type: source.themeType ?? '', latestEventSignal: source.latestEventSignal ?? null })) }}
          </span>
        </div>
        <div class="flex flex-wrap gap-x-2.5 gap-y-2">
          <span class="text-[0.88rem] text-ink-secondary" v-if="source.latestRunStatus">最近运行 {{ runStatusLabel(source.latestRunStatus) }}</span>
          <span class="text-[0.88rem] text-ink-secondary" v-if="source.isPaused">已暂停</span>
        </div>
        <div class="text-ink-body">
          {{
            source.lastErrorMessage
              ? `最近错误：${source.lastErrorMessage}`
              : `最近运行：${formatSmartDateTimeLabel(source.latestRunAt ?? source.latestSuccessAt ?? source.latestFailureAt)}`
          }}
        </div>
        <div class="mt-2 flex flex-wrap gap-3">
          <RouterLink
            class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-ink-link"
            :to="`/sources/${source.id}`"
          >
            查看来源详情
            <span aria-hidden="true" class="text-base leading-none">›</span>
          </RouterLink>
          <RouterLink
            class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-ink-link"
            :to="{ path: `/themes/${source.themeId}`, query: { section: themeImpactTone({ type: source.themeType ?? '', latestEventSignal: source.latestEventSignal ?? null }) === 'negative' ? 'analysis' : 'timeline' } }"
          >
            {{ themeImpactTone({ type: source.themeType ?? "", latestEventSignal: source.latestEventSignal ?? null }) === "negative" ? "查看主题分析" : "查看主题时间线" }}
            <span aria-hidden="true" class="text-base leading-none">›</span>
          </RouterLink>
          <RouterLink
            class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-ink-link"
            :to="{ path: '/events', query: { themeId: source.themeId, impact: themeImpactTone({ type: source.themeType ?? '', latestEventSignal: source.latestEventSignal ?? null }) !== 'neutral' ? themeImpactTone({ type: source.themeType ?? '', latestEventSignal: source.latestEventSignal ?? null }) : undefined, sort: 'occurredAt' } }"
          >
            查看相关事件
            <span aria-hidden="true" class="text-base leading-none">›</span>
          </RouterLink>
        </div>
      </article>
    </div>
    <div v-else class="rounded-2xl bg-slate-100/90 p-4 text-ink-body">
      当前视角下没有匹配的来源。
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

import type { SourceStatus } from "../../../lib/api";
import { impactToneLabel, themeImpactTone } from "../../../lib/impact";
import { sourcePriorityScore } from "../../../lib/source-ranking";
import { toTimestamp } from "../../../lib/time";
import {
  formatSmartDateTimeLabel,
  pillToneClass,
  runStatusLabel,
  sourceStatusLabel,
  sourceTypeLabel,
  themeTypeLabel,
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
const negativeImpactSourceCount = computed(() =>
  props.sources.filter((source) =>
    themeImpactTone({ type: source.themeType ?? "", latestEventSignal: source.latestEventSignal ?? null }) === "negative",
  ).length,
);
const positiveImpactSourceCount = computed(() =>
  props.sources.filter((source) =>
    themeImpactTone({ type: source.themeType ?? "", latestEventSignal: source.latestEventSignal ?? null }) === "positive",
  ).length,
);

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
    return "优先排查最近运行异常、抓取失败或解析失真的来源，尤其是关联高优先级主题的来源。";
  }

  if (sourcePanelFocus.value === "pending") {
    return "优先看仍在排队或还没完成本轮抓取的来源。";
  }

  if (sourcePanelFocus.value === "healthy") {
    return "回看最近运行稳定、当前可作为基线参考的来源。";
  }

  return "快速查看来源运行状态，并结合所属主题最近信号判断哪些抓取链路更值得优先处理。";
});

const summary = computed(() => {
  if (sourcePanelFocus.value === "warning") {
    return `当前有 ${filteredSources.value.length} 个异常来源需要优先排查，其中关联偏利空主题的来源更值得先看。`;
  }

  if (sourcePanelFocus.value === "pending") {
    return `当前有 ${filteredSources.value.length} 个来源仍在等待或准备运行。`;
  }

  if (sourcePanelFocus.value === "healthy") {
    return `当前有 ${filteredSources.value.length} 个来源运行状态稳定。`;
  }

  return `共 ${props.sources.length} 个来源，其中 ${warningSourceCount.value} 个异常，${pendingSourceCount.value} 个待运行，${healthySourceCount.value} 个正常；关联主题判断上有 ${negativeImpactSourceCount.value} 个偏利空来源、${positiveImpactSourceCount.value} 个偏利好来源。`;
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
