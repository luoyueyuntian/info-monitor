<template>
  <section class="toolbar">
    <RouterLink class="button secondary" :to="{ path, query: { ...normalizedQuery, status: 'open' } }">
      只看待处理
    </RouterLink>
    <RouterLink class="button secondary" :to="{ path, query: { ...normalizedQuery, status: 'tracking' } }">
      只看关注中
    </RouterLink>
    <RouterLink class="button secondary" :to="{ path, query: { ...normalizedQuery, status: 'ignored' } }">
      只看已忽略
    </RouterLink>
    <RouterLink class="button secondary" :to="{ path, query: { status: undefined } }" replace>
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
