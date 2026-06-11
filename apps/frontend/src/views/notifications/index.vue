<template>
  <section class="flex flex-col gap-5">
    <header>
      <h2 class="mb-2 text-[1.8rem] font-semibold text-[#1d1d1d]">通知中心</h2>
      <p class="m-0 leading-7 text-[#675d4f]">查看系统产生的事件通知，及时了解重要的价格信号和金融事件变化。</p>
    </header>

    <section class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-400/15 bg-slate-50/80 p-4 shadow-[0_10px_26px_rgba(15,23,42,0.04)]">
      <div class="flex flex-wrap items-center gap-3">
        <span class="text-[0.82rem] font-bold uppercase tracking-[0.06em] text-[#6b5e49]">筛选</span>
        <button
          v-for="filter in statusFilters"
          :key="filter.value"
          class="inline-flex items-center justify-center rounded-xl border border-[rgba(120,120,120,0.22)] bg-white px-4 py-2.5 text-[#1d1d1d] transition-colors hover:bg-slate-50"
          :class="activeStatusFilter === filter.value ? 'border-[#2f2618] bg-[#2f2618] text-[#fff7e7] hover:bg-[#2f2618]' : ''"
          @click="activeStatusFilter = filter.value"
        >
          {{ filter.label }}
        </button>
      </div>
      <div class="text-[0.88rem] text-[#766f63]">
        共 {{ filteredNotifications.length }} 条通知
      </div>
    </section>

    <div v-if="!filteredNotifications.length" class="rounded-2xl border border-slate-400/15 bg-white/78 p-8 text-center text-[#6f665a]">
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
        <span class="text-[0.82rem] text-[#8a8078]">
          {{ formatTime(notification.createdAt) }}
        </span>
      </div>

      <strong class="block text-base font-semibold text-[#2f2618]">{{ notification.title }}</strong>
      <p class="mt-2 text-[0.92rem] leading-7 text-[#6f665a]">{{ notification.summary }}</p>

      <div class="mt-3 flex flex-wrap items-center gap-3">
        <RouterLink
          class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-[#6b4f1f]"
          :to="`/events/${notification.eventId}`"
        >
          查看关联事件
          <span aria-hidden="true" class="text-base leading-none">›</span>
        </RouterLink>
        <button
          v-if="notification.status === 'pending'"
          class="inline-flex items-center justify-center rounded-xl bg-[#e6dcc8] px-4 py-2.5 text-[#3a3126] transition-colors hover:bg-[#ddd1bb] disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="markingId === notification.id"
          @click="handleMarkRead(notification.id)"
        >
          {{ markingId === notification.id ? "标记中..." : "标记已读" }}
        </button>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import { fetchNotifications, markNotificationRead, type NotificationItem } from "../../lib/api";

const notifications = ref<NotificationItem[]>([]);
const activeStatusFilter = ref<"all" | "pending" | "sent" | "failed">("all");
const markingId = ref("");

const statusFilters = [
  { value: "all" as const, label: "全部" },
  { value: "pending" as const, label: "未读" },
  { value: "sent" as const, label: "已读" },
  { value: "failed" as const, label: "失败" },
];

const filteredNotifications = computed(() => {
  if (activeStatusFilter.value === "all") {
    return notifications.value;
  }

  return notifications.value.filter((item) => item.status === activeStatusFilter.value);
});

function signalLabel(signal: string) {
  if (signal === "30d_low") {
    return "价格新低";
  }

  if (signal === "bullish") {
    return "利好信号";
  }

  if (signal === "bearish") {
    return "利空信号";
  }

  if (signal === "new_announcement") {
    return "新公告";
  }

  if (signal === "content_update") {
    return "内容更新";
  }

  return signal || "通知";
}

function signalPillClass(signal: string) {
  const base = "inline-flex items-center rounded-lg px-2.5 py-1 text-[0.78rem] font-semibold";

  if (signal === "30d_low" || signal === "bullish") {
    return `${base} bg-emerald-50 text-emerald-700`;
  }

  if (signal === "bearish") {
    return `${base} bg-rose-50 text-rose-700`;
  }

  if (signal === "new_announcement") {
    return `${base} bg-blue-50 text-blue-700`;
  }

  return `${base} bg-slate-100 text-slate-600`;
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

onMounted(async () => {
  notifications.value = await fetchNotifications();
});
</script>
