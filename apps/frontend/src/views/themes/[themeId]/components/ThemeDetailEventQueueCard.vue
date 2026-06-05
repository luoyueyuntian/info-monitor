<template>
  <article class="card" v-if="events.length">
    <div class="card-topline">
      <h3>事件处理队列</h3>
      <span class="text-[0.88rem] text-[#766f63]">
        待处理 {{ openCount }} · 关注中 {{ trackingCount }} · 未读 {{ unreadCount }} · 收藏 {{ bookmarkedCount }}
      </span>
    </div>
    <section class="flex flex-wrap items-center gap-3">
      <button
        v-for="preset in queuePresets"
        :key="preset.id"
        class="inline-flex items-center justify-center rounded-xl border border-[rgba(120,120,120,0.22)] bg-white px-4 py-2.5 text-[#1d1d1d] transition-colors hover:bg-slate-50"
        :class="filter === preset.id ? 'border-[#2f2618] bg-[#2f2618] text-[#fff7e7] hover:bg-[#2f2618]' : ''"
        @click="filter = preset.id"
      >
        {{ preset.label }}
      </button>
    </section>
    <div v-if="filteredEvents.length" class="flex flex-col gap-3">
      <div v-for="event in filteredEvents" :key="event.id" class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
        <div class="mb-3 flex flex-wrap items-center gap-2">
          <span :class="pillToneClass(event.signal)">{{ eventSignalLabel(event.signal) }}</span>
          <span :class="pillToneClass(eventImpactTone(event))">{{ impactToneLabel(eventImpactTone(event)) }}</span>
          <span :class="pillToneClass(event.status)">{{ eventStatusLabel(event.status) }}</span>
          <span :class="pillToneClass(event.isRead ? 'active' : 'pending')">{{ eventReadLabel(event.isRead) }}</span>
          <span :class="pillToneClass(event.isBookmarked ? '30d_low' : 'neutral')">{{ eventBookmarkLabel(event.isBookmarked) }}</span>
        </div>
        <RouterLink class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-[#6b4f1f]" :to="`/events/${event.id}`">
          {{ event.title }}
          <span aria-hidden="true" class="text-base leading-none">›</span>
        </RouterLink>
        <div class="flex flex-wrap gap-x-2.5 gap-y-2">
          <span class="text-[0.88rem] text-[#766f63]">时间: {{ formatSmartDateTimeLabel(event.occurredAt) }}</span>
        </div>
        <div class="text-[#6f665a]">{{ event.summary }}</div>
        <div class="mt-3 flex flex-wrap gap-3">
          <RouterLink
            class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-400/15 bg-white/70 px-4 py-2.5 font-semibold text-slate-700 transition-colors hover:bg-white/90"
            :to="`/events/${event.id}`"
          >
            查看事件详情
          </RouterLink>
          <RouterLink
            class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-400/15 bg-white/70 px-4 py-2.5 font-semibold text-slate-700 transition-colors hover:bg-white/90"
            :to="{ path: `/themes/${themeId}`, query: { section: eventImpactTone(event) === 'negative' ? 'analysis' : 'timeline' } }"
          >
            {{ eventImpactTone(event) === "negative" ? "查看主题分析" : "查看主题时间线" }}
          </RouterLink>
          <RouterLink
            v-if="themeType === 'price'"
            class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-400/15 bg-white/70 px-4 py-2.5 font-semibold text-slate-700 transition-colors hover:bg-white/90"
            :to="{ path: `/themes/${themeId}`, query: { section: 'trend' } }"
          >
            查看价格趋势
          </RouterLink>
          <button
            class="inline-flex items-center justify-center rounded-xl bg-[#e6dcc8] px-4 py-2.5 text-[#3a3126] transition-colors hover:bg-[#ddd1bb] disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="savingEventId === event.id && pendingEventStatus === 'open'"
            @click="handleUpdateStatus(event.id, 'open')"
          >
            {{ savingEventId === event.id && pendingEventStatus === 'open' ? "正在更新..." : "待处理" }}
          </button>
          <button
            class="inline-flex items-center justify-center rounded-xl bg-[#e6dcc8] px-4 py-2.5 text-[#3a3126] transition-colors hover:bg-[#ddd1bb] disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="savingEventId === event.id && pendingEventStatus === 'tracking'"
            @click="handleUpdateStatus(event.id, 'tracking')"
          >
            {{ savingEventId === event.id && pendingEventStatus === 'tracking' ? "正在更新..." : "关注中" }}
          </button>
          <button
            class="inline-flex items-center justify-center rounded-xl bg-[#e6dcc8] px-4 py-2.5 text-[#3a3126] transition-colors hover:bg-[#ddd1bb] disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="savingEventId === event.id && pendingEventStatus === 'ignored'"
            @click="handleUpdateStatus(event.id, 'ignored')"
          >
            {{ savingEventId === event.id && pendingEventStatus === 'ignored' ? "正在更新..." : "已忽略" }}
          </button>
          <button
            class="inline-flex items-center justify-center rounded-xl bg-[#e6dcc8] px-4 py-2.5 text-[#3a3126] transition-colors hover:bg-[#ddd1bb] disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="savingEventId === event.id && (pendingEventStatus === 'read' || pendingEventStatus === 'unread')"
            @click="handleUpdateMeta(event.id, { isRead: !(event.isRead ?? false) }, (event.isRead ?? false) ? 'unread' : 'read')"
          >
            {{
              savingEventId === event.id && (pendingEventStatus === 'read' || pendingEventStatus === 'unread')
                ? "正在更新..."
                : (event.isRead ?? false)
                  ? "标记未读"
                  : "标记已读"
            }}
          </button>
          <button
            class="inline-flex items-center justify-center rounded-xl bg-[#e6dcc8] px-4 py-2.5 text-[#3a3126] transition-colors hover:bg-[#ddd1bb] disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="savingEventId === event.id && (pendingEventStatus === 'bookmark' || pendingEventStatus === 'unbookmark')"
            @click="handleUpdateMeta(event.id, { isBookmarked: !(event.isBookmarked ?? false) }, (event.isBookmarked ?? false) ? 'unbookmark' : 'bookmark')"
          >
            {{
              savingEventId === event.id && (pendingEventStatus === 'bookmark' || pendingEventStatus === 'unbookmark')
                ? "正在更新..."
                : (event.isBookmarked ?? false)
                  ? "取消收藏"
                  : "加入收藏"
            }}
          </button>
        </div>
      </div>
    </div>
    <div v-else class="rounded-2xl bg-slate-100/90 p-4 text-[#6f665a]">
      当前筛选条件下没有匹配的事件。
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

import type { ThemeDetail } from "../../../../lib/api";
import { eventImpactTone, impactToneLabel } from "../../../../lib/impact";
import {
  eventBookmarkLabel,
  eventReadLabel,
  eventSignalLabel,
  eventStatusLabel,
  formatSmartDateTimeLabel,
  pillToneClass,
} from "../../../../lib/presentation";

const props = defineProps<{
  themeId: string;
  themeType: string;
  events: ThemeDetail["events"];
  savingEventId: string | null;
  pendingEventStatus: string;
  handleUpdateStatus: (eventId: string, status: string) => void;
  handleUpdateMeta: (
    eventId: string,
    input: {
      isRead?: boolean;
      isBookmarked?: boolean;
    },
    pendingKey: string,
  ) => void;
}>();

const filter = ref<"all" | "actionable" | "unread" | "bookmarked" | "tracking">("actionable");
const queuePresets = [
  { id: "actionable", label: "待处理队列" },
  { id: "tracking", label: "关注中" },
  { id: "unread", label: "未读" },
  { id: "bookmarked", label: "收藏" },
  { id: "all", label: "全部事件" },
] as const;

const openCount = computed(
  () => props.events.filter((event) => (event.status ?? "open") === "open").length,
);
const trackingCount = computed(
  () => props.events.filter((event) => event.status === "tracking").length,
);
const unreadCount = computed(
  () => props.events.filter((event) => !event.isRead).length,
);
const bookmarkedCount = computed(
  () => props.events.filter((event) => Boolean(event.isBookmarked)).length,
);

const filteredEvents = computed(() => {
  if (filter.value === "all") {
    return props.events;
  }

  if (filter.value === "tracking") {
    return props.events.filter((event) => event.status === "tracking");
  }

  if (filter.value === "unread") {
    return props.events.filter((event) => !event.isRead);
  }

  if (filter.value === "bookmarked") {
    return props.events.filter((event) => Boolean(event.isBookmarked));
  }

  return props.events.filter((event) => (event.status ?? "open") === "open" || event.status === "tracking");
});
</script>
