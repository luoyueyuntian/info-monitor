<template>
  <article class="card" v-if="statusHistory.length">
    <h3>状态变更历史</h3>
    <div class="list">
      <div v-for="item in statusHistory" :key="item.id" class="list-item">
        <strong>
          {{ item.fromStatus ? `${eventStatusLabel(item.fromStatus)} → ${eventStatusLabel(item.toStatus)}` : eventStatusLabel(item.toStatus) }}
        </strong>
        <div class="meta">{{ formatSmartDateTimeLabel(item.changedAt) }}</div>
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
