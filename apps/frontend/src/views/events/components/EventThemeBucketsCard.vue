<template>
  <article class="card">
    <div class="card-topline">
      <h3>按主题聚合</h3>
      <span class="meta">先看哪个主题压了更多待处理或关注中的事件</span>
    </div>
    <div class="breakdown-grid">
      <article
        v-for="item in items"
        :key="item.themeId"
        class="breakdown-item comparison-card"
      >
        <strong>{{ item.themeName }}</strong>
        <div class="meta-row">
          <span class="pill tone-neutral" v-if="item.openCount">待处理 {{ item.openCount }}</span>
          <span class="pill tone-positive" v-if="item.trackingCount">关注中 {{ item.trackingCount }}</span>
          <span class="pill tone-negative" v-if="item.ignoredCount">已忽略 {{ item.ignoredCount }}</span>
          <span class="pill tone-neutral" v-if="item.unreadCount">未读 {{ item.unreadCount }}</span>
          <span class="pill tone-price" v-if="item.bookmarkedCount">收藏 {{ item.bookmarkedCount }}</span>
        </div>
        <div class="meta">
          {{ item.summary }}
        </div>
        <div class="actions inline">
          <RouterLink class="text-action" :to="eventWorkbenchTarget(item.themeId, item.primaryStatus)">
            只看该主题事件
            <span aria-hidden="true">›</span>
          </RouterLink>
          <RouterLink
            class="text-action"
            :to="{ path: `/themes/${item.themeId}`, query: { section: item.openCount > 0 ? 'analysis' : 'timeline' } }"
          >
            查看主题
            <span aria-hidden="true">›</span>
          </RouterLink>
        </div>
      </article>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router";

defineProps<{
  items: Array<{
    themeId: string;
    themeName: string;
    openCount: number;
    trackingCount: number;
    ignoredCount: number;
    unreadCount: number;
    bookmarkedCount: number;
    primaryStatus: string;
    summary: string;
  }>;
  eventWorkbenchTarget: (themeId: string, status: string) => RouteLocationRaw;
}>();
</script>
