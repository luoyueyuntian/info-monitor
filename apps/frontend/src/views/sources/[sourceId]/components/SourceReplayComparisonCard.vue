<template>
  <article class="card" v-if="comparison">
    <h3>回放对比</h3>
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <span :class="statusClass(comparison.status)">
        {{ statusLabel(comparison.status) }}
      </span>
      <span v-if="comparison.originalRunId" class="text-[0.88rem] text-ink-secondary">
        对比原始运行: {{ comparison.originalRunId }}
      </span>
      <span v-else class="text-[0.88rem] text-ink-secondary">无原始运行可对比</span>
    </div>

    <!-- Count comparison grid -->
    <div class="grid grid-cols-3 gap-3 mb-4">
      <div class="rounded-xl bg-slate-50 px-3 py-3 text-center">
        <div class="text-xs text-gray-500 mb-1">标准化记录</div>
        <div class="text-lg font-semibold">{{ comparison.replay.recordCount }}</div>
        <div v-if="comparison.originalRunId" class="text-xs" :class="deltaClass(comparison.deltas.recordDelta)">
          {{ deltaLabel(comparison.deltas.recordDelta) }}
        </div>
        <div v-if="comparison.originalRunId" class="text-[0.78rem] text-gray-400">原始: {{ comparison.original.recordCount }}</div>
      </div>
      <div class="rounded-xl bg-slate-50 px-3 py-3 text-center">
        <div class="text-xs text-gray-500 mb-1">变更</div>
        <div class="text-lg font-semibold">{{ comparison.replay.changeCount }}</div>
        <div v-if="comparison.originalRunId" class="text-xs" :class="deltaClass(comparison.deltas.changeDelta)">
          {{ deltaLabel(comparison.deltas.changeDelta) }}
        </div>
        <div v-if="comparison.originalRunId" class="text-[0.78rem] text-gray-400">原始: {{ comparison.original.changeCount }}</div>
      </div>
      <div class="rounded-xl bg-slate-50 px-3 py-3 text-center">
        <div class="text-xs text-gray-500 mb-1">事件</div>
        <div class="text-lg font-semibold">{{ comparison.replay.eventCount }}</div>
        <div v-if="comparison.originalRunId" class="text-xs" :class="deltaClass(comparison.deltas.eventDelta)">
          {{ deltaLabel(comparison.deltas.eventDelta) }}
        </div>
        <div v-if="comparison.originalRunId" class="text-[0.78rem] text-gray-400">原始: {{ comparison.original.eventCount }}</div>
      </div>
    </div>

    <!-- Failure layer diagnosis -->
    <div v-if="comparison.failureLayer" class="rounded-xl bg-red-50 px-3.5 py-3 text-sm text-red-700">
      <div class="font-semibold mb-1">失败层诊断:</div>
      <div v-if="comparison.failureLayer === 'normalize'">
        标准化层失败 — 快照数据无法被正常解析。可能原因: 原始数据格式变化或标准化器不兼容。
      </div>
      <div v-else-if="comparison.failureLayer === 'detect'">
        变更检测层失败 — 记录已标准化但未检测到变更。可能原因: 变更检测规则需要调整。
      </div>
      <div v-else-if="comparison.failureLayer === 'rule'">
        事件规则层失败 — 变更已检测但未触发事件。可能原因: 事件规则条件未满足。
      </div>
    </div>

    <!-- Divergence explanation -->
    <div v-if="hasDivergence" class="mt-3 rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-700">
      <div class="font-semibold mb-1">结果差异分析:</div>
      <ul class="m-0 pl-4">
        <li v-if="comparison.deltas.recordDelta !== 0">
          记录数{{ comparison.deltas.recordDelta > 0 ? "增加" : "减少" }}了 {{ Math.abs(comparison.deltas.recordDelta) }} 条，说明标准化逻辑或输入数据发生了变化。
        </li>
        <li v-if="comparison.deltas.changeDelta !== 0">
          变更数{{ comparison.deltas.changeDelta > 0 ? "增加" : "减少" }}了 {{ Math.abs(comparison.deltas.changeDelta) }} 条，说明变更检测行为发生了变化。
        </li>
        <li v-if="comparison.deltas.eventDelta !== 0">
          事件数{{ comparison.deltas.eventDelta > 0 ? "增加" : "减少" }}了 {{ Math.abs(comparison.deltas.eventDelta) }} 条，说明事件触发逻辑发生了变化。
        </li>
      </ul>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { SourceReplayComparison } from "../../../../lib/api";
import { pillToneClass } from "../../../../lib/presentation";

const props = defineProps<{
  comparison: SourceReplayComparison | null;
}>();

const hasDivergence = computed(() => {
  if (!props.comparison?.originalRunId) return false;
  const d = props.comparison.deltas;
  return d.recordDelta !== 0 || d.changeDelta !== 0 || d.eventDelta !== 0;
});

function deltaClass(delta: number): string {
  if (delta > 0) return "text-green-600";
  if (delta < 0) return "text-red-600";
  return "text-gray-500";
}

function deltaLabel(delta: number): string {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `${delta}`;
  return "无变化";
}

function statusClass(status: string): string {
  if (status === "completed") return pillToneClass("completed");
  if (status === "failed") return pillToneClass("failed");
  return pillToneClass(); // pending/running use default
}

function statusLabel(status: string): string {
  if (status === "completed") return "回放完成";
  if (status === "failed") return "回放失败";
  if (status === "running") return "回放中…";
  return "回放排队中…";
}
</script>
