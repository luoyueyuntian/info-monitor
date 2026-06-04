<template>
  <article class="rounded-[18px] border border-slate-400/15 bg-white/78 p-[18px] shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
    <div class="mb-3 flex flex-wrap items-start justify-between gap-4">
      <div class="grid min-w-0 gap-1">
        <h3 class="m-0 text-[1.02rem] font-semibold text-[#2f2618]">重点收藏</h3>
        <p class="m-0 text-[0.9rem] leading-[1.45] text-[#756a5b]">把值得长期回看和持续跟踪的事件沉淀成稳定清单，避免散落在聊天记录和笔记里。</p>
      </div>
      <RouterLink class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-[#6b4f1f]" :to="{ path: '/events', query: { bookmark: 'bookmarked', sort: 'statusChanged' } }">
        查看全部收藏事件
        <span aria-hidden="true" class="text-base leading-none">›</span>
      </RouterLink>
    </div>
    <div class="mb-3 text-[0.88rem] text-[#766f63]">
      当前有 {{ events.length }} 条重点收藏事件，适合在完成日常巡检后继续回看。
    </div>
    <div v-if="events.length" class="flex flex-col gap-3">
      <RouterLink
        v-for="event in events"
        :key="event.id"
        class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5"
        :to="`/events/${event.id}`"
      >
        <div class="mb-3 flex flex-wrap items-center gap-2">
          <span :class="pillToneClass(event.signal)">{{ eventSignalLabel(event.signal) }}</span>
          <span :class="pillToneClass(event.status)">{{ eventStatusLabel(event.status) }}</span>
          <span :class="pillToneClass(event.isRead ? 'active' : 'pending')">{{ eventReadLabel(event.isRead) }}</span>
        </div>
        <strong>{{ event.title }}</strong>
        <div class="flex flex-wrap gap-x-2.5 gap-y-2">
          <span class="text-[0.88rem] text-[#766f63]">主题: {{ event.themeName }}</span>
          <span class="text-[0.88rem] text-[#766f63]">时间: {{ formatSmartDateTimeLabel(event.latestStatusChangedAt ?? event.occurredAt) }}</span>
        </div>
        <div class="text-[#6f665a]">{{ event.summary }}</div>
      </RouterLink>
    </div>
    <div v-else class="rounded-2xl bg-slate-100/90 p-4 text-[#6f665a]">
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
