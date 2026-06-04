<template>
  <article class="card" v-if="rows.length">
    <h3>结构化上下文</h3>
    <dl class="mt-2.5 grid gap-1.5">
      <template v-for="entry in rows" :key="entry.label">
        <div class="flex flex-wrap gap-1.5">
          <dt class="font-bold text-[#473924]">{{ entry.label }}:</dt>
          <dd class="m-0 text-[#695e4c]">{{ entry.value }}</dd>
        </div>
      </template>
    </dl>
    <div v-if="recordLink" class="mt-2.5 text-[0.92rem] text-[#604510]">
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
