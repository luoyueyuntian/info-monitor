<template>
  <article class="card">
    <strong>{{ title }}</strong>
    <p class="mb-3.5 text-[#6e665a]">{{ body }}</p>
    <div v-if="actions.length" class="mt-3 flex flex-wrap gap-3">
      <RouterLink
        v-for="action in actions"
        :key="action.label"
        class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-400/15 bg-white/70 px-4 py-2.5 font-semibold text-slate-700 transition-colors hover:bg-white/90"
        :to="action.to"
      >
        {{ action.label }}
      </RouterLink>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router";

withDefaults(defineProps<{
  title: string;
  body: string;
  actions?: Array<{ label: string; to: RouteLocationRaw }>;
}>(), {
  actions: () => [],
});
</script>
