<template>
  <article class="card" v-if="statusHistory.length">
    <h3>状态变更历史</h3>
    <div class="flex flex-col gap-3">
      <div v-for="item in statusHistory" :key="item.id" class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
        <strong>
          {{ item.fromStatus ? `${eventStatusLabel(item.fromStatus)} → ${eventStatusLabel(item.toStatus)}` : eventStatusLabel(item.toStatus) }}
        </strong>
        <div class="text-[0.88rem] text-ink-secondary">{{ formatSmartDateTimeLabel(item.changedAt) }}</div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { EventDetail } from "../../../../lib/api";
import { eventStatusLabel, formatSmartDateTimeLabel } from "../../../../lib/presentation";

defineProps<{
  statusHistory: NonNullable<EventDetail["statusHistory"]>;
}>();
</script>
