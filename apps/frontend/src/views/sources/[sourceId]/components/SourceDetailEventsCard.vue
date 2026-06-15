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
          class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.98rem] font-semibold text-ink-link"
          :to="eventDetailTarget(event.id)"
        >
          {{ event.title }}
          <span aria-hidden="true" class="text-base leading-none">›</span>
        </RouterLink>
        <div class="text-[0.88rem] text-ink-secondary">{{ formatSmartDateTimeLabel(event.occurredAt) }}</div>
        <div class="text-ink-body">{{ event.summary }}</div>
        <div class="mt-2 flex flex-wrap gap-3">
          <RouterLink
            class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-400/15 bg-white/70 px-4 py-2.5 font-semibold text-slate-700 transition-colors hover:bg-white/90"
            :to="themeDetailTarget(eventImpactTone(event) === 'negative' ? 'analysis' : 'timeline')"
          >
            {{ eventImpactTone(event) === "negative" ? "查看主题分析" : "查看主题时间线" }}
          </RouterLink>
          <RouterLink
            class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-400/15 bg-white/70 px-4 py-2.5 font-semibold text-slate-700 transition-colors hover:bg-white/90"
            :to="eventDetailTarget(event.id)"
          >
            查看事件详情
          </RouterLink>
        </div>
      </article>
    </div>
    <div v-else class="rounded-2xl bg-slate-100/90 p-4 text-ink-body">这个来源当前还没有关联事件。</div>
  </article>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

import type { SourceDetail } from "../../../../lib/api";
import { eventImpactTone, impactToneLabel } from "../../../../lib/impact";
import { buildStockReportReturnQuery } from "../../../../lib/stock-market-report-navigation";
import {
  eventBookmarkLabel,
  eventReadLabel,
  eventSignalLabel,
  eventStatusLabel,
  formatSmartDateTimeLabel,
  pillToneClass,
} from "../../../../lib/presentation";

const props = defineProps<{
  themeId: string;
  events: SourceDetail["events"];
}>();

const route = useRoute();
const workspaceId = computed(() => typeof route.params.workspaceId === "string" ? route.params.workspaceId : null);
const stockReportQuery = computed(() => buildStockReportReturnQuery({
  reportDate: typeof route.query.reportDate === "string" ? route.query.reportDate : null,
  reportFocus: typeof route.query.reportFocus === "string" ? route.query.reportFocus : null,
}));

function eventDetailTarget(eventId: string) {
  if (workspaceId.value) {
    return {
      path: `/workspace/${workspaceId.value}/actions/${eventId}`,
      query: stockReportQuery.value,
    };
  }

  return `/events/${eventId}`;
}

function themeDetailTarget(section: string) {
  if (workspaceId.value) {
    return {
      path: `/workspace/${workspaceId.value}/topics/${props.themeId}`,
      query: { section, ...stockReportQuery.value },
    };
  }

  return { path: `/themes/${props.themeId}`, query: { section } };
}
</script>
