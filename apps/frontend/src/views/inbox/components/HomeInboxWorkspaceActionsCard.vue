<template>
  <article class="mt-4 rounded-[18px] border border-slate-400/15 bg-white/78 p-[18px] shadow-[0_12px_30px_rgba(15,23,42,0.05)]" v-if="workspace">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2.5">
      <h3 class="m-0 text-base font-semibold">今日工作流</h3>
      <span class="text-[0.88rem] text-ink-secondary">从首页直接开始处理</span>
    </div>
    <div class="text-ink-body">{{ workspace.summary }}</div>
    <div class="mt-3 grid gap-2.5 md:grid-cols-3">
      <RouterLink
        v-for="action in workspace.actions"
        :key="action.label"
        class="rounded-xl border border-slate-400/15 bg-white/70 px-4 py-3 font-semibold text-slate-700 transition-colors hover:bg-white/90"
        :to="action.to"
      >
        {{ action.label }}
      </RouterLink>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router";

defineProps<{
  workspace: {
    summary: string;
    actions: Array<{ label: string; to: RouteLocationRaw }>;
  } | null;
}>();
</script>
