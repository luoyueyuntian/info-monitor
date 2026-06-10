<template>
  <article class="rounded-[18px] border border-slate-400/15 bg-white/78 p-[18px] shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
    <div class="mb-3 flex flex-wrap items-start justify-between gap-4">
      <div class="grid min-w-0 gap-1">
        <h3 class="m-0 text-[1.02rem] font-semibold text-[#2f2618]">重点收藏</h3>
        <p class="m-0 text-[0.9rem] leading-[1.45] text-[#756a5b]">把值得长期回看和持续跟踪的事件沉淀成稳定清单，避免散落在聊天记录和笔记里。</p>
      </div>
      <RouterLink class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-[#6b4f1f]" :to="{ path: '/watchlist' }">
        打开观察清单
        <span aria-hidden="true" class="text-base leading-none">›</span>
      </RouterLink>
    </div>
    <div class="mb-3 text-[0.88rem] text-[#766f63]">
      当前有 {{ events.length }} 条重点收藏事件，其中 {{ recentEvents.length }} 条是最近新加入观察，{{ steadyEvents.length }} 条已进入持续跟踪。
    </div>
    <div v-if="recentEvents.length" class="mb-4">
      <div class="mb-3 text-[0.88rem] font-semibold text-[#625847]">最近新加入观察</div>
      <div class="flex flex-col gap-3">
        <article
          v-for="event in recentEvents"
          :key="`recent-${event.id}`"
          class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5"
        >
          <div class="mb-3 flex flex-wrap items-center gap-2">
            <span :class="pillToneClass(event.signal)">{{ eventSignalLabel(event.signal) }}</span>
            <span :class="pillToneClass(eventImpactTone(event))">{{ impactToneLabel(eventImpactTone(event)) }}</span>
            <span :class="pillToneClass(event.status)">{{ eventStatusLabel(event.status) }}</span>
            <span :class="pillToneClass(event.isRead ? 'active' : 'pending')">{{ eventReadLabel(event.isRead) }}</span>
          </div>
          <strong>{{ event.title }}</strong>
          <div class="flex flex-wrap gap-x-2.5 gap-y-2">
            <span class="text-[0.88rem] text-[#766f63]">主题: {{ event.themeName }}</span>
            <span class="text-[0.88rem] text-[#766f63]">时间: {{ formatSmartDateTimeLabel(event.latestStatusChangedAt ?? event.occurredAt) }}</span>
            <span class="text-[0.88rem] text-[#766f63]" v-if="event.bookmarkedAt">收藏于: {{ formatSmartDateTimeLabel(event.bookmarkedAt) }}</span>
          </div>
          <div class="text-[#6f665a]">{{ event.summary }}</div>
          <div class="mt-2 flex flex-wrap gap-3">
            <RouterLink
              class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-[#6b4f1f]"
              :to="`/events/${event.id}`"
            >
              查看事件详情
              <span aria-hidden="true" class="text-base leading-none">›</span>
            </RouterLink>
            <RouterLink
              class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-[#6b4f1f]"
              :to="{ path: `/themes/${event.themeId}`, query: { section: 'events' } }"
            >
              查看所属主题
              <span aria-hidden="true" class="text-base leading-none">›</span>
            </RouterLink>
            <RouterLink
              class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-[#6b4f1f]"
              :to="{ path: '/sources/status', query: { themeId: event.themeId } }"
            >
              查看来源状态
              <span aria-hidden="true" class="text-base leading-none">›</span>
            </RouterLink>
          </div>
        </article>
      </div>
    </div>
    <div v-if="steadyEvents.length">
      <div class="mb-3 text-[0.88rem] font-semibold text-[#625847]">持续跟踪中</div>
      <div class="flex flex-col gap-3">
        <article
          v-for="event in steadyEvents"
          :key="`steady-${event.id}`"
          class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5"
        >
          <div class="mb-3 flex flex-wrap items-center gap-2">
            <span :class="pillToneClass(event.signal)">{{ eventSignalLabel(event.signal) }}</span>
            <span :class="pillToneClass(eventImpactTone(event))">{{ impactToneLabel(eventImpactTone(event)) }}</span>
            <span :class="pillToneClass(event.status)">{{ eventStatusLabel(event.status) }}</span>
            <span :class="pillToneClass(event.isRead ? 'active' : 'pending')">{{ eventReadLabel(event.isRead) }}</span>
          </div>
          <strong>{{ event.title }}</strong>
          <div class="flex flex-wrap gap-x-2.5 gap-y-2">
            <span class="text-[0.88rem] text-[#766f63]">主题: {{ event.themeName }}</span>
            <span class="text-[0.88rem] text-[#766f63]">时间: {{ formatSmartDateTimeLabel(event.latestStatusChangedAt ?? event.occurredAt) }}</span>
            <span class="text-[0.88rem] text-[#766f63]" v-if="event.bookmarkedAt">收藏于: {{ formatSmartDateTimeLabel(event.bookmarkedAt) }}</span>
          </div>
          <div class="text-[#6f665a]">{{ event.summary }}</div>
          <div class="mt-2 flex flex-wrap gap-3">
            <RouterLink
              class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-[#6b4f1f]"
              :to="`/events/${event.id}`"
            >
              查看事件详情
              <span aria-hidden="true" class="text-base leading-none">›</span>
            </RouterLink>
            <RouterLink
              class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-[#6b4f1f]"
              :to="{ path: `/themes/${event.themeId}`, query: { section: 'events' } }"
            >
              查看所属主题
              <span aria-hidden="true" class="text-base leading-none">›</span>
            </RouterLink>
            <RouterLink
              class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-[#6b4f1f]"
              :to="{ path: '/sources/status', query: { themeId: event.themeId } }"
            >
              查看来源状态
              <span aria-hidden="true" class="text-base leading-none">›</span>
            </RouterLink>
          </div>
        </article>
      </div>
    </div>
    <div v-if="!events.length" class="rounded-2xl bg-slate-100/90 p-4 text-[#6f665a]">
      当前还没有收藏事件。遇到值得长期跟踪的事件后，可以在事件详情或事件工作台里加入收藏。
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from "vue";

import type { EventSummary } from "../../../lib/api";
import { eventImpactTone, impactToneLabel } from "../../../lib/impact";
import {
  eventReadLabel,
  eventSignalLabel,
  eventStatusLabel,
  formatSmartDateTimeLabel,
  pillToneClass,
} from "../../../lib/presentation";
import { toTimestamp } from "../../../lib/time";

const props = defineProps<{
  events: EventSummary[];
}>();

const recentEvents = computed(() => {
  const threshold = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return props.events.filter((event) => toTimestamp(event.bookmarkedAt) >= threshold);
});

const steadyEvents = computed(() => {
  const threshold = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return props.events.filter((event) => toTimestamp(event.bookmarkedAt) > 0 && toTimestamp(event.bookmarkedAt) < threshold);
});
</script>
