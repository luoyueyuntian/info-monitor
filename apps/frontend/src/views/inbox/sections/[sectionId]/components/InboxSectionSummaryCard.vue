<template>
  <article class="card stack">
    <div class="meta-row">
      <span class="pill">{{ totalCount }} 条事件</span>
      <span class="pill" v-if="recentCount">新数据 {{ recentCount }}</span>
      <span class="pill" v-if="historicalCount">历史数据 {{ historicalCount }}</span>
    </div>
    <div class="muted">
      新数据定义为最近24小时内产生的事件，历史数据为更早的记录。
    </div>
  </article>
</template>

<script setup lang="ts">
defineProps<{
  totalCount: number;
  recentCount: number;
  historicalCount: number;
}>();
</script>
