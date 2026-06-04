<template>
  <article class="card inbox-diagnosis-card">
    <div class="card-topline">
      <h3>{{ title }}</h3>
      <span :class="pillToneClass(diagnostic.tone)">{{ diagnostic.toneLabel }}</span>
    </div>
    <p class="section-description">{{ diagnostic.headline }}</p>
    <div class="muted">{{ diagnostic.summary }}</div>
    <div v-if="trendSummary" class="meta inbox-diagnosis-trend">{{ trendSummary }}</div>

    <div class="grid two inbox-diagnosis-grid">
      <div class="breakdown-item">
        <strong>{{ priorityLabel }}</strong>
        <div class="list compact-list">
          <div
            v-for="item in diagnostic.priorityItems"
            :key="`${title}-priority-${item}`"
            class="compact-list-item"
          >
            {{ item }}
          </div>
        </div>
      </div>
      <div class="breakdown-item">
        <strong>建议动作</strong>
        <div class="list compact-list">
          <RouterLink
            v-for="action in diagnostic.actions"
            :key="action.label"
            class="compact-list-item compact-list-item--link"
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
