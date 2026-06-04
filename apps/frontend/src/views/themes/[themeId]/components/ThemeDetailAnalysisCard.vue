<template>
  <article class="card">
    <div class="card-topline">
      <h3>分析与建议</h3>
      <span :class="pillToneClass(analysis.tone)">{{ analysisToneLabel(analysis.tone) }}</span>
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

    <div class="breakdown-item">
      <strong>近期变化</strong>
      <div class="muted">{{ analysis.recentChange.headline }}</div>
      <div class="section-description analysis-inline-summary">{{ analysis.recentChange.summary }}</div>
      <div class="list compact-list">
        <div
          v-for="item in analysis.recentChange.highlights"
          :key="`recent-${item}`"
          class="compact-list-item"
        >
          {{ item }}
        </div>
      </div>
    </div>

    <div class="breakdown-item">
      <strong>趋势判断</strong>
      <div class="muted">{{ analysis.trend.headline }}</div>
      <div class="section-description analysis-inline-summary">{{ analysis.trend.summary }}</div>
      <div class="list compact-list">
        <div
          v-for="item in analysis.trend.highlights"
          :key="`trend-${item}`"
          class="compact-list-item"
        >
          {{ item }}
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { ThemeAnalysis } from "../../../../lib/api";
import { pillToneClass } from "../../../../lib/presentation";

defineProps<{
  analysis: ThemeAnalysis;
  analysisToneLabel: (tone: string) => string;
}>();
</script>
