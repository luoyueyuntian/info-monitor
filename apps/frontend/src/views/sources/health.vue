<template>
  <section class="page flex flex-col gap-5">
    <header class="rounded-[28px] border border-slate-400/15 bg-[linear-gradient(135deg,rgba(251,248,241,0.96),rgba(255,255,255,0.98))] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div class="max-w-3xl">
          <div class="text-[0.82rem] uppercase tracking-[0.22em] text-ink-label">System Monitor</div>
          <h2 class="mt-2 text-[2rem] font-semibold text-ink-heading">系统健康仪表盘</h2>
          <p class="mt-3 max-w-2xl text-[0.96rem] leading-7 text-ink-body">
            统一检查已启用数据源的抓取、入库、规则输出和调度积压情况。出现异常时，可以直接从这里进入对应来源日志继续排查。
          </p>
        </div>
        <div class="flex flex-wrap gap-3">
          <RouterLink
            to="/sources/status"
            class="inline-flex items-center justify-center rounded-2xl border border-slate-300/70 bg-white px-4 py-2.5 text-[0.88rem] font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            查看抓取日志总览
          </RouterLink>
          <RouterLink
            v-if="primaryLogSource"
            :to="`/sources/${primaryLogSource.id}`"
            class="inline-flex items-center justify-center rounded-2xl bg-btn-primary px-4 py-2.5 text-[0.88rem] font-semibold text-ink-emphasis transition-colors hover:bg-btn-primary-hover"
          >
            查看最近异常来源日志
          </RouterLink>
        </div>
      </div>
    </header>

    <div v-if="loading" class="card flex flex-col items-center justify-center gap-3 py-14">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-[#2f2618] border-t-transparent"></div>
      <p class="text-[0.92rem] text-ink-body">正在汇总系统健康数据...</p>
    </div>

    <div v-else-if="error" class="card border border-rose-200 bg-rose-50/60">
      <div class="flex items-start gap-3">
        <span class="mt-0.5 text-lg text-rose-500">⚠</span>
        <div class="flex-1">
          <h3 class="text-[0.95rem] font-semibold text-rose-800">健康数据加载失败</h3>
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
      <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <article
          v-for="metric in topMetrics"
          :key="metric.label"
          class="rounded-[24px] border border-slate-400/15 bg-white/88 p-5 shadow-[0_14px_32px_rgba(15,23,42,0.05)]"
        >
          <div class="text-[0.8rem] uppercase tracking-[0.08em] text-ink-label">{{ metric.label }}</div>
          <div class="mt-3 flex items-end justify-between gap-3">
            <div class="text-[1.8rem] font-semibold text-ink-heading">{{ metric.value }}</div>
            <span
              v-if="metric.toneLabel"
              class="inline-flex items-center rounded-full px-2.5 py-1 text-[0.75rem] font-semibold"
              :class="metric.toneClass"
            >
              {{ metric.toneLabel }}
            </span>
          </div>
          <div class="mt-2 text-[0.9rem] leading-6 text-ink-body">{{ metric.description }}</div>
        </article>
      </section>

      <section class="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
        <article class="card">
          <div class="card-topline">
            <h3>系统检查项</h3>
            <span class="text-[0.88rem] text-ink-secondary">按抓取链路拆解检查</span>
          </div>
          <div class="grid gap-3 md:grid-cols-2">
            <div
              v-for="check in stats.systemChecks"
              :key="check.id"
              class="rounded-2xl border border-slate-400/15 bg-slate-50/85 p-4"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="font-semibold text-ink-heading">{{ check.label }}</div>
                <span :class="checkPillClass(check.status)">{{ checkStatusLabel(check.status) }}</span>
              </div>
              <div class="mt-3 text-[0.92rem] leading-6 text-ink-body">{{ check.summary }}</div>
              <div class="mt-2 text-[0.86rem] leading-6 text-ink-secondary">{{ check.description }}</div>
              <div class="mt-3 flex flex-wrap gap-2 text-[0.8rem] text-ink-secondary">
                <span class="rounded-full bg-white px-2.5 py-1">正常 {{ check.healthyCount }}</span>
                <span class="rounded-full bg-white px-2.5 py-1">异常 {{ check.warningCount }}</span>
                <span class="rounded-full bg-white px-2.5 py-1">进行中 {{ check.pendingCount }}</span>
              </div>
            </div>
          </div>
        </article>

        <article class="card">
          <div class="card-topline">
            <h3>日志入口</h3>
            <span class="text-[0.88rem] text-ink-secondary">从总览跳到具体来源</span>
          </div>
          <div class="grid gap-3">
            <RouterLink
              to="/sources/status"
              class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-4 transition-colors hover:bg-white"
            >
              <div class="font-semibold text-ink-heading">抓取状态总览</div>
              <div class="mt-2 text-[0.9rem] leading-6 text-ink-body">
                查看所有来源最近运行状态、成功时间、失败时间和手动补跑入口。
              </div>
            </RouterLink>
            <RouterLink
              v-for="source in highlightedLogSources"
              :key="source.id"
              :to="`/sources/${source.id}`"
              class="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-4 transition-colors hover:bg-amber-50"
            >
              <div class="flex items-center justify-between gap-3">
                <div class="font-semibold text-ink-heading">{{ source.name }}</div>
                <span :class="checkPillClass(source.status === 'paused' ? 'pending' : source.status === 'healthy' ? 'healthy' : 'warning')">
                  {{ sourceStatusLabel(source.status) }}
                </span>
              </div>
              <div class="mt-2 text-[0.88rem] text-ink-secondary">{{ source.themeName }}</div>
              <div class="mt-2 text-[0.9rem] leading-6 text-ink-body">
                {{ source.issueSummary ?? source.lastErrorMessage ?? "最近需要重点回看的来源日志入口。" }}
              </div>
            </RouterLink>
          </div>
        </article>
      </section>

      <section class="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <article class="card">
          <div class="card-topline">
            <h3>最近错误</h3>
            <span class="text-[0.88rem] text-ink-secondary">优先处理会影响结论可信度的失败</span>
          </div>
          <div v-if="stats.recentErrors.length" class="grid gap-3">
            <div
              v-for="errorItem in stats.recentErrors"
              :key="`${errorItem.sourceId}-${errorItem.occurredAt}`"
              class="rounded-2xl border border-rose-200 bg-rose-50/65 px-4 py-4"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <RouterLink
                  :to="`/sources/${errorItem.sourceId}`"
                  class="font-semibold text-ink-link transition-colors hover:text-ink-heading"
                >
                  {{ errorItem.sourceName }}
                </RouterLink>
                <span class="text-[0.82rem] text-ink-secondary">{{ formatDateTimeLabel(errorItem.occurredAt) }}</span>
              </div>
              <div class="mt-2 text-[0.92rem] leading-6 text-rose-700">{{ errorItem.errorMessage }}</div>
            </div>
          </div>
          <div v-else class="rounded-2xl bg-slate-50/90 px-4 py-4 text-ink-body">
            最近没有新的失败记录，抓取链路暂时稳定。
          </div>
        </article>

        <article class="card">
          <div class="card-topline">
            <h3>异常聚合</h3>
            <span class="text-[0.88rem] text-ink-secondary">识别重复出现的问题模式</span>
          </div>
          <div v-if="stats.recentExceptions.length" class="grid gap-3">
            <div
              v-for="exception in stats.recentExceptions"
              :key="`${exception.errorMessage}-${exception.lastOccurredAt}`"
              class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-4"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="font-semibold text-ink-heading">{{ exception.errorMessage }}</div>
                <span class="rounded-full bg-white px-2.5 py-1 text-[0.78rem] font-semibold text-slate-600">
                  {{ exception.count }} 次
                </span>
              </div>
              <div class="mt-2 text-[0.88rem] text-ink-secondary">
                最近出现：{{ formatDateTimeLabel(exception.lastOccurredAt) }}
              </div>
              <div class="mt-2 text-[0.9rem] leading-6 text-ink-body">
                影响 {{ exception.sourceIds.length }} 个来源，适合优先排查公共适配器或上游站点问题。
              </div>
            </div>
          </div>
          <div v-else class="rounded-2xl bg-slate-50/90 px-4 py-4 text-ink-body">
            最近没有聚合异常，说明没有明显的批量故障模式。
          </div>
        </article>
      </section>

      <article class="card">
        <div class="card-topline">
          <h3>来源链路明细</h3>
          <span class="text-[0.88rem] text-ink-secondary">逐个渠道查看抓取、入库和输出状态</span>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full text-left text-[0.88rem]">
            <thead>
              <tr class="border-b border-slate-200 text-ink-label">
                <th class="pb-3 pr-4 font-semibold">来源</th>
                <th class="pb-3 pr-4 font-semibold">综合健康</th>
                <th class="pb-3 pr-4 font-semibold">抓取</th>
                <th class="pb-3 pr-4 font-semibold">入库</th>
                <th class="pb-3 pr-4 font-semibold">输出</th>
                <th class="pb-3 pr-4 font-semibold">最近结果</th>
                <th class="pb-3 pr-4 font-semibold">24h 运行</th>
                <th class="pb-3 font-semibold">日志</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="source in sortedSourceDetails"
                :key="source.id"
                class="border-b border-slate-100 align-top"
              >
                <td class="py-4 pr-4">
                  <RouterLink
                    :to="`/sources/${source.id}`"
                    class="font-semibold text-ink-link transition-colors hover:text-ink-heading"
                  >
                    {{ source.name }}
                  </RouterLink>
                  <div class="mt-1 text-[0.82rem] text-ink-secondary">{{ source.themeName }} · {{ sourceTypeLabel(source.sourceType ?? null) }}</div>
                  <div v-if="source.issueSummary" class="mt-2 text-[0.82rem] leading-5 text-amber-700">{{ source.issueSummary }}</div>
                </td>
                <td class="py-4 pr-4">
                  <div class="flex flex-wrap items-center gap-2">
                    <span :class="checkPillClass(source.status === 'paused' ? 'pending' : source.status === 'healthy' ? 'healthy' : 'warning')">
                      {{ sourceStatusLabel(source.status) }}
                    </span>
                    <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[0.78rem] font-semibold text-slate-700">
                      {{ source.healthScore }} 分
                    </span>
                  </div>
                  <div class="mt-2 text-[0.82rem] text-ink-secondary">
                    最近运行：{{ source.latestRunAt ? formatDateTimeLabel(source.latestRunAt) : "暂无" }}
                  </div>
                </td>
                <td class="py-4 pr-4">
                  <span :class="checkPillClass(source.pipeline.fetch.status)">{{ source.pipeline.fetch.label }}</span>
                  <div class="mt-2 text-[0.82rem] leading-5 text-ink-secondary">{{ source.pipeline.fetch.detail }}</div>
                </td>
                <td class="py-4 pr-4">
                  <span :class="checkPillClass(source.pipeline.ingest.status)">{{ source.pipeline.ingest.label }}</span>
                  <div class="mt-2 text-[0.82rem] leading-5 text-ink-secondary">{{ source.pipeline.ingest.detail }}</div>
                </td>
                <td class="py-4 pr-4">
                  <span :class="checkPillClass(source.pipeline.output.status)">{{ source.pipeline.output.label }}</span>
                  <div class="mt-2 text-[0.82rem] leading-5 text-ink-secondary">{{ source.pipeline.output.detail }}</div>
                </td>
                <td class="py-4 pr-4 text-ink-body">
                  <div>快照 {{ source.latestSnapshotCount }}</div>
                  <div>记录 {{ source.latestRecordCount }}</div>
                  <div>变更 {{ source.latestChangeCount }}</div>
                  <div>事件 {{ source.latestEventCount }}</div>
                </td>
                <td class="py-4 pr-4 text-ink-body">
                  <div>{{ source.runCount24h }} 次</div>
                  <div class="text-[0.82rem] text-ink-secondary">
                    成功 {{ source.successCount24h }} · 失败 {{ source.failureCount24h }}
                  </div>
                  <div class="mt-1 text-[0.82rem] text-ink-secondary">
                    最近状态：{{ runStatusLabel(source.latestRunStatus) }}
                  </div>
                </td>
                <td class="py-4">
                  <RouterLink
                    :to="`/sources/${source.id}`"
                    class="inline-flex items-center justify-center rounded-xl border border-slate-300/70 bg-white px-3 py-2 text-[0.82rem] font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    查看日志
                  </RouterLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import { fetchSourceHealthStats, type SourceHealthStats } from "../../lib/api";
import { formatDateTimeLabel, runStatusLabel, sourceStatusLabel, sourceTypeLabel } from "../../lib/presentation";

const stats = ref<SourceHealthStats | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const topMetrics = computed(() => {
  if (!stats.value) {
    return [];
  }

  return [
    {
      label: "系统总分",
      value: `${stats.value.overallScore}`,
      description: "综合抓取成功、入库成功、规则输出和近期稳定性得出的整体健康分。",
      toneLabel: stats.value.overallScore >= 85 ? "稳定" : stats.value.overallScore >= 70 ? "关注" : "告警",
      toneClass: stats.value.overallScore >= 85 ? "bg-emerald-50 text-emerald-700" : stats.value.overallScore >= 70 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700",
    },
    {
      label: "已启用渠道",
      value: `${stats.value.activeSources}/${stats.value.totalSources}`,
      description: `当前有 ${stats.value.pausedSources} 个来源处于暂停状态。`,
      toneLabel: "",
      toneClass: "",
    },
    {
      label: "健康率",
      value: percentLabel(stats.value.healthRate),
      description: "按最近一次整体状态判断，当前仍可直接信任的活跃渠道比例。",
      toneLabel: stats.value.healthRate >= 0.8 ? "稳定" : "关注",
      toneClass: stats.value.healthRate >= 0.8 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
    },
    {
      label: "抓取可用率",
      value: percentLabel(stats.value.fetchAvailability),
      description: "最近一次运行能否成功拿到原始快照。",
      toneLabel: stats.value.fetchAvailability >= 0.8 ? "正常" : "波动",
      toneClass: stats.value.fetchAvailability >= 0.8 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
    },
    {
      label: "入库可用率",
      value: percentLabel(stats.value.ingestionAvailability),
      description: "最近一次运行能否把抓到的数据正常写入标准化记录。",
      toneLabel: stats.value.ingestionAvailability >= 0.8 ? "正常" : "波动",
      toneClass: stats.value.ingestionAvailability >= 0.8 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
    },
    {
      label: "队列积压",
      value: `${stats.value.backlog.pendingRuns + stats.value.backlog.runningRuns}`,
      description: queueDescription(stats.value),
      toneLabel: stats.value.backlog.pendingRuns > 0 || stats.value.backlog.runningRuns > 0 ? "处理中" : "无积压",
      toneClass: stats.value.backlog.pendingRuns > 2 ? "bg-rose-50 text-rose-700" : stats.value.backlog.pendingRuns > 0 || stats.value.backlog.runningRuns > 0 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700",
    },
  ];
});

const sortedSourceDetails = computed(() => {
  if (!stats.value) {
    return [];
  }

  const order = { warning: 0, healthy: 1, paused: 2 };
  return [...stats.value.sourceDetails].sort((left, right) => {
    const leftRank = order[left.status as keyof typeof order] ?? 3;
    const rightRank = order[right.status as keyof typeof order] ?? 3;
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return right.healthScore - left.healthScore;
  });
});

const highlightedLogSources = computed(() => {
  if (!stats.value) {
    return [];
  }

  return sortedSourceDetails.value
    .filter((source) => source.status === "warning" || Boolean(source.lastErrorMessage))
    .slice(0, 3);
});

const primaryLogSource = computed(() => highlightedLogSources.value[0] ?? null);

function percentLabel(value: number) {
  return `${(value * 100).toFixed(0)}%`;
}

function queueDescription(value: SourceHealthStats) {
  if (value.backlog.pendingRuns === 0 && value.backlog.runningRuns === 0) {
    return "当前没有排队或执行中的积压任务。";
  }

  const parts = [
    value.backlog.pendingRuns > 0 ? `${value.backlog.pendingRuns} 个排队` : "",
    value.backlog.runningRuns > 0 ? `${value.backlog.runningRuns} 个执行中` : "",
    value.backlog.oldestPendingAge ? `最久等待 ${value.backlog.oldestPendingAge}` : "",
  ].filter(Boolean);

  return parts.join("，");
}

function checkStatusLabel(status: "healthy" | "warning" | "pending") {
  switch (status) {
    case "healthy":
      return "正常";
    case "warning":
      return "异常";
    case "pending":
      return "进行中";
    default:
      return status;
  }
}

function checkPillClass(status: "healthy" | "warning" | "pending") {
  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-[0.78rem] font-semibold";

  if (status === "healthy") {
    return `${base} bg-emerald-50 text-emerald-700`;
  }

  if (status === "pending") {
    return `${base} bg-slate-100 text-slate-700`;
  }

  return `${base} bg-amber-50 text-amber-700`;
}

async function loadStats() {
  loading.value = true;
  error.value = null;

  try {
    stats.value = await fetchSourceHealthStats();
  } catch (nextError) {
    error.value = nextError instanceof Error ? nextError.message : "未知错误，请稍后重试";
    console.error("Failed to load source health stats:", nextError);
  } finally {
    loading.value = false;
  }
}

onMounted(() => void loadStats());
</script>
