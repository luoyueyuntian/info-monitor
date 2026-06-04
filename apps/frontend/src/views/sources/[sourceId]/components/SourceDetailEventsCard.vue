<template>
  <article class="card">
    <h3>关联事件</h3>
    <div v-if="events.length" class="flex flex-col gap-3">
      <RouterLink
        v-for="event in events"
        :key="event.id"
        class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5"
        :to="`/events/${event.id}`"
      >
        <span :class="pillToneClass(event.signal)">{{ eventSignalLabel(event.signal) }}</span>
        <span :class="pillToneClass(event.status)">{{ eventStatusLabel(event.status) }}</span>
        <span :class="pillToneClass(event.isRead ? 'active' : 'pending')">{{ eventReadLabel(event.isRead) }}</span>
        <span :class="pillToneClass(event.isBookmarked ? '30d_low' : 'neutral')">{{ eventBookmarkLabel(event.isBookmarked) }}</span>
        <strong>{{ event.title }}</strong>
        <div class="text-[0.88rem] text-[#766f63]">{{ formatSmartDateTimeLabel(event.occurredAt) }}</div>
        <div class="text-[#6f665a]">{{ event.summary }}</div>
      </RouterLink>
    </div>
    <div v-else class="rounded-2xl bg-slate-100/90 p-4 text-[#6f665a]">这个来源当前还没有关联事件。</div>
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
