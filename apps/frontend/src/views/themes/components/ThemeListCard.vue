<template>
  <article class="card">
    <div class="card-topline">
      <h3>主题列表</h3>
      <span class="meta">共 {{ themes.length }} 个主题</span>
    </div>
    <div v-if="themes.length" class="list">
      <RouterLink
        v-for="theme in themes"
        :key="theme.id"
        class="list-item theme-card"
        :to="`/themes/${theme.id}`"
      >
        <div class="theme-topline">
          <span class="pill">{{ themeTypeLabel(theme.type) }}</span>
          <span :class="pillToneClass(theme.sourceHealth)" v-if="theme.sourceHealth">
            {{ sourceHealthLabel(theme.sourceHealth) }}
          </span>
          <span :class="pillToneClass(theme.latestEventSignal)" v-if="theme.latestEventSignal">
            {{ eventSignalLabel(theme.latestEventSignal) }}
          </span>
          <span class="pill tone-neutral" v-if="theme.openEventCount">
            待处理 {{ theme.openEventCount }}
          </span>
          <span class="pill tone-positive" v-if="theme.trackingEventCount">
            关注中 {{ theme.trackingEventCount }}
          </span>
          <span class="pill tone-neutral" v-if="theme.unreadEventCount">
            未读 {{ theme.unreadEventCount }}
          </span>
          <span class="pill tone-price" v-if="theme.bookmarkedEventCount">
            收藏 {{ theme.bookmarkedEventCount }}
          </span>
        </div>
        <strong>{{ theme.name }}</strong>
        <div class="meta-row">
          <span class="meta">状态: {{ themeStatusLabel(theme.status) }}</span>
          <span class="meta">来源数: {{ theme.sourceCount }}</span>
          <span class="meta">最近运行: {{ formatDateTimeLabel(theme.latestRunAt) }}</span>
          <span class="meta">最近事件: {{ formatDateTimeLabel(theme.latestEventAt) }}</span>
        </div>
        <div class="muted">
          {{ theme.latestInsight ?? theme.latestEventTitle ?? "这个主题当前还没有摘要。" }}
        </div>
      </RouterLink>
    </div>
    <div v-else class="empty-state">
      当前筛选条件下没有匹配的主题。
    </div>
  </article>
</template>

<script setup lang="ts">
import type { ThemeSummary } from "../../../lib/api";
import {
  eventSignalLabel,
  formatDateTimeLabel,
  pillToneClass,
  sourceHealthLabel,
  themeStatusLabel,
  themeTypeLabel,
} from "../../../lib/presentation";

defineProps<{
  themes: ThemeSummary[];
}>();
</script>
