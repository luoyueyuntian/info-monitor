<template>
  <article class="card">
    <div class="card-topline">
      <h3>趋势图</h3>
      <span class="meta">
        {{ themeType === "price" ? "最近价格走势" : "最近事件活跃度" }}
      </span>
    </div>

    <template v-if="themeType === 'price' && priceTrendPoints.length > 1">
      <div class="trend-chart">
        <svg viewBox="0 0 320 160" class="trend-chart-svg" role="img" aria-label="价格趋势图">
          <polyline
            class="trend-line"
            :points="priceTrendPolyline"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <circle
            v-for="point in priceTrendPoints"
            :key="`${point.label}-${point.value}`"
            class="trend-point"
            :cx="point.x"
            :cy="point.y"
            r="3"
          />
        </svg>
      </div>
      <div class="trend-chart-meta">
        <span class="meta">最低: {{ formatMaybeLabel(priceTrendMin) }}</span>
        <span class="meta">最高: {{ formatMaybeLabel(priceTrendMax) }}</span>
        <span class="meta">最新: {{ formatMaybeLabel(priceTrendLatest) }}</span>
      </div>
      <div class="breakdown-grid trend-baseline-grid">
        <div class="breakdown-item">
          <strong>相对低点</strong>
          <div class="breakdown-count">{{ priceVsMinLabel }}</div>
        </div>
        <div class="breakdown-item">
          <strong>相对高点</strong>
          <div class="breakdown-count">{{ priceVsMaxLabel }}</div>
        </div>
        <div class="breakdown-item">
          <strong>样本振幅</strong>
          <div class="breakdown-count">{{ priceRangeLabel }}</div>
        </div>
      </div>
      <div class="trend-axis">
        <span
          v-for="point in priceTrendPoints"
          :key="`axis-${point.label}`"
          class="trend-axis-label"
        >
          {{ point.label }}
        </span>
      </div>
    </template>

    <template v-else-if="eventActivityBars.length > 0">
      <div class="activity-bars">
        <div
          v-for="bar in eventActivityBars"
          :key="bar.label"
          class="activity-bar-item"
        >
          <div class="activity-bar-value">{{ bar.count }}</div>
          <div class="activity-bar-track">
            <div class="activity-bar-fill" :style="{ height: `${bar.height}%` }"></div>
          </div>
          <div class="activity-bar-label">{{ bar.label }}</div>
        </div>
      </div>
    </template>
  </article>
</template>

<script setup lang="ts">
import { formatMaybeLabel } from "../../../../lib/presentation";

defineProps<{
  themeType: string;
  priceTrendPoints: Array<{ label: string; value: number; x: number; y: number }>;
  priceTrendPolyline: string;
  priceTrendMin: number | null;
  priceTrendMax: number | null;
  priceTrendLatest: number | null;
  priceVsMinLabel: string;
  priceVsMaxLabel: string;
  priceRangeLabel: string;
  eventActivityBars: Array<{ label: string; count: number; height: number }>;
}>();
</script>
