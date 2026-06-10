<template>
  <article class="card">
    <div class="card-topline">
      <h3>按主题聚合</h3>
      <span class="text-[0.88rem] text-[#766f63]">先看哪个主题压了更多待处理或关注中的事件</span>
    </div>
    <div class="grid gap-3 md:grid-cols-2">
      <article
        v-for="item in items"
        :key="item.themeId"
        class="grid gap-2.5 rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5"
      >
        <strong>{{ item.themeName }}</strong>
        <div class="flex flex-wrap gap-x-2.5 gap-y-2">
          <span :class="pillToneClass('neutral')" v-if="item.openCount">待处理 {{ item.openCount }}</span>
          <span :class="pillToneClass('tracking')" v-if="item.trackingCount">关注中 {{ item.trackingCount }}</span>
          <span :class="pillToneClass('ignored')" v-if="item.ignoredCount">已忽略 {{ item.ignoredCount }}</span>
          <span :class="pillToneClass('neutral')" v-if="item.unreadCount">未读 {{ item.unreadCount }}</span>
          <span :class="pillToneClass('30d_low')" v-if="item.bookmarkedCount">收藏 {{ item.bookmarkedCount }}</span>
        </div>
        <div class="text-[0.88rem] text-[#766f63]">
          {{ item.summary }}
        </div>
        <div class="mt-3 flex flex-wrap gap-3">
          <RouterLink class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-[#6b4f1f]" :to="eventWorkbenchTarget(item.themeId, item.primaryStatus)">
            只看该主题事件
            <span aria-hidden="true" class="text-base leading-none">›</span>
          </RouterLink>
          <RouterLink
            class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-[#6b4f1f]"
            :to="{ path: `/themes/${item.themeId}`, query: { section: item.openCount > 0 ? 'analysis' : 'timeline' } }"
          >
            查看主题
            <span aria-hidden="true" class="text-base leading-none">›</span>
          </RouterLink>
          <RouterLink
            class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-[#6b4f1f]"
            :to="{ path: '/sources/status', query: { themeId: item.themeId, focus: item.openCount > 0 ? 'warning' : undefined } }"
          >
            查看来源状态
            <span aria-hidden="true" class="text-base leading-none">›</span>
          </RouterLink>
          <RouterLink
            class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-[#6b4f1f]"
            :to="{ path: '/watchlist', query: { type: undefined, completion: item.bookmarkedCount > 0 ? 'all' : undefined } }"
          >
            查看长期观察
            <span aria-hidden="true" class="text-base leading-none">›</span>
          </RouterLink>
        </div>
      </article>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router";

import { pillToneClass } from "../../../lib/presentation";

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
