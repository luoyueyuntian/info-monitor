<template>
  <article class="card">
    <div class="card-topline inbox-card-header">
      <div class="inbox-card-copy">
        <h3>重点收藏</h3>
        <p>把值得长期回看和持续跟踪的事件沉淀成稳定清单，避免散落在聊天记录和笔记里。</p>
      </div>
      <RouterLink class="text-action" :to="{ path: '/events', query: { bookmark: 'bookmarked', sort: 'statusChanged' } }">
        查看全部收藏事件
        <span aria-hidden="true">›</span>
      </RouterLink>
    </div>
    <div class="meta inbox-panel-summary">
      当前有 {{ events.length }} 条重点收藏事件，适合在完成日常巡检后继续回看。
    </div>
    <div v-if="events.length" class="list">
      <RouterLink
        v-for="event in events"
        :key="event.id"
        class="list-item"
        :to="`/events/${event.id}`"
      >
        <div class="theme-topline">
          <span :class="pillToneClass(event.signal)">{{ eventSignalLabel(event.signal) }}</span>
          <span :class="pillToneClass(event.status)">{{ eventStatusLabel(event.status) }}</span>
          <span :class="pillToneClass(event.isRead ? 'active' : 'pending')">{{ eventReadLabel(event.isRead) }}</span>
        </div>
        <strong>{{ event.title }}</strong>
        <div class="meta-row">
          <span class="meta">主题: {{ event.themeName }}</span>
          <span class="meta">时间: {{ formatSmartDateTimeLabel(event.latestStatusChangedAt ?? event.occurredAt) }}</span>
        </div>
        <div class="muted">{{ event.summary }}</div>
      </RouterLink>
    </div>
    <div v-else class="empty-state">
      当前还没有收藏事件。遇到值得长期跟踪的事件后，可以在事件详情或事件工作台里加入收藏。
    </div>
  </article>
</template>

<script setup lang="ts">
import type { EventSummary } from "../../../lib/api";
import {
  eventReadLabel,
  eventSignalLabel,
  eventStatusLabel,
  formatSmartDateTimeLabel,
  pillToneClass,
} from "../../../lib/presentation";

defineProps<{
  events: EventSummary[];
}>();
</script>
