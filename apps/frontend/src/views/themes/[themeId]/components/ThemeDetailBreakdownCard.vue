<template>
  <article class="card">
    <h3>{{ breakdown.title }}</h3>
    <p class="section-description">{{ breakdown.description }}</p>
    <div class="distribution-bars" v-if="barItems.length">
      <div
        v-for="item in barItems"
        :key="`bar-${item.label}`"
        class="distribution-bar-row"
      >
        <div class="distribution-bar-meta">
          <strong>{{ item.label }}</strong>
          <span class="meta">{{ item.count }}</span>
        </div>
        <div class="distribution-bar-track">
          <div class="distribution-bar-fill" :style="{ width: `${item.width}%` }"></div>
        </div>
      </div>
    </div>
    <div class="breakdown-grid">
      <div v-for="item in breakdown.items" :key="item.label" class="breakdown-item">
        <strong>{{ item.label }}</strong>
        <div class="breakdown-count">{{ item.count }}</div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
defineProps<{
  breakdown: {
    title: string;
    description: string;
    items: Array<{ label: string; count: number }>;
  };
  barItems: Array<{ label: string; count: number; width: number }>;
}>();
</script>
