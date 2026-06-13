<template>
  <article class="card">
    <div class="card-topline">
      <h3>最近运行</h3>
      <span v-if="driftWarnings.length > 0" class="text-xs font-semibold text-amber-600">
        ⚠ {{ driftWarnings.length }} 个异常信号
      </span>
    </div>

    <!-- Drift warnings -->
    <div v-if="driftWarnings.length > 0" class="mb-4 rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
      <div class="font-semibold mb-1">适配器健康提示:</div>
      <ul class="m-0 pl-4">
        <li v-for="(warning, i) in driftWarnings" :key="i">{{ warning }}</li>
      </ul>
    </div>

    <div class="flex flex-col gap-3">
      <div v-for="run in runs" :key="run.id" class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
        <div class="mb-3 flex flex-wrap items-center gap-2">
          <span :class="pillToneClass(run.status)">{{ runStatusLabel(run.status) }}</span>
          <span :class="run.triggerType === 'test' ? 'inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold bg-purple-100 text-purple-700' : pillToneClass()">
            {{ triggerTypeLabel(run.triggerType) }}
          </span>
        </div>
        <div class="flex flex-wrap gap-x-2.5 gap-y-2">
          <span class="text-[0.88rem] text-ink-secondary">开始: {{ formatDateTimeLabel(run.startedAt) }}</span>
          <span class="text-[0.88rem] text-ink-secondary">结束: {{ formatDateTimeLabel(run.finishedAt) }}</span>
        </div>
        <div v-if="run.errorMessage" class="text-ink-body">错误: {{ run.errorMessage }}</div>

        <!-- Per-run counts -->
        <div class="mt-3 grid grid-cols-4 gap-2">
          <div class="rounded-lg bg-white/70 px-2 py-1.5 text-center">
            <div class="text-xs text-gray-500">快照</div>
            <div class="text-sm font-semibold" :class="countDriftClass('snapshot', run.snapshotCount ?? 0)">{{ run.snapshotCount ?? 0 }}</div>
          </div>
          <div class="rounded-lg bg-white/70 px-2 py-1.5 text-center">
            <div class="text-xs text-gray-500">记录</div>
            <div class="text-sm font-semibold" :class="countDriftClass('record', run.recordCount ?? 0)">{{ run.recordCount ?? 0 }}</div>
          </div>
          <div class="rounded-lg bg-white/70 px-2 py-1.5 text-center">
            <div class="text-xs text-gray-500">变更</div>
            <div class="text-sm font-semibold">{{ run.changeCount ?? 0 }}</div>
          </div>
          <div class="rounded-lg bg-white/70 px-2 py-1.5 text-center">
            <div class="text-xs text-gray-500">事件</div>
            <div class="text-sm font-semibold">{{ run.eventCount ?? 0 }}</div>
          </div>
        </div>

        <!-- Expandable layer details -->
        <details v-if="run.status === 'failed' || (run.snapshotCount ?? 0) > 0" class="mt-2">
          <summary class="cursor-pointer text-xs font-semibold text-gray-600 hover:text-gray-800">
            Layer Breakdown
          </summary>
          <div class="mt-2 grid grid-cols-5 gap-1 text-xs">
            <div class="rounded bg-white/70 p-1.5 text-center">
              <div class="text-gray-500">Fetch</div>
              <div :class="(run.snapshotCount ?? 0) > 0 ? 'text-green-600' : 'text-red-600'">
                {{ (run.snapshotCount ?? 0) > 0 ? '✓' : '✗' }}
              </div>
            </div>
            <div class="rounded bg-white/70 p-1.5 text-center">
              <div class="text-gray-500">Parse</div>
              <div :class="(run.recordCount ?? 0) > 0 ? 'text-green-600' : (run.snapshotCount ?? 0) > 0 ? 'text-yellow-600' : 'text-gray-400'">
                {{ (run.recordCount ?? 0) > 0 ? '✓' : (run.snapshotCount ?? 0) > 0 ? '—' : '–' }}
              </div>
            </div>
            <div class="rounded bg-white/70 p-1.5 text-center">
              <div class="text-gray-500">Normalize</div>
              <div :class="(run.recordCount ?? 0) > 0 ? 'text-green-600' : 'text-gray-400'">
                {{ (run.recordCount ?? 0) > 0 ? '✓' : '–' }}
              </div>
            </div>
            <div class="rounded bg-white/70 p-1.5 text-center">
              <div class="text-gray-500">Detect</div>
              <div :class="(run.changeCount ?? 0) > 0 ? 'text-green-600' : 'text-gray-400'">
                {{ (run.changeCount ?? 0) > 0 ? '✓' : '–' }}
              </div>
            </div>
            <div class="rounded bg-white/70 p-1.5 text-center">
              <div class="text-gray-500">Emit</div>
              <div :class="(run.eventCount ?? 0) > 0 ? 'text-green-600' : 'text-gray-400'">
                {{ (run.eventCount ?? 0) > 0 ? '✓' : '–' }}
              </div>
            </div>
          </div>
        </details>

        <!-- Failure diagnosis with actionable hints -->
        <div v-if="run.status === 'failed'" class="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <div class="font-semibold">失败诊断:</div>
          <div v-if="(run.snapshotCount ?? 0) === 0">
            <div>抓取层失败 — 无法获取原始数据。</div>
            <div class="mt-1 text-red-600">建议: 检查目标 URL 是否可访问，网络是否正常，配置是否正确。</div>
          </div>
          <div v-else-if="(run.recordCount ?? 0) === 0 && (run.snapshotCount ?? 0) > 0">
            <div>抓取成功但无标准化记录。</div>
            <div class="mt-1 text-red-600">建议: 检查页面结构是否变化，CSS 选择器是否仍然有效，或页面是否返回了空内容。</div>
          </div>
          <div v-else-if="(run.changeCount ?? 0) === 0 && (run.eventCount ?? 0) === 0 && (run.recordCount ?? 0) > 0">
            <div>检测层 — 已有记录但未发现变更或事件。</div>
            <div class="mt-1 text-red-600">建议: 这可能是正常的（数据未变化），也可能是变更检测规则需要调整。</div>
          </div>
          <div v-else>运行完成但标记为失败。</div>
        </div>

        <!-- Silent degradation warning (completed but no records) -->
        <div v-if="run.status === 'completed' && (run.snapshotCount ?? 0) > 0 && (run.recordCount ?? 0) === 0" class="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <div class="font-semibold">⚠ 静默降级:</div>
          <div>运行完成但未产生任何记录。适配器可能需要更新。</div>
        </div>

        <!-- Rerun button for failed runs -->
        <div v-if="run.status === 'failed'" class="mt-3">
          <button
            class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-3 py-1.5 text-xs text-ink-emphasis transition-colors hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="rerunningRunId === run.id"
            @click="$emit('retry', run.id)"
          >
            {{ rerunningRunId === run.id ? "正在重新运行…" : "用当前配置重新运行" }}
          </button>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { SourceDetail } from "../../../../lib/api";
import { formatDateTimeLabel, pillToneClass, runStatusLabel } from "../../../../lib/presentation";

const props = defineProps<{
  runs: SourceDetail["runs"];
  rerunningRunId?: string | null;
}>();

defineEmits<{
  retry: [runId: string];
}>();

// Compute averages from completed runs for drift detection
const completedRuns = computed(() =>
  props.runs.filter((r) => r.status === "completed")
);

const avgRecords = computed(() => {
  if (completedRuns.value.length === 0) return 0;
  const total = completedRuns.value.reduce((sum, r) => sum + (r.recordCount ?? 0), 0);
  return total / completedRuns.value.length;
});

const avgSnapshots = computed(() => {
  if (completedRuns.value.length === 0) return 0;
  const total = completedRuns.value.reduce((sum, r) => sum + (r.snapshotCount ?? 0), 0);
  return total / completedRuns.value.length;
});

// Detect drift: current run's count is significantly below average
function countDriftClass(type: "snapshot" | "record", count: number): string {
  const avg = type === "snapshot" ? avgSnapshots.value : avgRecords.value;
  if (avg === 0 || count === 0) return "";
  // If count dropped below 50% of average, flag it
  if (count < avg * 0.5) return "text-amber-600";
  return "";
}

// Generate drift warnings
const driftWarnings = computed(() => {
  const warnings: string[] = [];
  const runs = props.runs;

  if (runs.length < 2) return warnings;

  const latest = runs[0];
  if (!latest) return warnings;

  // Check for record count drop
  if (latest.status === "completed" && avgRecords.value > 0 && (latest.recordCount ?? 0) < avgRecords.value * 0.5) {
    warnings.push(`记录数 (${latest.recordCount ?? 0}) 显著低于平均值 (${Math.round(avgRecords.value)})，页面结构可能已变化。`);
  }

  // Check for snapshot count drop
  if (latest.status === "completed" && avgSnapshots.value > 0 && (latest.snapshotCount ?? 0) < avgSnapshots.value * 0.5) {
    warnings.push(`快照数 (${latest.snapshotCount ?? 0}) 显著低于平均值 (${Math.round(avgSnapshots.value)})，抓取可能异常。`);
  }

  // Check for consecutive failures
  const recentFailures = runs.slice(0, 3).filter((r) => r.status === "failed").length;
  if (recentFailures >= 2) {
    warnings.push(`最近 ${runs.slice(0, 3).length} 次运行中有 ${recentFailures} 次失败，建议检查来源配置。`);
  }

  // Check for completed but zero records (silent degradation)
  if (latest.status === "completed" && (latest.snapshotCount ?? 0) > 0 && (latest.recordCount ?? 0) === 0) {
    warnings.push("最近运行完成但未产生记录，适配器可能需要更新。");
  }

  return warnings;
});

function triggerTypeLabel(triggerType: string): string {
  switch (triggerType) {
    case "test": return "测试运行";
    case "manual": return "手动运行";
    case "scheduled": return "定时运行";
    default: return triggerType;
  }
}
</script>
