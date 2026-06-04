<template>
  <article class="card">
    <div class="card-topline">
      <h3>事件诊断</h3>
      <span :class="pillToneClass(diagnostic.tone)">{{ diagnostic.toneLabel }}</span>
    </div>
    <p class="section-description">{{ diagnostic.headline }}</p>
    <div class="muted">{{ diagnostic.summary }}</div>

    <div class="grid two">
      <div class="breakdown-item">
        <strong>优先处理</strong>
        <div class="list compact-list">
          <div
            v-for="item in diagnostic.priorityItems"
            :key="`priority-${item}`"
            class="compact-list-item"
          >
            {{ item }}
          </div>
        </div>
      </div>
      <div class="breakdown-item">
        <strong>建议动作</strong>
        <div class="list compact-list">
          <div
            v-for="item in diagnostic.actions"
            :key="`action-${item}`"
            class="compact-list-item"
          >
            {{ item }}
          </div>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { pillToneClass } from "../../../lib/presentation";

defineProps<{
  diagnostic: {
    tone: string;
    toneLabel: string;
    headline: string;
    summary: string;
    priorityItems: string[];
    actions: string[];
  };
}>();
</script>
