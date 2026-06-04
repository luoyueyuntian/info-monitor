<template>
  <article class="card flex flex-col gap-3">
    <div class="flex flex-wrap gap-x-2.5 gap-y-2">
      <span :class="pillToneClass()">{{ totalCount }} 条事件</span>
      <span :class="pillToneClass()" v-if="recentCount">新数据 {{ recentCount }}</span>
      <span :class="pillToneClass()" v-if="historicalCount">历史数据 {{ historicalCount }}</span>
    </div>
    <div class="text-[#6f665a]">
      新数据定义为最近24小时内产生的事件，历史数据为更早的记录。
    </div>
  </article>
</template>

<script setup lang="ts">
import { pillToneClass } from "../../../../../lib/presentation";

defineProps<{
  totalCount: number;
  recentCount: number;
  historicalCount: number;
}>();
</script>
