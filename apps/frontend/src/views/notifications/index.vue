<template>
  <section class="flex flex-col gap-5">
    <header>
      <h2 class="mb-2 text-[1.8rem] font-semibold text-ink">通知中心</h2>
      <p class="m-0 leading-7 text-[#675d4f]">查看系统产生的事件通知，及时了解重要的价格信号和金融事件变化。</p>
    </header>

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-400/15 bg-white/78 p-12">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-[#2f2618] border-t-transparent"></div>
      <p class="text-[0.92rem] text-ink-body">正在加载通知...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="rounded-2xl border border-rose-200 bg-rose-50/50 p-6">
      <div class="flex items-start gap-3">
        <span class="mt-0.5 text-lg text-rose-500">⚠</span>
        <div class="flex-1">
          <h3 class="text-[0.95rem] font-semibold text-rose-800">加载通知失败</h3>
          <p class="mt-1 text-[0.88rem] text-rose-600">{{ error }}</p>
          <button
            class="mt-3 inline-flex items-center justify-center rounded-xl border border-rose-200 bg-white px-4 py-2 text-[0.82rem] font-semibold text-rose-700 transition-colors hover:bg-rose-50"
            @click="void loadNotifications()"
          >
            重试
          </button>
        </div>
      </div>
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Preset Views -->
      <section class="flex flex-wrap gap-2">
        <button
          v-for="preset in presetViews"
          :key="preset.id"
          class="inline-flex items-center justify-center rounded-xl border border-border bg-white px-3 py-2 text-[0.82rem] text-ink transition-colors hover:bg-slate-50"
          :class="activePreset === preset.id ? 'border-[#2f2618] bg-btn-dark text-ink-on-dark hover:bg-btn-dark' : ''"
          @click="applyPreset(preset)"
        >
          {{ preset.label }}
        </button>
      </section>

      <!-- Filters & Sorting -->
      <section class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-400/15 bg-slate-50/80 p-4 shadow-[0_10px_26px_rgba(15,23,42,0.04)]">
        <div class="flex flex-wrap items-center gap-3">
          <span class="text-[0.82rem] font-bold uppercase tracking-[0.06em] text-ink-label">筛选</span>
          <button
            v-for="filter in statusFilters"
            :key="filter.value"
            class="inline-flex items-center justify-center rounded-xl border border-border bg-white px-4 py-2.5 text-ink transition-colors hover:bg-slate-50"
            :class="activeStatusFilter === filter.value ? 'border-[#2f2618] bg-btn-dark text-ink-on-dark hover:bg-btn-dark' : ''"
            @click="setStatusFilter(filter.value)"
          >
            {{ filter.label }}
          </button>
        </div>
        <div class="flex items-center gap-3">
          <select
            v-model="sortBy"
            class="rounded-xl border border-border bg-white px-3 py-2 text-[0.82rem] text-ink"
          >
            <option value="createdAt">按创建时间</option>
            <option value="sentAt">按发送时间</option>
          </select>
          <button
            class="inline-flex items-center justify-center rounded-xl border border-border bg-white px-3 py-2 text-[0.82rem] text-ink transition-colors hover:bg-slate-50"
            @click="toggleSortOrder"
          >
            {{ sortOrder === "desc" ? "↓ 降序" : "↑ 升序" }}
          </button>
          <span class="text-[0.88rem] text-ink-secondary">
            共 {{ filteredNotifications.length }} 条
          </span>
        </div>
      </section>

      <div v-if="!filteredNotifications.length" class="rounded-2xl border border-slate-400/15 bg-white/78 p-8 text-center text-ink-body">
        当前筛选条件下没有通知。
      </div>

      <article
        v-for="notification in filteredNotifications"
        :key="notification.id"
        class="rounded-[18px] border border-slate-400/15 bg-white/78 p-[18px] shadow-[0_12px_30px_rgba(15,23,42,0.05)] transition-colors"
        :class="cardClass(notification.status)"
      >
        <div class="mb-3 flex flex-wrap items-center gap-2">
          <span :class="signalPillClass(notification.signal)">
            {{ signalLabel(notification.signal) }}
          </span>
          <span :class="statusPillClass(notification.status)">
            {{ statusLabel(notification.status) }}
          </span>
          <span class="text-[0.82rem] text-ink-muted">
            {{ formatTime(notification.createdAt) }}
          </span>
        </div>

        <strong class="block text-base font-semibold text-ink-heading">{{ notification.title }}</strong>
        <p class="mt-2 text-[0.92rem] leading-7 text-ink-body">{{ notification.summary }}</p>

        <div class="mt-3 flex flex-wrap items-center gap-3">
          <RouterLink
            class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-ink-link"
            :to="`/events/${notification.eventId}`"
          >
            查看关联事件
            <span aria-hidden="true" class="text-base leading-none">›</span>
          </RouterLink>
          <button
            v-if="notification.status === 'pending'"
            class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="markingId === notification.id"
            @click="handleMarkRead(notification.id)"
          >
            {{ markingId === notification.id ? "标记中..." : "标记已读" }}
          </button>
        </div>
      </article>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import { fetchNotifications, markNotificationRead, type NotificationItem } from "../../lib/api";
import { getSignalColors, getSignalLabel } from "@info-monitor/shared-contracts";

interface PresetView {
  id: string;
  label: string;
  status?: string;
  signal?: string;
  sortBy?: "createdAt" | "sentAt";
  sortOrder?: "asc" | "desc";
}

const notifications = ref<NotificationItem[]>([]);
const totalCount = ref(0);
const hasMore = ref(false);
const activeStatusFilter = ref<"all" | "pending" | "sent" | "failed">("all");
const activeSignalFilter = ref<string | undefined>(undefined);
const activePreset = ref<string | null>(null);
const sortBy = ref<"createdAt" | "sentAt">("createdAt");
const sortOrder = ref<"asc" | "desc">("desc");
const markingId = ref("");
const loading = ref(false);
const error = ref<string | null>(null);

const presetViews: PresetView[] = [
  { id: "unread", label: "最新未读", status: "pending", sortBy: "createdAt", sortOrder: "desc" },
  { id: "failed", label: "只看失败", status: "failed" },
  { id: "signals", label: "只看信号", signal: "30d_low" },
  { id: "injection", label: "流动性投放", signal: "liquidity_injection" },
  { id: "withdrawal", label: "流动性回笼", signal: "liquidity_withdrawal" },
];

const statusFilters = [
  { value: "all" as const, label: "全部" },
  { value: "pending" as const, label: "未读" },
  { value: "sent" as const, label: "已读" },
  { value: "failed" as const, label: "失败" },
];

const filteredNotifications = computed(() => {
  let items = notifications.value;

  if (activeStatusFilter.value !== "all") {
    items = items.filter((item) => item.status === activeStatusFilter.value);
  }

  // Sort
  items = [...items].sort((left, right) => {
    const leftVal = sortBy.value === "sentAt" ? left.sentAt || left.createdAt : left.createdAt;
    const rightVal = sortBy.value === "sentAt" ? right.sentAt || right.createdAt : right.createdAt;
    return sortOrder.value === "desc"
      ? rightVal.localeCompare(leftVal)
      : leftVal.localeCompare(rightVal);
  });

  return items;
});

function applyPreset(preset: PresetView) {
  activePreset.value = preset.id;
  activeStatusFilter.value = (preset.status as typeof activeStatusFilter.value) || "all";
  activeSignalFilter.value = preset.signal;

  if (preset.sortBy) {
    sortBy.value = preset.sortBy;
  }

  if (preset.sortOrder) {
    sortOrder.value = preset.sortOrder;
  }

  // Reload with server-side filters
  void loadNotifications();
}

function toggleSortOrder() {
  sortOrder.value = sortOrder.value === "desc" ? "asc" : "desc";
  void loadNotifications();
}

function setStatusFilter(status: typeof activeStatusFilter.value) {
  activeStatusFilter.value = status;
  activeSignalFilter.value = undefined;
  activePreset.value = null;
  void loadNotifications();
}

function signalLabel(signal: string) {
  return getSignalLabel(signal);
}

function signalPillClass(signal: string) {
  const base = "inline-flex items-center rounded-lg px-2.5 py-1 text-[0.78rem] font-semibold";
  const colors = getSignalColors(signal);
  return `${base} ${colors.background} ${colors.text}`;
}

function statusLabel(status: string) {
  if (status === "pending") {
    return "未读";
  }

  if (status === "sent") {
    return "已读";
  }

  if (status === "failed") {
    return "发送失败";
  }

  return status || "未知状态";
}

function statusPillClass(status: string) {
  const base = "inline-flex items-center rounded-lg px-2.5 py-1 text-[0.78rem] font-semibold";

  if (status === "pending") {
    return `${base} bg-amber-50 text-amber-700`;
  }

  if (status === "failed") {
    return `${base} bg-rose-50 text-rose-700`;
  }

  return `${base} bg-slate-100 text-slate-500`;
}

function cardClass(status: string) {
  if (status === "pending") {
    return "border-l-4 border-l-amber-400";
  }

  if (status === "failed") {
    return "border-l-4 border-l-rose-400";
  }

  return "";
}

function formatTime(value: string) {
  try {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

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

async function handleMarkRead(notificationId: string) {
  markingId.value = notificationId;

  try {
    await markNotificationRead(notificationId);
    const item = notifications.value.find((n) => n.id === notificationId);

    if (item) {
      item.status = "sent";
      item.sentAt = new Date().toISOString();
    }
  } finally {
    markingId.value = "";
  }
}

async function loadNotifications() {
  loading.value = true;
  error.value = null;

  try {
    const result = await fetchNotifications({
      status: activeStatusFilter.value !== "all" ? activeStatusFilter.value : undefined,
      signal: activeSignalFilter.value,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
    });
    notifications.value = result.items;
    totalCount.value = result.total;
    hasMore.value = result.hasMore;
  } catch (e) {
    error.value = e instanceof Error ? e.message : "未知错误，请稍后重试";
    console.error("Failed to load notifications:", e);
  } finally {
    loading.value = false;
  }
}

onMounted(() => loadNotifications());
</script>
