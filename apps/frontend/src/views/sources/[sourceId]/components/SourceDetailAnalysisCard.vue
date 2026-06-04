<template>
  <article class="card">
    <div class="card-topline">
      <h3>来源诊断</h3>
      <span :class="pillToneClass(analysis.tone)">{{ analysis.toneLabel }}</span>
    </div>
    <p class="section-description">{{ analysis.headline }}</p>
    <div class="muted">{{ analysis.summary }}</div>

    <div class="grid two">
      <div class="breakdown-item">
        <strong>当前判断</strong>
        <div class="list compact-list">
          <div v-for="item in analysis.keyPoints" :key="`point-${item}`" class="compact-list-item">
            {{ item }}
          </div>
        </div>
      </div>
      <div class="breakdown-item">
        <strong>风险提醒</strong>
        <div class="list compact-list">
          <div v-for="item in analysis.risks" :key="`risk-${item}`" class="compact-list-item">
            {{ item }}
          </div>
        </div>
      </div>
    </div>

    <div class="breakdown-item">
      <strong>建议动作</strong>
      <div class="list compact-list">
        <div v-for="item in analysis.actions" :key="`action-${item}`" class="compact-list-item">
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
