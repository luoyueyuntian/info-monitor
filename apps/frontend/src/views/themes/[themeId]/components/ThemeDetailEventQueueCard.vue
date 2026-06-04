<template>
  <article class="card" v-if="events.length">
    <div class="card-topline">
      <h3>事件处理队列</h3>
      <span class="meta">
        待处理 {{ openCount }} · 关注中 {{ trackingCount }} · 未读 {{ unreadCount }} · 收藏 {{ bookmarkedCount }}
      </span>
    </div>
    <section class="toolbar">
      <button
        v-for="preset in queuePresets"
        :key="preset.id"
        class="button secondary quick-preset-button"
        :class="{ 'quick-preset-button--active': filter === preset.id }"
        @click="filter = preset.id"
      >
        {{ preset.label }}
      </button>
    </section>
    <div v-if="filteredEvents.length" class="list">
      <div v-for="event in filteredEvents" :key="event.id" class="list-item">
        <div class="theme-topline">
          <span :class="pillToneClass(event.signal)">{{ eventSignalLabel(event.signal) }}</span>
          <span :class="pillToneClass(event.status)">{{ eventStatusLabel(event.status) }}</span>
          <span :class="pillToneClass(event.isRead ? 'active' : 'pending')">{{ eventReadLabel(event.isRead) }}</span>
          <span :class="pillToneClass(event.isBookmarked ? '30d_low' : 'neutral')">{{ eventBookmarkLabel(event.isBookmarked) }}</span>
        </div>
        <RouterLink class="text-action" :to="`/events/${event.id}`">
          {{ event.title }}
          <span aria-hidden="true">›</span>
        </RouterLink>
        <div class="meta-row">
          <span class="meta">时间: {{ formatSmartDateTimeLabel(event.occurredAt) }}</span>
        </div>
        <div class="muted">{{ event.summary }}</div>
        <div class="actions inline">
          <button
            class="button secondary"
            :disabled="savingEventId === event.id && pendingEventStatus === 'open'"
            @click="handleUpdateStatus(event.id, 'open')"
          >
            {{ savingEventId === event.id && pendingEventStatus === 'open' ? "正在更新..." : "待处理" }}
          </button>
          <button
            class="button secondary"
            :disabled="savingEventId === event.id && pendingEventStatus === 'tracking'"
            @click="handleUpdateStatus(event.id, 'tracking')"
          >
            {{ savingEventId === event.id && pendingEventStatus === 'tracking' ? "正在更新..." : "关注中" }}
          </button>
          <button
            class="button secondary"
            :disabled="savingEventId === event.id && pendingEventStatus === 'ignored'"
            @click="handleUpdateStatus(event.id, 'ignored')"
          >
            {{ savingEventId === event.id && pendingEventStatus === 'ignored' ? "正在更新..." : "已忽略" }}
          </button>
          <button
            class="button secondary"
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
            class="button secondary"
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
    <div v-else class="empty-state">
      当前筛选条件下没有匹配的事件。
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

import type { ThemeDetail } from "../../../../lib/api";
import {
  eventBookmarkLabel,
  eventReadLabel,
  eventSignalLabel,
  eventStatusLabel,
  formatSmartDateTimeLabel,
  pillToneClass,
} from "../../../../lib/presentation";

const props = defineProps<{
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
