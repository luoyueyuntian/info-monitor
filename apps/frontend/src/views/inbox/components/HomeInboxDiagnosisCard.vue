<template>
  <article class="mt-4 rounded-[18px] border border-slate-400/15 bg-white/78 p-[18px] shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2.5">
      <h3 class="m-0 text-base font-semibold">{{ title }}</h3>
      <span :class="pillToneClass(diagnostic.tone)">{{ diagnostic.toneLabel }}</span>
    </div>
    <p class="mb-3.5 text-[#6e665a]">{{ diagnostic.headline }}</p>
    <div class="text-[#6f665a]">{{ diagnostic.summary }}</div>
    <div v-if="trendSummary" class="mt-2 text-[0.88rem] text-[#766f63]">{{ trendSummary }}</div>

    <div class="mt-3.5 grid gap-4 md:grid-cols-2">
      <div class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
        <strong>{{ priorityLabel }}</strong>
        <div class="mt-2.5 grid gap-2">
          <div
            v-for="item in diagnostic.priorityItems"
            :key="`${title}-priority-${item}`"
            class="rounded-xl border border-slate-400/15 bg-white/70 px-3 py-2.5 leading-6 text-[#4b5563]"
          >
            {{ item }}
          </div>
        </div>
      </div>
      <div class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
        <strong>建议动作</strong>
        <div class="mt-2.5 grid gap-2">
          <RouterLink
            v-for="action in diagnostic.actions"
            :key="action.label"
            class="rounded-xl border border-slate-400/15 bg-white/70 px-3 py-2.5 font-semibold leading-6 text-slate-700 transition-colors hover:bg-white/90"
            :to="action.to"
          >
            {{ action.label }}
          </RouterLink>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router";

import { pillToneClass } from "../../../lib/presentation";

defineProps<{
  title: string;
  priorityLabel: string;
  trendSummary?: string;
  diagnostic: {
    tone: string;
    toneLabel: string;
    headline: string;
    summary: string;
    priorityItems: string[];
    actions: Array<{ label: string; to: RouteLocationRaw }>;
  };
}>();
</script>
