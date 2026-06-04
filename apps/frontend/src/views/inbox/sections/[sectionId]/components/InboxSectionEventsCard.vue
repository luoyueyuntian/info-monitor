<template>
  <article class="card">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h3>{{ title }}</h3>
        <p class="mb-3.5 text-[#6e665a]">{{ description }}</p>
      </div>
    </div>
    <div v-if="events.length" class="flex flex-col gap-3">
      <RouterLink
        v-for="event in events"
        :key="event.id"
        class="overflow-hidden rounded-2xl border border-slate-400/15 bg-slate-50/90 p-0"
        :to="`/events/${event.id}`"
      >
        <div class="border-b border-slate-400/15 px-3 py-2.5" :class="eventHeaderToneClass(event)">
          <span :class="pillToneClass(event.signal, 'text')">{{ eventSignalLabel(event.signal) }}</span>
          <span :class="pillToneClass(event.status, 'text')">{{ eventStatusLabel(event.status) }}</span>
          <template v-if="showMetaPills">
            <span :class="pillToneClass(event.isRead ? 'active' : 'pending', 'text')">{{ eventReadLabel(event.isRead) }}</span>
            <span :class="pillToneClass(event.isBookmarked ? '30d_low' : 'neutral', 'text')">{{ eventBookmarkLabel(event.isBookmarked) }}</span>
          </template>
        </div>
        <div class="grid gap-2 bg-slate-50/90 px-4 py-3.5">
          <strong>{{ event.title }}</strong>
          <div class="text-[0.88rem] text-[#766f63]">{{ event.themeName }} · {{ formatSmartDateTimeLabel(event.occurredAt) }}</div>
          <div class="text-[#6f665a]">{{ event.summary }}</div>
          <div class="mt-2.5 grid gap-1.5" v-if="eventDetails(event).length">
            <template v-for="entry in eventDetails(event)" :key="`${event.id}-${entry.label}`">
              <div class="flex flex-wrap gap-1.5">
                <dt class="font-bold text-[#473924]">{{ entry.label }}:</dt>
                <dd class="m-0 text-[#695e4c]">{{ entry.value }}</dd>
              </div>
            </template>
          </div>
        </div>
      </RouterLink>
    </div>
    <div v-else class="rounded-2xl bg-slate-100/90 p-4 text-[#6f665a]">{{ emptyText }}</div>
  </article>
</template>

<script setup lang="ts">
import type { EventSummary } from "../../../../../lib/api";
import {
  eventBookmarkLabel,
  eventReadLabel,
  eventSignalLabel,
  eventStatusLabel,
  formatSmartDateTimeLabel,
  pillToneClass,
} from "../../../../../lib/presentation";

defineProps<{
  title: string;
  description: string;
  emptyText: string;
  events: EventSummary[];
  showMetaPills?: boolean;
  eventHeaderToneClass: (event: EventSummary) => string;
  eventDetails: (event: EventSummary) => Array<{ label: string; value: string }>;
}>();
</script>
