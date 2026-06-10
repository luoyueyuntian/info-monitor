<template>
  <article class="card">
    <h3>关联事件</h3>
    <div v-if="events.length" class="flex flex-col gap-3">
      <article
        v-for="event in events"
        :key="event.id"
        class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5"
      >
        <span :class="pillToneClass(event.signal)">{{ eventSignalLabel(event.signal) }}</span>
        <span :class="pillToneClass(eventImpactTone(event))">{{ impactToneLabel(eventImpactTone(event)) }}</span>
        <span :class="pillToneClass(event.status)">{{ eventStatusLabel(event.status) }}</span>
        <span :class="pillToneClass(event.isRead ? 'active' : 'pending')">{{ eventReadLabel(event.isRead) }}</span>
        <span :class="pillToneClass(event.isBookmarked ? '30d_low' : 'neutral')">{{ eventBookmarkLabel(event.isBookmarked) }}</span>
        <RouterLink
          class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.98rem] font-semibold text-[#6b4f1f]"
          :to="`/events/${event.id}`"
        >
          {{ event.title }}
          <span aria-hidden="true" class="text-base leading-none">›</span>
        </RouterLink>
        <div class="text-[0.88rem] text-[#766f63]">{{ formatSmartDateTimeLabel(event.occurredAt) }}</div>
        <div class="text-[#6f665a]">{{ event.summary }}</div>
        <div class="mt-2 flex flex-wrap gap-3">
          <RouterLink
            class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-400/15 bg-white/70 px-4 py-2.5 font-semibold text-slate-700 transition-colors hover:bg-white/90"
            :to="{ path: `/themes/${themeId}`, query: { section: eventImpactTone(event) === 'negative' ? 'analysis' : 'timeline' } }"
          >
            {{ eventImpactTone(event) === "negative" ? "查看主题分析" : "查看主题时间线" }}
          </RouterLink>
          <RouterLink
            class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-400/15 bg-white/70 px-4 py-2.5 font-semibold text-slate-700 transition-colors hover:bg-white/90"
            :to="`/events/${event.id}`"
          >
            查看事件详情
          </RouterLink>
        </div>
      </article>
    </div>
    <div v-else class="rounded-2xl bg-slate-100/90 p-4 text-[#6f665a]">这个来源当前还没有关联事件。</div>
  </article>
</template>

<script setup lang="ts">
import type { SourceDetail } from "../../../../lib/api";
import { eventImpactTone, impactToneLabel } from "../../../../lib/impact";
import {
  eventBookmarkLabel,
  eventReadLabel,
  eventSignalLabel,
  eventStatusLabel,
  formatSmartDateTimeLabel,
  pillToneClass,
} from "../../../../lib/presentation";

defineProps<{
  themeId: string;
  events: SourceDetail["events"];
}>();
</script>
