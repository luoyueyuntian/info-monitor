<template>
  <article class="card">
    <h3>最近记录</h3>
    <div v-if="records.length" class="record-grid">
      <article v-for="record in records" :key="record.id" class="list-item">
        <span class="pill">{{ themeTypeLabel(record.infoType) }}</span>
        <strong>{{ record.title }}</strong>
        <div class="meta-row">
          <span class="meta">{{ formatDateTimeLabel(record.occurredAt) }}</span>
        </div>
        <dl class="record-kv">
          <template v-for="entry in recordDetails(record)" :key="`${record.id}-${entry.label}`">
            <div>
              <dt>{{ entry.label }}:</dt>
              <dd>{{ entry.value }}</dd>
            </div>
          </template>
        </dl>
        <div v-if="recordLink(record)" class="record-link">
          <a :href="recordLink(record)!" target="_blank" rel="noreferrer">打开原始来源</a>
        </div>
      </article>
    </div>
    <div v-else class="empty-state">
      这个主题当前还没有记录。
    </div>
  </article>
</template>

<script setup lang="ts">
import type { ThemeRecord } from "../../../../lib/api";
import { formatDateTimeLabel, themeTypeLabel } from "../../../../lib/presentation";

defineProps<{
  records: ThemeRecord[];
  recordDetails: (record: ThemeRecord) => Array<{ label: string; value: string }>;
  recordLink: (record: ThemeRecord) => string | null;
}>();
</script>
