<template>
  <article
    class="rounded-[18px] border border-slate-400/15 bg-white/78 p-[18px] shadow-[0_12px_30px_rgba(15,23,42,0.05)]"
    :class="highlighted ? 'border-[rgba(90,52,16,0.45)] shadow-[0_8px_22px_rgba(96,64,16,0.12)]' : ''"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="grid min-w-0 gap-1">
        <h3 class="m-0 text-[1.02rem] font-semibold text-ink-heading">{{ section.title }}</h3>
        <p class="m-0 text-[0.9rem] leading-[1.45] text-[#756a5b]">{{ section.description }}</p>
      </div>
      <RouterLink
        class="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-ink-link"
        :to="`/inbox/sections/${section.id}`"
      >
        {{ section.recentCount > 0 ? `查看更多 ${section.recentCount}` : "查看更多" }}
        <span aria-hidden="true" class="text-base leading-none">›</span>
      </RouterLink>
    </div>

    <div class="mb-3.5 rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
      <strong>{{ section.digest.headline }}</strong>
      <div class="text-ink-body">{{ section.digest.summary }}</div>
      <div class="mt-2.5 grid gap-2">
        <div
          v-for="item in section.digest.highlights"
          :key="`${section.id}-${item}`"
          class="rounded-xl border border-slate-400/15 bg-white/70 px-3 py-2.5 leading-6 text-[#4b5563]"
        >
          {{ item }}
        </div>
      </div>
      <RouterLink
        v-if="section.digest.primaryTarget"
        class="mt-2.5 inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-ink-link"
        :to="section.digest.primaryTarget"
      >
        {{ section.digest.primaryActionLabel }}
        <span aria-hidden="true" class="text-base leading-none">›</span>
      </RouterLink>
      <div class="mt-3 flex flex-wrap gap-3">
        <RouterLink
          class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-400/15 bg-white/70 px-4 py-2.5 font-semibold text-slate-700 transition-colors hover:bg-white/90"
          :to="{ path: '/events', query: { impact: inferredSectionImpact(section), recent: section.recentCount > 0 ? '24h' : undefined, sort: section.events.some((event) => (event.status ?? 'open') === 'open') ? 'statusChanged' : 'occurredAt' } }"
        >
          查看本分区事件
        </RouterLink>
        <RouterLink
          v-if="section.visibleEvents[0]"
          class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-400/15 bg-white/70 px-4 py-2.5 font-semibold text-slate-700 transition-colors hover:bg-white/90"
          :to="{ path: `/themes/${section.visibleEvents[0].themeId}`, query: { section: inferredSectionImpact(section) === 'negative' ? 'analysis' : section.visibleEvents[0].infoType === 'price' ? 'trend' : 'timeline' } }"
        >
          查看优先主题
        </RouterLink>
      </div>
    </div>

    <div v-if="section.events.length" class="flex flex-col gap-3">
      <article
        v-for="event in section.visibleEvents"
        :key="event.id"
        class="overflow-hidden rounded-2xl border border-slate-400/15 bg-slate-50/90 p-0"
      >
        <div class="border-b border-slate-400/15 px-3 py-2.5" :class="eventHeaderToneClass(event)">
          <span :class="pillToneClass(event.signal, 'text')">{{ eventSignalLabel(event.signal) }}</span>
          <span :class="pillToneClass(eventImpactTone(event), 'text')">{{ impactToneLabel(eventImpactTone(event)) }}</span>
          <span :class="pillToneClass(event.status, 'text')">{{ eventStatusLabel(event.status) }}</span>
          <span :class="pillToneClass(event.isRead ? 'active' : 'pending', 'text')">{{ eventReadLabel(event.isRead) }}</span>
          <span :class="pillToneClass(event.isBookmarked ? '30d_low' : 'neutral', 'text')">{{ eventBookmarkLabel(event.isBookmarked) }}</span>
        </div>
        <div class="grid gap-2 bg-slate-50/90 px-4 py-3.5">
          <RouterLink
            class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.98rem] font-semibold text-ink-link"
            :to="`/events/${event.id}`"
          >
            {{ event.title }}
            <span aria-hidden="true" class="text-base leading-none">›</span>
          </RouterLink>
          <div class="text-[0.88rem] text-ink-secondary">{{ event.themeName }} · {{ formatSmartDateTimeLabel(event.occurredAt) }}</div>
          <div class="text-ink-body">{{ event.summary }}</div>
          <div class="mt-2.5 grid gap-1.5" v-if="eventDetails(event).length">
            <template v-for="entry in eventDetails(event)" :key="`${event.id}-${entry.label}`">
              <div class="flex flex-wrap gap-1.5">
                <dt class="font-bold text-[#473924]">{{ entry.label }}:</dt>
                <dd class="m-0 text-[#695e4c]">{{ entry.value }}</dd>
              </div>
            </template>
          </div>
          <div class="mt-2 flex flex-wrap gap-3">
            <RouterLink
              class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-400/15 bg-white/70 px-4 py-2.5 font-semibold text-slate-700 transition-colors hover:bg-white/90"
              :to="{ path: `/themes/${event.themeId}`, query: { section: eventImpactTone(event) === 'negative' ? 'analysis' : event.infoType === 'price' ? 'trend' : 'timeline' } }"
            >
              {{ eventImpactTone(event) === "negative" ? "查看主题分析" : event.infoType === "price" ? "查看主题趋势" : "查看主题时间线" }}
            </RouterLink>
            <RouterLink
              class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-400/15 bg-white/70 px-4 py-2.5 font-semibold text-slate-700 transition-colors hover:bg-white/90"
              :to="{ path: '/sources/status', query: { themeId: event.themeId } }"
            >
              查看来源状态
            </RouterLink>
            <RouterLink
              class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-400/15 bg-white/70 px-4 py-2.5 font-semibold text-slate-700 transition-colors hover:bg-white/90"
              :to="{ path: '/events', query: { themeId: event.themeId, impact: eventImpactTone(event) !== 'neutral' ? eventImpactTone(event) : undefined, sort: 'occurredAt' } }"
            >
              查看同主题事件
            </RouterLink>
          </div>
        </div>
      </article>
    </div>
    <div v-else class="rounded-2xl bg-slate-100/90 p-4 text-ink-body">
      这一分区当前没有新的事件。
    </div>
  </article>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router";

import type { EventSummary } from "../../../lib/api";
import { eventImpactTone, impactToneLabel } from "../../../lib/impact";
import {
  eventBookmarkLabel,
  eventReadLabel,
  eventSignalLabel,
  eventStatusLabel,
  formatSmartDateTimeLabel,
  pillToneClass,
} from "../../../lib/presentation";

defineProps<{
  highlighted: boolean;
  section: {
    id: string;
    title: string;
    description: string;
    events: EventSummary[];
    visibleEvents: EventSummary[];
    recentCount: number;
    digest: {
      headline: string;
      summary: string;
      highlights: string[];
      primaryTarget: RouteLocationRaw | null;
      primaryActionLabel: string;
    };
  };
  eventHeaderToneClass: (event: EventSummary) => string;
  eventDetails: (event: EventSummary) => Array<{ label: string; value: string }>;
}>();

function inferredSectionImpact(section: { events: EventSummary[] }) {
  const negativeCount = section.events.filter((event) => eventImpactTone(event) === "negative").length;
  const positiveCount = section.events.filter((event) => eventImpactTone(event) === "positive").length;

  if (negativeCount > 0 && positiveCount === 0) {
    return "negative";
  }

  if (positiveCount > 0 && negativeCount === 0) {
    return "positive";
  }

  return undefined;
}
</script>
