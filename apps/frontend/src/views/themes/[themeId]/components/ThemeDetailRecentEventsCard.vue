<template>
  <article class="card">
    <h3>最近事件</h3>
    <div v-if="events.length" class="flex flex-col gap-3">
      <RouterLink
        v-for="event in events"
        :key="event.id"
        class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5"
        :to="`/events/${event.id}`"
      >
        <span :class="pillToneClass(event.signal)">{{ eventSignalLabel(event.signal) }}</span>
        <span :class="pillToneClass(event.status)">{{ eventStatusLabel(event.status) }}</span>
        <strong>{{ event.title }}</strong>
        <div class="text-[0.88rem] text-[#766f63]">{{ formatSmartDateTimeLabel(event.occurredAt) }}</div>
      </RouterLink>
    </div>
    <div v-else class="rounded-2xl bg-slate-100/90 p-4 text-[#6f665a]">
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
