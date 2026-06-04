<template>
  <article class="card">
    <div class="card-topline">
      <h3>事件列表</h3>
      <span class="meta">共 {{ events.length }} 条事件</span>
    </div>

    <div v-if="events.length" class="list">
      <div
        v-for="event in events"
        :key="event.id"
        class="list-item"
        :class="{ 'list-item--delta': isIncrementalEvent(event) }"
      >
        <label class="checkbox-row event-select-row">
          <input
            :checked="selectedEventIds.includes(event.id)"
            type="checkbox"
            @change="toggleEventSelection(event.id)"
          />
          选中事件
        </label>
        <div class="theme-topline">
          <span :class="pillToneClass(event.signal)">{{ eventSignalLabel(event.signal) }}</span>
          <span :class="pillToneClass(event.status)">{{ eventStatusLabel(event.status) }}</span>
          <span class="pill" v-if="event.infoType">{{ themeTypeLabel(event.infoType) }}</span>
          <span class="pill" :class="event.isRead ? 'tone-positive' : 'tone-neutral'">{{ eventReadLabel(event.isRead) }}</span>
          <span class="pill" :class="event.isBookmarked ? 'tone-price' : 'tone-neutral'">{{ eventBookmarkLabel(event.isBookmarked) }}</span>
          <span class="pill tone-neutral" v-if="isIncrementalEvent(event)">本次新增</span>
        </div>
        <RouterLink class="text-action" :to="`/events/${event.id}`">
          {{ event.title }}
          <span aria-hidden="true">›</span>
        </RouterLink>
        <div class="meta-row">
          <span class="meta">主题: {{ event.themeName }}</span>
          <span class="meta">时间: {{ formatSmartDateTimeLabel(event.occurredAt) }}</span>
          <span class="meta" v-if="event.latestStatusChangedAt">
            状态更新于: {{ formatSmartDateTimeLabel(event.latestStatusChangedAt) }}
          </span>
        </div>
        <div class="muted">{{ event.summary }}</div>
        <div class="actions inline">
          <button
            class="button secondary"
            :disabled="savingEventId === event.id && pendingStatus === 'open'"
            @click="handleUpdateStatus(event.id, 'open')"
          >
            {{ savingEventId === event.id && pendingStatus === 'open' ? "正在更新..." : "待处理" }}
          </button>
          <button
            class="button secondary"
            :disabled="savingEventId === event.id && pendingStatus === 'tracking'"
            @click="handleUpdateStatus(event.id, 'tracking')"
          >
            {{ savingEventId === event.id && pendingStatus === 'tracking' ? "正在更新..." : "关注中" }}
          </button>
          <button
            class="button secondary"
            :disabled="savingEventId === event.id && pendingStatus === 'ignored'"
            @click="handleUpdateStatus(event.id, 'ignored')"
          >
            {{ savingEventId === event.id && pendingStatus === 'ignored' ? "正在更新..." : "已忽略" }}
          </button>
          <button
            class="button secondary"
            :disabled="savingEventId === event.id && (pendingStatus === 'read' || pendingStatus === 'unread')"
            @click="handleUpdateMeta(event.id, { isRead: !(event.isRead ?? false) }, (event.isRead ?? false) ? 'unread' : 'read')"
          >
            {{
              savingEventId === event.id && (pendingStatus === 'read' || pendingStatus === 'unread')
                ? "正在更新..."
                : (event.isRead ?? false)
                  ? "标记未读"
                  : "标记已读"
            }}
          </button>
          <button
            class="button secondary"
            :disabled="savingEventId === event.id && pendingStatus === 'bookmark'"
            @click="handleUpdateMeta(event.id, { isBookmarked: !(event.isBookmarked ?? false) }, 'bookmark')"
          >
            {{
              savingEventId === event.id && pendingStatus === 'bookmark'
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
import type { EventSummary } from "../../../lib/api";
import {
  eventBookmarkLabel,
  eventReadLabel,
  eventSignalLabel,
  eventStatusLabel,
  formatSmartDateTimeLabel,
  pillToneClass,
  themeTypeLabel,
} from "../../../lib/presentation";

defineProps<{
  events: EventSummary[];
  selectedEventIds: string[];
  savingEventId: string;
  pendingStatus: string;
  isIncrementalEvent: (event: EventSummary) => boolean;
  toggleEventSelection: (eventId: string) => void;
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
</script>
