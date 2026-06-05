<template>
  <article class="card flex flex-col gap-3">
    <div class="flex flex-wrap gap-x-2.5 gap-y-2">
      <span :class="pillToneClass(detail.signal)">{{ eventSignalLabel(detail.signal) }}</span>
      <span :class="pillToneClass(eventImpactTone(detail))">{{ impactToneLabel(eventImpactTone(detail)) }}</span>
      <span :class="pillToneClass(detail.status)">{{ eventStatusLabel(detail.status) }}</span>
      <span :class="pillToneClass()" v-if="detail.eventType">{{ eventTypeLabel(detail.eventType) }}</span>
      <span :class="pillToneClass(detail.isRead ? 'active' : 'pending')">{{ eventReadLabel(detail.isRead) }}</span>
      <span :class="pillToneClass(detail.isBookmarked ? '30d_low' : 'neutral')">{{ eventBookmarkLabel(detail.isBookmarked) }}</span>
    </div>
    <div class="text-[0.88rem] text-[#766f63]">
      主题: {{ detail.themeName }} · 时间: {{ formatDateTimeLabel(detail.occurredAt) }}
      <span v-if="detail.sourceName"> · 来源: {{ detail.sourceName }}</span>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { EventDetail } from "../../../../lib/api";
import { eventImpactTone, impactToneLabel } from "../../../../lib/impact";
import {
  eventBookmarkLabel,
  eventReadLabel,
  eventSignalLabel,
  eventStatusLabel,
  eventTypeLabel,
  formatDateTimeLabel,
  pillToneClass,
} from "../../../../lib/presentation";

defineProps<{
  detail: EventDetail;
}>();
</script>
