<template>
  <article class="card" v-if="workspace">
    <div class="card-topline">
      <h3>成组处理</h3>
      <span class="text-[0.88rem] text-[#766f63]">从当前事件集合直接切到处理视图</span>
    </div>
    <div class="text-[#6f665a]">{{ workspace.summary }}</div>
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
import type { EventWorkspaceActions } from "./event-workbench-model";

defineProps<{
  workspace: EventWorkspaceActions | null;
}>();
</script>
