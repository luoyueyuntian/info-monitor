<template>
  <article class="card">
    <h3>事件解释</h3>
    <p class="mb-3.5 text-[#6e665a]">{{ explanation.headline }}</p>
    <div class="text-[#6f665a]">{{ explanation.impact }}</div>

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
  </article>
</template>

<script setup lang="ts">
defineProps<{
  explanation: {
    headline: string;
    impact: string;
    whyItMatters: string[];
    actions: string[];
  };
}>();
</script>
