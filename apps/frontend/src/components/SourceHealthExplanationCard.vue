<template>
  <article class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="grid gap-1">
        <div class="flex flex-wrap items-center gap-2">
          <strong class="text-[1rem] text-ink-heading">{{ explanation.sourceName }}</strong>
          <span :class="healthStatusClass(explanation.status)">{{ healthStatusLabel(explanation.status) }}</span>
          <span :class="impactLevelClass(explanation.impactLevel)">{{ impactLevelLabel(explanation.impactLevel) }}</span>
        </div>
        <div class="text-[0.88rem] text-ink-secondary">
          健康分数: {{ explanation.healthScore }}/100
        </div>
      </div>
    </div>

    <!-- Primary Issue -->
    <div v-if="explanation.issue" class="mt-3 rounded-xl border border-slate-400/15 bg-white/70 px-3.5 py-3">
      <div class="text-[0.92rem] font-semibold text-[#1f2937]">{{ explanation.issue }}</div>
      <div v-if="explanation.impact" class="mt-1 text-[0.88rem] text-[#4b5563]">{{ explanation.impact }}</div>
    </div>

    <!-- Detailed Issues -->
    <div v-if="explanation.issues.length > 0" class="mt-3 grid gap-2">
      <div
        v-for="issue in explanation.issues"
        :key="issue.type"
        class="rounded-xl border border-slate-400/15 bg-white/70 px-3.5 py-2.5"
      >
        <div class="flex flex-wrap items-center gap-2">
          <span :class="issueTypeClass(issue.type)">{{ issueTypeLabel(issue.type) }}</span>
          <span class="text-[0.9rem] font-medium text-[#1f2937]">{{ issue.label }}</span>
        </div>
        <div class="mt-1 text-[0.86rem] text-[#4b5563]">{{ issue.description }}</div>
        <div class="mt-1 text-[0.84rem] text-ink-secondary">影响: {{ issue.impact }}</div>
      </div>
    </div>

    <!-- Impact Description -->
    <div class="mt-3 rounded-xl border border-slate-400/15 bg-white/70 px-3.5 py-2.5">
      <div class="text-[0.88rem] font-medium text-ink-heading">对主题判断的影响</div>
      <div class="mt-1 text-[0.86rem] text-[#4b5563]">{{ impactDescription(explanation) }}</div>
    </div>

    <!-- Recommendation -->
    <div v-if="explanation.recommendation" class="mt-3 rounded-xl border border-blue-200 bg-blue-50/70 px-3.5 py-2.5">
      <div class="text-[0.88rem] font-medium text-blue-800">建议操作</div>
      <div class="mt-1 text-[0.86rem] text-blue-700">{{ explanation.recommendation }}</div>
    </div>

    <!-- Health Score Bar -->
    <div class="mt-3">
      <div class="flex items-center justify-between text-[0.82rem] text-ink-secondary">
        <span>健康分数</span>
        <span>{{ explanation.healthScore }}/100</span>
      </div>
      <div class="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          class="h-full rounded-full transition-all duration-300"
          :class="healthScoreBarClass"
          :style="{ width: `${explanation.healthScore}%` }"
        />
      </div>
    </div>

    <!-- Score Breakdown -->
    <div v-if="explanation.breakdown" class="mt-3 rounded-xl border border-slate-400/15 bg-white/70 px-3.5 py-3">
      <div class="text-[0.88rem] font-medium text-ink-heading mb-2">分数构成</div>
      <div class="grid gap-2">
        <div v-for="dim in breakdownDimensions" :key="dim.key" class="flex items-center gap-3">
          <div class="w-16 shrink-0 text-[0.82rem] text-ink-secondary">{{ dim.label }}</div>
          <div class="flex-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div
              class="h-full rounded-full transition-all duration-300"
              :class="breakdownBarClass(dim.value)"
              :style="{ width: `${dim.value}%` }"
            />
          </div>
          <div class="w-8 shrink-0 text-right text-[0.82rem] text-ink-secondary">{{ dim.value }}</div>
        </div>
      </div>
      <div class="mt-2 text-[0.78rem] text-ink-secondary">
        各维度满分 100，综合反映来源健康状况
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { SourceHealthExplanation } from "../lib/api";
import {
  healthStatusClass,
  healthStatusLabel,
  impactLevelClass,
  impactLevelLabel,
  issueTypeClass,
  issueTypeLabel,
  impactDescription,
} from "../lib/source-health-explanation";

const props = defineProps<{
  explanation: SourceHealthExplanation;
}>();

const healthScoreBarClass = computed(() => {
  if (props.explanation.healthScore > 80) return "bg-green-500";
  if (props.explanation.healthScore >= 60) return "bg-amber-500";
  return "bg-red-500";
});

const breakdownDimensions = computed(() => {
  if (!props.explanation.breakdown) return [];
  const b = props.explanation.breakdown;
  return [
    { key: "freshness", label: "新鲜度", value: b.freshness },
    { key: "stability", label: "稳定性", value: b.stability },
    { key: "completeness", label: "完整性", value: b.completeness },
    { key: "timeliness", label: "时效性", value: b.timeliness },
  ];
});

function breakdownBarClass(value: number): string {
  if (value > 80) return "bg-green-500";
  if (value >= 60) return "bg-amber-500";
  return "bg-red-500";
}
</script>
