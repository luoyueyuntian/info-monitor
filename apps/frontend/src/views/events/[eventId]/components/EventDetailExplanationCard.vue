<template>
  <article class="card">
    <h3>事件解释</h3>
    <p class="section-description">{{ explanation.headline }}</p>
    <div class="muted">{{ explanation.impact }}</div>

    <div class="grid two">
      <div class="breakdown-item">
        <strong>为什么重要</strong>
        <div class="list compact-list">
          <div
            v-for="item in explanation.whyItMatters"
            :key="`why-${item}`"
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
            v-for="item in explanation.actions"
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
defineProps<{
  explanation: {
    headline: string;
    impact: string;
    whyItMatters: string[];
    actions: string[];
  };
}>();
</script>
