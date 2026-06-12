<template>
  <section class="flex flex-col gap-5">
    <header>
      <h2 class="mb-2 text-[1.8rem] font-semibold text-ink">来源健康监控</h2>
      <p class="m-0 leading-7 text-[#675d4f]">监控数据源的运行状态、成功率和最近异常。</p>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-400/15 bg-white/78 p-12">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-[#2f2618] border-t-transparent"></div>
      <p class="text-[0.92rem] text-ink-body">正在加载健康数据...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="rounded-2xl border border-rose-200 bg-rose-50/50 p-6">
      <div class="flex items-start gap-3">
        <span class="mt-0.5 text-lg text-rose-500">⚠</span>
        <div class="flex-1">
          <h3 class="text-[0.95rem] font-semibold text-rose-800">加载失败</h3>
          <p class="mt-1 text-[0.88rem] text-rose-600">{{ error }}</p>
          <button
            class="mt-3 inline-flex items-center justify-center rounded-xl border border-rose-200 bg-white px-4 py-2 text-[0.82rem] font-semibold text-rose-700 transition-colors hover:bg-rose-50"
            @click="void loadStats()"
          >
            重试
          </button>
        </div>
      </div>
    </div>

    <template v-else-if="stats">
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-[18px] border border-slate-400/15 bg-white/78 p-[18px] shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <div class="text-[0.82rem] font-semibold text-ink-muted">总来源数</div>
          <div class="mt-1 text-2xl font-bold text-ink-heading">{{ stats.totalSources }}</div>
        </div>
        <div class="rounded-[18px] border border-slate-400/15 bg-white/78 p-[18px] shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <div class="text-[0.82rem] font-semibold text-ink-muted">健康率</div>
          <div class="mt-1 text-2xl font-bold" :class="stats.healthRate >= 0.8 ? 'text-emerald-600' : 'text-rose-600'">
            {{ (stats.healthRate * 100).toFixed(0) }}%
          </div>
        </div>
        <div class="rounded-[18px] border border-slate-400/15 bg-white/78 p-[18px] shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <div class="text-[0.82rem] font-semibold text-ink-muted">24h 运行成功率</div>
          <div class="mt-1 text-2xl font-bold" :class="stats.recentRuns.successRate >= 0.8 ? 'text-emerald-600' : 'text-rose-600'">
            {{ (stats.recentRuns.successRate * 100).toFixed(0) }}%
          </div>
        </div>
        <div class="rounded-[18px] border border-slate-400/15 bg-white/78 p-[18px] shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <div class="text-[0.82rem] font-semibold text-ink-muted">平均运行时长</div>
          <div class="mt-1 text-2xl font-bold text-ink-heading">
            {{ stats.averageRunDuration ? `${(stats.averageRunDuration / 1000).toFixed(1)}s` : '-' }}
          </div>
        </div>
      </div>

      <!-- Status Breakdown -->
      <div class="rounded-[18px] border border-slate-400/15 bg-white/78 p-[18px] shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
        <h3 class="mb-4 text-[1.05rem] font-semibold text-ink-heading">状态分布</h3>
        <div class="flex flex-wrap gap-4">
          <div class="flex items-center gap-2">
            <span class="h-3 w-3 rounded-full bg-emerald-500"></span>
            <span class="text-[0.88rem] text-ink-body">健康: {{ stats.healthySources }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="h-3 w-3 rounded-full bg-amber-500"></span>
            <span class="text-[0.88rem] text-ink-body">警告: {{ stats.warningSources }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="h-3 w-3 rounded-full bg-slate-400"></span>
            <span class="text-[0.88rem] text-ink-body">暂停: {{ stats.pausedSources }}</span>
          </div>
        </div>
      </div>

      <!-- Recent Errors -->
      <div v-if="stats.recentErrors.length" class="rounded-[18px] border border-rose-200 bg-rose-50/50 p-[18px]">
        <h3 class="mb-4 text-[1.05rem] font-semibold text-rose-800">最近错误</h3>
        <div class="flex flex-col gap-3">
          <div
            v-for="error in stats.recentErrors"
            :key="error.sourceId + error.occurredAt"
            class="rounded-xl border border-rose-200 bg-white p-3"
          >
            <div class="flex items-center justify-between">
              <span class="font-semibold text-ink-heading">{{ error.sourceName }}</span>
              <span class="text-[0.82rem] text-ink-muted">{{ formatTime(error.occurredAt) }}</span>
            </div>
            <p class="mt-1 text-[0.88rem] text-rose-600">{{ error.errorMessage }}</p>
          </div>
        </div>
      </div>

      <!-- Source Details Table -->
      <div class="rounded-[18px] border border-slate-400/15 bg-white/78 p-[18px] shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
        <h3 class="mb-4 text-[1.05rem] font-semibold text-ink-heading">来源详情</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-[0.88rem]">
            <thead>
              <tr class="border-b border-slate-200">
                <th class="pb-2 font-semibold text-ink-label">来源</th>
                <th class="pb-2 font-semibold text-ink-label">主题</th>
                <th class="pb-2 font-semibold text-ink-label">状态</th>
                <th class="pb-2 font-semibold text-ink-label">24h 运行</th>
                <th class="pb-2 font-semibold text-ink-label">成功率</th>
                <th class="pb-2 font-semibold text-ink-label">最近运行</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="source in stats.sourceDetails"
                :key="source.id"
                class="border-b border-slate-100"
              >
                <td class="py-3">
                  <RouterLink
                    class="font-semibold text-ink-link hover:underline"
                    :to="`/sources/${source.id}`"
                  >
                    {{ source.name }}
                  </RouterLink>
                </td>
                <td class="py-3 text-ink-body">{{ source.themeName }}</td>
                <td class="py-3">
                  <span :class="statusPillClass(source.status, source.isPaused)">
                    {{ statusLabel(source.status, source.isPaused) }}
                  </span>
                </td>
                <td class="py-3 text-ink-body">
                  {{ source.runCount24h }} 次
                  <span v-if="source.failureCount24h > 0" class="text-rose-600">
                    ({{ source.failureCount24h }} 失败)
                  </span>
                </td>
                <td class="py-3">
                  <span :class="source.runCount24h > 0 && source.successCount24h / source.runCount24h >= 0.8 ? 'text-emerald-600' : 'text-rose-600'">
                    {{ source.runCount24h > 0 ? ((source.successCount24h / source.runCount24h) * 100).toFixed(0) : '-' }}%
                  </span>
                </td>
                <td class="py-3 text-ink-muted">
                  {{ source.latestRunAt ? formatTime(source.latestRunAt) : '-' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";

import { fetchSourceHealthStats, type SourceHealthStats } from "../../lib/api";

const stats = ref<SourceHealthStats | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

function statusLabel(status: string, isPaused: boolean): string {
  if (isPaused) return "暂停";
  if (status === "healthy") return "健康";
  if (status === "warning") return "警告";
  return status;
}

function statusPillClass(status: string, isPaused: boolean): string {
  const base = "inline-flex items-center rounded-lg px-2.5 py-1 text-[0.78rem] font-semibold";

  if (isPaused) return `${base} bg-slate-100 text-slate-600`;
  if (status === "healthy") return `${base} bg-emerald-50 text-emerald-700`;
  if (status === "warning") return `${base} bg-amber-50 text-amber-700`;
  return `${base} bg-slate-100 text-slate-500`;
}

function formatTime(value: string): string {
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

async function loadStats() {
  loading.value = true;
  error.value = null;

  try {
    stats.value = await fetchSourceHealthStats();
  } catch (e) {
    error.value = e instanceof Error ? e.message : "未知错误，请稍后重试";
    console.error("Failed to load source health stats:", e);
  } finally {
    loading.value = false;
  }
}

onMounted(() => void loadStats());
</script>
