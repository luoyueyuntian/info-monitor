<template>
  <article class="card">
    <h3>关联事件</h3>
    <div v-if="events.length" class="list">
      <RouterLink
        v-for="event in events"
        :key="event.id"
        class="list-item"
        :to="`/events/${event.id}`"
      >
        <span :class="pillToneClass(event.signal)">{{ eventSignalLabel(event.signal) }}</span>
        <span :class="pillToneClass(event.status)">{{ eventStatusLabel(event.status) }}</span>
        <span :class="pillToneClass(event.isRead ? 'active' : 'pending')">{{ eventReadLabel(event.isRead) }}</span>
        <span :class="pillToneClass(event.isBookmarked ? '30d_low' : 'neutral')">{{ eventBookmarkLabel(event.isBookmarked) }}</span>
        <strong>{{ event.title }}</strong>
        <div class="meta">{{ formatSmartDateTimeLabel(event.occurredAt) }}</div>
        <div class="muted">{{ event.summary }}</div>
      </RouterLink>
    </div>
    <div v-else class="empty-state">这个来源当前还没有关联事件。</div>
  </article>
</template>

<script setup lang="ts">
import type { SourceDetail } from "../../../../lib/api";
import {
  eventBookmarkLabel,
  eventReadLabel,
  eventSignalLabel,
  eventStatusLabel,
  formatSmartDateTimeLabel,
  pillToneClass,
} from "../../../../lib/presentation";

defineProps<{
  events: SourceDetail["events"];
}>();
</script>
