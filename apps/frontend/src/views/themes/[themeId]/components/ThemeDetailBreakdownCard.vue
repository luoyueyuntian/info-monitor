<template>
  <article class="card">
    <h3>{{ breakdown.title }}</h3>
    <p class="mb-3.5 text-[#6e665a]">{{ breakdown.description }}</p>
    <div class="mb-4 mt-3 grid gap-3" v-if="barItems.length">
      <div
        v-for="item in barItems"
        :key="`bar-${item.label}`"
        class="grid gap-2"
      >
        <div class="flex items-center justify-between gap-3">
          <strong>{{ item.label }}</strong>
          <span class="text-[0.88rem] text-[#766f63]">{{ item.count }}</span>
        </div>
        <div class="h-3 w-full overflow-hidden rounded-full bg-slate-200/85">
          <div class="h-full rounded-full bg-[linear-gradient(90deg,#94a3b8_0%,#64748b_100%)]" :style="{ width: `${item.width}%` }"></div>
        </div>
      </div>
    </div>
    <div class="grid gap-3 md:grid-cols-2">
      <div v-for="item in breakdown.items" :key="item.label" class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
        <strong>{{ item.label }}</strong>
        <div class="text-[1.35rem] font-bold text-[#3f311d]">{{ item.count }}</div>
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
