<template>
  <section class="flex flex-col gap-5">
    <header>
      <h2 class="mb-2 text-[1.8rem] font-semibold text-[#1d1d1d]">通知审计日志</h2>
      <p class="m-0 leading-7 text-[#675d4f]">查看通知的完整生命周期，包括创建、发送、失败和已读记录。</p>
    </header>

    <!-- Filters -->
    <section class="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-400/15 bg-slate-50/80 p-4 shadow-[0_10px_26px_rgba(15,23,42,0.04)]">
      <span class="text-[0.82rem] font-bold uppercase tracking-[0.06em] text-[#6b5e49]">筛选</span>
      <button
        v-for="filter in actionFilters"
        :key="filter.value"
        class="inline-flex items-center justify-center rounded-xl border border-[rgba(120,120,120,0.22)] bg-white px-4 py-2.5 text-[#1d1d1d] transition-colors hover:bg-slate-50"
        :class="activeActionFilter === filter.value ? 'border-[#2f2618] bg-[#2f2618] text-[#fff7e7] hover:bg-[#2f2618]' : ''"
        @click="activeActionFilter = filter.value"
      >
        {{ filter.label }}
      </button>
      <span class="ml-auto text-[0.88rem] text-[#766f63]">
        共 {{ totalCount }} 条记录
      </span>
    </section>

    <!-- Loading -->
    <div v-if="loading" class="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-400/15 bg-white/78 p-12">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-[#2f2618] border-t-transparent"></div>
      <p class="text-[0.92rem] text-[#6f665a]">正在加载审计日志...</p>
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
            @click="void loadLogs()"
          >
            重试
          </button>
        </div>
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="!logs.length" class="rounded-2xl border border-slate-400/15 bg-white/78 p-8 text-center text-[#6f665a]">
      暂无审计日志记录。
    </div>

    <!-- Logs List -->
    <div v-else class="flex flex-col gap-3">
      <article
        v-for="log in logs"
        :key="log.id"
        class="rounded-[18px] border border-slate-400/15 bg-white/78 p-[18px] shadow-[0_12px_30px_rgba(15,23,42,0.05)]"
      >
        <div class="flex flex-wrap items-center gap-2">
          <span :class="actionPillClass(log.action)">
            {{ actionLabel(log.action) }}
          </span>
          <span v-if="log.fromStatus" class="text-[0.82rem] text-[#8a8078]">
            {{ statusLabel(log.fromStatus) }} →
          </span>
          <span v-if="log.toStatus" class="text-[0.82rem] font-semibold text-[#2f2618]">
            {{ statusLabel(log.toStatus) }}
          </span>
          <span class="ml-auto text-[0.82rem] text-[#8a8078]">
            {{ formatTime(log.createdAt) }}
          </span>
        </div>

        <div class="mt-2 flex flex-wrap items-center gap-3 text-[0.82rem] text-[#6f665a]">
          <span>通知ID: {{ log.notificationId }}</span>
          <span>操作者: {{ log.actor }}</span>
        </div>

        <div v-if="hasMetadata(log.metadata)" class="mt-3 rounded-xl border border-slate-400/15 bg-slate-50/80 p-3">
          <dl class="grid grid-cols-2 gap-2">
            <div v-for="(value, key) in log.metadata" :key="key">
              <dt class="text-[0.78rem] font-semibold text-[#8a8078]">{{ String(key) }}</dt>
              <dd class="text-[0.82rem] text-[#2f2618]">{{ formatValue(value) }}</dd>
            </div>
          </dl>
        </div>

        <div class="mt-3">
          <RouterLink
            class="inline-flex items-center gap-1.5 text-[0.82rem] font-semibold text-[#6b4f1f]"
            :to="`/notifications/audit/${log.notificationId}`"
          >
            查看完整时间线
            <span aria-hidden="true">›</span>
          </RouterLink>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import { fetchAuditLogs, type AuditLogEntry } from "../../lib/api";

const logs = ref<AuditLogEntry[]>([]);
const totalCount = ref(0);
const loading = ref(false);
const error = ref<string | null>(null);
const activeActionFilter = ref<string>("all");

const actionFilters = [
  { value: "all", label: "全部" },
  { value: "created", label: "创建" },
  { value: "sent", label: "发送" },
  { value: "failed", label: "失败" },
  { value: "read", label: "已读" },
  { value: "retried", label: "重试" },
];

const filteredLogs = computed(() => {
  if (activeActionFilter.value === "all") {
    return logs.value;
  }
  return logs.value.filter((log) => log.action === activeActionFilter.value);
});

function actionLabel(action: string): string {
  const labels: Record<string, string> = {
    created: "创建",
    sent: "发送",
    failed: "失败",
    read: "已读",
    retried: "重试",
    deleted: "删除",
  };
  return labels[action] || action;
}

function actionPillClass(action: string): string {
  const base = "inline-flex items-center rounded-lg px-2.5 py-1 text-[0.78rem] font-semibold";

  switch (action) {
    case "created":
      return `${base} bg-blue-50 text-blue-700`;
    case "sent":
      return `${base} bg-emerald-50 text-emerald-700`;
    case "failed":
      return `${base} bg-rose-50 text-rose-700`;
    case "read":
      return `${base} bg-slate-100 text-slate-600`;
    case "retried":
      return `${base} bg-amber-50 text-amber-700`;
    default:
      return `${base} bg-slate-100 text-slate-500`;
  }
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "未读",
    sent: "已读",
    failed: "失败",
  };
  return labels[status] || status;
}

function hasMetadata(metadata: Record<string, unknown>): boolean {
  return Object.keys(metadata).length > 0;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
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
      second: "2-digit",
    });
  } catch {
    return value;
  }
}

async function loadLogs() {
  loading.value = true;
  error.value = null;

  try {
    const result = await fetchAuditLogs({
      action: activeActionFilter.value === "all" ? undefined : activeActionFilter.value,
    });
    logs.value = result.items;
    totalCount.value = result.total;
  } catch (e) {
    error.value = e instanceof Error ? e.message : "未知错误，请稍后重试";
    console.error("Failed to load audit logs:", e);
  } finally {
    loading.value = false;
  }
}

onMounted(() => void loadLogs());
</script>
