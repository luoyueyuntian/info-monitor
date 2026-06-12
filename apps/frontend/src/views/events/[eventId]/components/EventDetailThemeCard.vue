<template>
  <article class="card">
    <div class="card-topline">
      <h3>关联主题</h3>
      <span class="text-[0.88rem] text-ink-secondary">{{ themeName }}</span>
    </div>
    <p class="mb-3.5 text-[#6e665a]">{{ relatedThemeSummary }}</p>
    <div class="flex flex-wrap gap-3">
      <RouterLink class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover" :to="themeAnalysisTarget">
        查看主题分析
      </RouterLink>
      <RouterLink
        v-if="themeQueueTarget"
        class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover"
        :to="themeQueueTarget"
      >
        查看主题事件队列
      </RouterLink>
      <RouterLink
        v-if="themeTrendTarget"
        class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover"
        :to="themeTrendTarget"
      >
        查看主题趋势
      </RouterLink>
      <RouterLink class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover" :to="themeTimelineTarget">
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
