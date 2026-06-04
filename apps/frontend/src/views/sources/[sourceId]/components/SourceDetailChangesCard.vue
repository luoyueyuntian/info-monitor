<template>
  <article class="card">
    <h3>最近变化</h3>
    <div v-if="changes.length" class="list">
      <div v-for="change in changes" :key="change.id" class="list-item">
        <strong>{{ changeTypeLabel(change.changeType) }}</strong>
        <div class="meta">{{ formatSmartDateTimeLabel(change.detectedAt) }}</div>
        <div class="muted">{{ change.summary }}</div>
        <dl class="record-kv" v-if="changeDetails(change).length">
          <template v-for="entry in changeDetails(change)" :key="`${change.id}-${entry.label}`">
            <div>
              <dt>{{ entry.label }}:</dt>
              <dd>{{ entry.value }}</dd>
            </div>
          </template>
        </dl>
      </div>
    </div>
    <div v-else class="empty-state">这个来源当前还没有检测到变化。</div>
  </article>
</template>

<script setup lang="ts">
import type { SourceDetail } from "../../../../lib/api";
import { changeTypeLabel, formatSmartDateTimeLabel } from "../../../../lib/presentation";

defineProps<{
  changes: SourceDetail["changes"];
  changeDetails: (change: SourceDetail["changes"][number]) => Array<{ label: string; value: string }>;
}>();
</script>
