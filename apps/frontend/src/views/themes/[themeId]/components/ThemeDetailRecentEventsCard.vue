<template>
  <article class="card">
    <h3>最近事件</h3>
    <div v-if="events.length" class="list">
      <RouterLink
        v-for="event in events"
        :key="event.id"
        class="list-item"
        :to="`/events/${event.id}`"
      >
        <span :class="pillToneClass(event.signal)">{{ eventSignalLabel(event.signal) }}</span>
        <span :class="pillToneClass(event.status)">{{ eventStatusLabel(event.status) }}</span>
        <strong>{{ event.title }}</strong>
        <div class="meta">{{ formatSmartDateTimeLabel(event.occurredAt) }}</div>
      </RouterLink>
    </div>
    <div v-else class="empty-state">
      这个主题当前还没有事件，下面会先展示已采集到的记录与变化。
    </div>
  </article>
</template>

<script setup lang="ts">
import type { ThemeDetail } from "../../../../lib/api";
import {
  eventSignalLabel,
  eventStatusLabel,
  formatSmartDateTimeLabel,
  pillToneClass,
} from "../../../../lib/presentation";

defineProps<{
  events: ThemeDetail["events"];
}>();
</script>
