<template>
  <article class="card">
    <h3>事件解释</h3>
    <p class="mb-3.5 text-[#6e665a]">{{ explanation.headline }}</p>
    <div class="text-ink-body">{{ explanation.impact }}</div>

    <div class="grid two">
      <div class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
        <strong>为什么重要</strong>
        <div class="mt-2.5 grid gap-2">
          <div
            v-for="item in explanation.whyItMatters"
            :key="`why-${item}`"
            class="rounded-xl border border-slate-400/15 bg-white/70 px-3 py-2.5 leading-6 text-[#4b5563]"
          >
            {{ item }}
          </div>
        </div>
      </div>
      <div class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
        <strong>建议动作</strong>
        <div class="mt-2.5 grid gap-2">
          <div
            v-for="item in explanation.actions"
            :key="`action-${item}`"
            class="rounded-xl border border-slate-400/15 bg-white/70 px-3 py-2.5 leading-6 text-[#4b5563]"
          >
            {{ item }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="reviewActions.length" class="mt-4 rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
      <strong>建议入口</strong>
      <div class="mt-2.5 grid gap-2">
        <RouterLink
          v-for="action in reviewActions"
          :key="action.label"
          class="rounded-xl border border-slate-400/15 bg-white/70 px-3 py-2.5 font-semibold leading-6 text-slate-700 transition-colors hover:bg-white/90"
          :to="action.to"
        >
          {{ action.label }}
        </RouterLink>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router";

defineProps<{
  explanation: {
    headline: string;
    impact: string;
    whyItMatters: string[];
    actions: string[];
  };
  reviewActions: Array<{ label: string; to: RouteLocationRaw }>;
}>();
</script>
