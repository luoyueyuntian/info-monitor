<template>
  <article class="card">
    <div class="card-topline">
      <h3>关联主题</h3>
      <span class="meta">{{ themeName }}</span>
    </div>
    <p class="section-description">{{ relatedThemeSummary }}</p>
    <div class="actions">
      <RouterLink class="button secondary" :to="themeAnalysisTarget">
        查看主题分析
      </RouterLink>
      <RouterLink
        v-if="themeQueueTarget"
        class="button secondary"
        :to="themeQueueTarget"
      >
        查看主题事件队列
      </RouterLink>
      <RouterLink
        v-if="themeTrendTarget"
        class="button secondary"
        :to="themeTrendTarget"
      >
        查看主题趋势
      </RouterLink>
      <RouterLink class="button secondary" :to="themeTimelineTarget">
        查看主题时间线
      </RouterLink>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router";

defineProps<{
  themeName: string;
  relatedThemeSummary: string;
  themeAnalysisTarget: RouteLocationRaw;
  themeQueueTarget: RouteLocationRaw | null;
  themeTrendTarget: RouteLocationRaw | null;
  themeTimelineTarget: RouteLocationRaw;
}>();
</script>
