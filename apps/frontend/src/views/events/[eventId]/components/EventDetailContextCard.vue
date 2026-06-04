<template>
  <article class="card" v-if="rows.length">
    <h3>结构化上下文</h3>
    <dl class="record-kv">
      <template v-for="entry in rows" :key="entry.label">
        <div>
          <dt>{{ entry.label }}:</dt>
          <dd>{{ entry.value }}</dd>
        </div>
      </template>
    </dl>
    <div v-if="recordLink" class="record-link">
      <a :href="recordLink" target="_blank" rel="noreferrer">打开原始来源</a>
    </div>
  </article>
</template>

<script setup lang="ts">
defineProps<{
  rows: Array<{ label: string; value: string }>;
  recordLink: string | null;
}>();
</script>
