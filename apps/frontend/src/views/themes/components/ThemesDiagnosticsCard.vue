<template>
  <article class="card">
    <div class="card-topline">
      <h3>主题诊断</h3>
      <span :class="pillToneClass(diagnostic.tone)">{{ diagnostic.toneLabel }}</span>
    </div>
    <p class="mb-3.5 text-[#6e665a]">{{ diagnostic.headline }}</p>
    <div class="text-ink-body">{{ diagnostic.summary }}</div>

    <div class="grid two">
      <div class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
        <strong>优先查看</strong>
        <div class="mt-2.5 grid gap-2">
          <div
            v-for="item in diagnostic.priorityItems"
            :key="`priority-${item}`"
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
            v-for="item in diagnostic.actions"
            :key="`action-${item.label}`"
            class="rounded-xl border border-slate-400/15 bg-white/70 px-3 py-2.5 font-semibold leading-6 text-slate-700 transition-colors hover:bg-white/90"
            :to="item.to"
          >
            {{ item.label }}
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
