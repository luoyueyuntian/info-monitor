<template>
  <section class="flex flex-wrap items-center gap-3">
    <RouterLink class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover" :to="{ path, query: { ...normalizedQuery, status: 'open' } }">
      只看待处理
    </RouterLink>
    <RouterLink class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover" :to="{ path, query: { ...normalizedQuery, status: 'tracking' } }">
      只看关注中
    </RouterLink>
    <RouterLink class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover" :to="{ path, query: { ...normalizedQuery, status: 'ignored' } }">
      只看已忽略
    </RouterLink>
    <RouterLink class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover" :to="{ path, query: { status: undefined } }" replace>
      清除状态筛选
    </RouterLink>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  path: string;
  normalizedQuery: Record<string, undefined>;
}>();
</script>
