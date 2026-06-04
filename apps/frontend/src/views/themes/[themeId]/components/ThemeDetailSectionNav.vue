<template>
  <section class="toolbar">
    <button class="button secondary quick-preset-button" @click="scrollToNamedSection('analysis')">分析</button>
    <button class="button secondary quick-preset-button" @click="scrollToNamedSection('trend')">趋势</button>
    <button class="button secondary quick-preset-button" @click="scrollToNamedSection('sources')">来源</button>
    <button class="button secondary quick-preset-button" @click="scrollToNamedSection('records')">记录</button>
    <button class="button secondary quick-preset-button" @click="scrollToNamedSection('timeline')">时间线</button>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  scrollToNamedSection: (sectionId: string) => void;
}>();
</script>
