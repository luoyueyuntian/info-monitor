<template>
  <article class="card">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3>周报摘要</h3>
        <div class="text-[0.88rem] text-ink-secondary">{{ summary.weekStart }} — {{ summary.weekEnd }}</div>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-[0.88rem] text-ink-secondary">共 {{ summary.totalEvents }} 条事件</span>
        <RouterLink
          to="/weekly-review"
          class="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600 hover:bg-slate-200"
        >
          查看全部
        </RouterLink>
        <button
          class="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600 hover:bg-slate-200"
          @click="showHistory = !showHistory"
        >
          {{ showHistory ? '收起历史' : '历史' }}
        </button>
        <button
          class="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 hover:bg-blue-200"
          :disabled="exporting"
          @click="handleExport"
        >
          {{ exporting ? '导出中...' : '导出' }}
        </button>
      </div>
    </div>

    <!-- History Panel (Task 11) -->
    <div v-if="showHistory" class="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
      <strong class="text-[0.86rem]">历史周报</strong>
      <div v-if="historyLoading" class="mt-2 text-sm text-slate-500">加载中...</div>
      <div v-else-if="history.length === 0" class="mt-2 text-sm text-slate-500">暂无历史数据</div>
      <div v-else class="mt-2 grid gap-2">
        <div
          v-for="(item, idx) in history"
          :key="idx"
          class="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm"
        >
          <div>
            <span class="font-medium">{{ item.weekStart }} ~ {{ item.weekEnd }}</span>
            <span class="ml-2 text-slate-500">{{ item.totalEvents }} 条</span>
          </div>
          <button
            class="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-200"
            @click="handleExportItem(item)"
          >
            导出
          </button>
        </div>
      </div>
    </div>

    <!-- Week-over-week Delta -->
    <div v-if="delta" class="mt-3 flex flex-wrap gap-3 text-[0.88rem]">
      <span :class="delta.totalEvents >= 0 ? 'text-emerald-600' : 'text-rose-600'">
        事件 {{ formatDelta(delta.totalEvents) }}
      </span>
      <span :class="delta.recentEvents >= 0 ? 'text-emerald-600' : 'text-rose-600'">
        近期 {{ formatDelta(delta.recentEvents) }}
      </span>
      <span :class="delta.newWarningSources <= 0 ? 'text-emerald-600' : 'text-rose-600'">
        异常来源 {{ formatDelta(delta.newWarningSources) }}
      </span>
    </div>

    <!-- Category Grid -->
    <div class="mt-3 grid grid-cols-2 gap-3">
      <div v-for="item in summary.items" :key="item.category" class="rounded-xl border border-slate-400/15 bg-white/70 px-3.5 py-3">
        <div class="text-[0.82rem] font-semibold text-ink-label">{{ item.label }}</div>
        <div class="mt-1 text-[1.2rem] font-bold text-ink-heading">{{ item.count }}</div>
        <div v-if="item.recentCount > 0" class="mt-1 text-[0.82rem] text-blue-600">本周 +{{ item.recentCount }}</div>
        <!-- Mini sparkline -->
        <div v-if="item.dailyTrend.some(v => v > 0)" class="mt-2 flex items-end gap-0.5 h-4">
          <div
            v-for="(val, idx) in item.dailyTrend"
            :key="idx"
            class="flex-1 rounded-t bg-blue-300"
            :style="{ height: `${Math.max(2, (val / Math.max(...item.dailyTrend)) * 16)}px` }"
            :title="`${summary.dayLabels[idx]}: ${val}`"
          />
        </div>
      </div>
    </div>

    <!-- Top Changes (复盘增强) -->
    <div v-if="summary.topChanges?.length" class="mt-3 rounded-xl border border-amber-200 bg-amber-50/50 px-3.5 py-3">
      <strong class="text-[0.88rem] text-amber-800">本周最重要的变化</strong>
      <div class="mt-1.5 grid gap-1">
        <div v-for="(change, idx) in summary.topChanges" :key="idx" class="text-[0.86rem] text-amber-700">
          {{ idx + 1 }}. {{ change }}
        </div>
      </div>
    </div>

    <!-- Top Themes to Follow -->
    <div v-if="summary.topThemesToFollow?.length" class="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/50 px-3.5 py-3">
      <strong class="text-[0.88rem] text-emerald-800">最值得跟进的主题</strong>
      <div class="mt-1.5 grid gap-1">
        <div v-for="(theme, idx) in summary.topThemesToFollow" :key="idx" class="text-[0.86rem] text-emerald-700">
          {{ idx + 1 }}. {{ theme }}
        </div>
      </div>
    </div>

    <!-- Dominant Category -->
    <div v-if="summary.dominantCategory" class="mt-3 rounded-xl border border-blue-200 bg-blue-50/50 px-3.5 py-3">
      <strong class="text-[0.88rem] text-blue-800">本周主要类型</strong>
      <div class="mt-1 text-[0.86rem] text-blue-700">
        {{ summary.dominantCategory.label }} 占本周新事件的 {{ summary.dominantCategory.percentage }}%
      </div>
    </div>

    <!-- Week-over-week Trend (Task 9) -->
    <div v-if="summary.weekOverWeekDelta" class="mt-3 flex items-center gap-2 text-[0.88rem]">
      <span :class="trendClass(summary.weekOverWeekDelta.trend)">
        {{ summary.weekOverWeekDelta.trend === 'up' ? '↑' : summary.weekOverWeekDelta.trend === 'down' ? '↓' : '→' }}
      </span>
      <span :class="summary.weekOverWeekDelta.recentEventsDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'">
        事件节奏 {{ formatDelta(summary.weekOverWeekDelta.recentEventsDelta) }}
      </span>
    </div>

    <!-- Direction Breakdown -->
    <div v-if="summary.directionBreakdown" class="mt-3 flex flex-wrap gap-3 text-[0.88rem]">
      <span class="inline-flex items-center gap-1 text-emerald-600">↑ 看多 {{ summary.directionBreakdown.bullish }}</span>
      <span class="inline-flex items-center gap-1 text-rose-600">↓ 看空 {{ summary.directionBreakdown.bearish }}</span>
      <span class="inline-flex items-center gap-1 text-slate-500">→ 中性 {{ summary.directionBreakdown.neutral }}</span>
    </div>

    <!-- Warning Sources -->
    <div v-if="summary.warningSources.length > 0" class="mt-3 rounded-xl border border-rose-200 bg-rose-50/50 px-3.5 py-3">
      <strong class="text-[0.88rem] text-rose-800">异常来源</strong>
      <div class="mt-1.5 grid gap-1">
        <div v-for="src in summary.warningSources" :key="src.id" class="text-[0.86rem] text-rose-700">
          {{ src.name }} — {{ src.lastErrorMessage ?? "状态异常" }}
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { fetchWeeklyReviewHistory, fetchWeeklyReviewExport, type WeeklySummary, type WeeklySummaryCompare } from "../../../lib/api";

defineProps<{
  summary: WeeklySummary;
  delta: WeeklySummaryCompare["delta"];
}>();

const showHistory = ref(false);
const historyLoading = ref(false);
const history = ref<WeeklySummary[]>([]);
const exporting = ref(false);

// Load history when panel is opened
async function loadHistory() {
  if (history.value.length > 0) return;
  historyLoading.value = true;
  try {
    history.value = await fetchWeeklyReviewHistory(4);
  } catch {
    // silently fail
  } finally {
    historyLoading.value = false;
  }
}

watch(showHistory, (val) => { if (val) loadHistory(); });

// Export current week
async function handleExport() {
  exporting.value = true;
  try {
    const result = await fetchWeeklyReviewExport("text");
    if (result && typeof result === "object" && "content" in result) {
      await navigator.clipboard.writeText(result.content as string);
      alert("已复制到剪贴板");
    }
  } catch {
    alert("导出失败");
  } finally {
    exporting.value = false;
  }
}

// Export a specific week
async function handleExportItem(item: WeeklySummary) {
  try {
    const text = formatWeeklySummaryText(item);
    await navigator.clipboard.writeText(text);
    alert("已复制到剪贴板");
  } catch {
    alert("导出失败");
  }
}

function formatWeeklySummaryText(s: WeeklySummary): string {
  const lines = [
    `# 周报: ${s.weekStart} ~ ${s.weekEnd}`,
    "",
    `总事件: ${s.totalEvents}`,
    `本周新增: ${s.recentEvents}`,
    `异常来源: ${s.warningSources.length}`,
    "",
  ];
  for (const item of s.items) {
    lines.push(`- ${item.label}: ${item.count} 总计, +${item.recentCount} 本周`);
  }
  return lines.join("\n");
}

function formatDelta(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

function trendClass(trend: string): string {
  switch (trend) {
    case "up": return "text-emerald-600 font-bold";
    case "down": return "text-rose-600 font-bold";
    default: return "text-slate-500";
  }
}
</script>
