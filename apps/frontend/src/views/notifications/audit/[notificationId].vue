<template>
  <section class="flex flex-col gap-5">
    <header>
      <div class="mb-2 flex items-center gap-3">
        <RouterLink
          class="inline-flex items-center gap-1.5 text-[0.92rem] font-semibold text-[#6b4f1f]"
          to="/notifications/audit"
        >
          ← 返回审计日志
        </RouterLink>
      </div>
      <h2 class="mb-2 text-[1.8rem] font-semibold text-[#1d1d1d]">通知时间线</h2>
      <p class="m-0 leading-7 text-[#675d4f]">通知 ID: {{ notificationId }}</p>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-400/15 bg-white/78 p-12">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-[#2f2618] border-t-transparent"></div>
      <p class="text-[0.92rem] text-[#6f665a]">正在加载时间线...</p>
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
            @click="void loadTimeline()"
          >
            重试
          </button>
        </div>
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="!timeline.length" class="rounded-2xl border border-slate-400/15 bg-white/78 p-8 text-center text-[#6f665a]">
      暂无时间线记录。
    </div>

    <!-- Timeline -->
    <div v-else class="relative">
      <!-- Timeline line -->
      <div class="absolute left-[18px] top-0 bottom-0 w-0.5 bg-slate-200"></div>

      <div class="flex flex-col gap-4">
        <div
          v-for="(entry, index) in timeline"
          :key="entry.id"
          class="relative flex gap-4 pl-12"
        >
          <!-- Timeline dot -->
          <div
            class="absolute left-3 top-1 h-3 w-3 rounded-full border-2 border-white"
            :class="dotClass(entry.action)"
          ></div>

          <!-- Card -->
          <div
            class="flex-1 rounded-[18px] border border-slate-400/15 bg-white/78 p-[18px] shadow-[0_12px_30px_rgba(15,23,42,0.05)]"
            :class="{ 'border-l-4 border-l-rose-400': entry.action === 'failed' }"
          >
            <div class="flex flex-wrap items-center gap-2">
              <span :class="actionPillClass(entry.action)">
                {{ actionLabel(entry.action) }}
              </span>
              <span class="ml-auto text-[0.82rem] text-[#8a8078]">
                {{ formatTime(entry.createdAt) }}
              </span>
            </div>

            <div v-if="entry.fromStatus || entry.toStatus" class="mt-2 text-[0.88rem] text-[#6f665a]">
              <span v-if="entry.fromStatus">从 "{{ statusLabel(entry.fromStatus) }}"</span>
              <span v-if="entry.fromStatus && entry.toStatus"> → </span>
              <span v-if="entry.toStatus">变为 "{{ statusLabel(entry.toStatus) }}"</span>
            </div>

            <div class="mt-1 text-[0.82rem] text-[#8a8078]">
              操作者: {{ entry.actor }}
            </div>

            <div v-if="hasMetadata(entry.metadata)" class="mt-3 rounded-xl border border-slate-400/15 bg-slate-50/80 p-3">
              <dl class="grid grid-cols-2 gap-2">
                <div v-for="(value, key) in entry.metadata" :key="key">
                  <dt class="text-[0.78rem] font-semibold text-[#8a8078]">{{ String(key) }}</dt>
                  <dd class="text-[0.82rem] text-[#2f2618]">{{ formatValue(value) }}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";

import { fetchNotificationTimeline, type AuditLogEntry } from "../../../lib/api";

const route = useRoute();
const notificationId = route.params.notificationId as string;

const timeline = ref<AuditLogEntry[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

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

function dotClass(action: string): string {
  switch (action) {
    case "created":
      return "bg-blue-500";
    case "sent":
      return "bg-emerald-500";
    case "failed":
      return "bg-rose-500";
    case "read":
      return "bg-slate-400";
    case "retried":
      return "bg-amber-500";
    default:
      return "bg-slate-300";
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

async function loadTimeline() {
  loading.value = true;
  error.value = null;

  try {
    timeline.value = await fetchNotificationTimeline(notificationId);
  } catch (e) {
    error.value = e instanceof Error ? e.message : "未知错误，请稍后重试";
    console.error("Failed to load timeline:", e);
  } finally {
    loading.value = false;
  }
}

onMounted(() => void loadTimeline());
</script>
