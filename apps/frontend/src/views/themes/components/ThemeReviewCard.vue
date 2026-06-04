<template>
  <article class="card" v-if="themes.length">
    <div class="card-topline">
      <h3>长期观察</h3>
      <span class="meta">优先回看已经沉淀了收藏事件的主题</span>
    </div>
    <div class="breakdown-grid">
      <RouterLink
        v-for="theme in themes"
        :key="theme.id"
        class="breakdown-item comparison-card"
        :to="`/themes/${theme.id}?section=events`"
      >
        <strong>{{ theme.name }}</strong>
        <div class="meta-row">
          <span class="pill tone-price">收藏 {{ theme.bookmarkedEventCount }}</span>
          <span class="pill tone-neutral" v-if="theme.unreadEventCount">未读 {{ theme.unreadEventCount }}</span>
          <span :class="pillToneClass(theme.sourceHealth)" v-if="theme.sourceHealth">
            {{ sourceHealthLabel(theme.sourceHealth) }}
          </span>
        </div>
        <div class="meta">
          {{ theme.latestInsight ?? theme.latestEventTitle ?? "这个主题当前还没有摘要。" }}
        </div>
      </RouterLink>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { ThemeSummary } from "../../../lib/api";
import { pillToneClass, sourceHealthLabel } from "../../../lib/presentation";

defineProps<{
  themes: ThemeSummary[];
}>();
</script>
