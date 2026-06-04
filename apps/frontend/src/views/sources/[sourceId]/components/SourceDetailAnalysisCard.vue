<template>
  <article class="card">
    <div class="card-topline">
      <h3>来源诊断</h3>
      <span :class="pillToneClass(analysis.tone)">{{ analysis.toneLabel }}</span>
    </div>
    <p class="mb-3.5 text-[#6e665a]">{{ analysis.headline }}</p>
    <div class="text-[#6f665a]">{{ analysis.summary }}</div>

    <div class="grid two">
      <div class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
        <strong>当前判断</strong>
        <div class="mt-2.5 grid gap-2">
          <div v-for="item in analysis.keyPoints" :key="`point-${item}`" class="rounded-xl border border-slate-400/15 bg-white/70 px-3 py-2.5 leading-6 text-[#4b5563]">
            {{ item }}
          </div>
        </div>
      </div>
      <div class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
        <strong>风险提醒</strong>
        <div class="mt-2.5 grid gap-2">
          <div v-for="item in analysis.risks" :key="`risk-${item}`" class="rounded-xl border border-slate-400/15 bg-white/70 px-3 py-2.5 leading-6 text-[#4b5563]">
            {{ item }}
          </div>
        </div>
      </div>
    </div>

    <div class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
      <strong>建议动作</strong>
      <div class="mt-2.5 grid gap-2">
        <div v-for="item in analysis.actions" :key="`action-${item}`" class="rounded-xl border border-slate-400/15 bg-white/70 px-3 py-2.5 leading-6 text-[#4b5563]">
          {{ item }}
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { pillToneClass } from "../../../../lib/presentation";

defineProps<{
  analysis: {
    tone: string;
    toneLabel: string;
    headline: string;
    summary: string;
    keyPoints: string[];
    risks: string[];
    actions: string[];
  };
}>();
</script>
