<template>
  <article class="card" v-if="themes.length">
    <div class="card-topline">
      <h3>长期观察</h3>
      <span class="text-[0.88rem] text-ink-secondary">优先回看已经沉淀了收藏事件的主题</span>
      <RouterLink
        class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-ink-link"
        :to="{ path: '/watchlist' }"
      >
        打开观察清单
        <span aria-hidden="true" class="text-base leading-none">›</span>
      </RouterLink>
    </div>
    <div v-if="recentThemes.length" class="mb-4">
      <div class="mb-3 text-[0.88rem] font-semibold text-[#625847]">最近新加入观察</div>
      <div class="grid gap-3 md:grid-cols-2">
        <article
          v-for="theme in recentThemes"
          :key="`recent-${theme.id}`"
          class="grid gap-2.5 rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5"
        >
          <strong>{{ theme.name }}</strong>
          <div class="flex flex-wrap gap-x-2.5 gap-y-2">
            <span :class="pillToneClass(themeImpactTone(theme))">{{ impactToneLabel(themeImpactTone(theme)) }}</span>
            <span :class="pillToneClass('30d_low')">收藏 {{ theme.bookmarkedEventCount }}</span>
            <span :class="pillToneClass('neutral')" v-if="theme.unreadEventCount">未读 {{ theme.unreadEventCount }}</span>
            <span :class="pillToneClass(theme.sourceHealth)" v-if="theme.sourceHealth">
              {{ sourceHealthLabel(theme.sourceHealth) }}
            </span>
          </div>
          <div class="text-[0.88rem] text-ink-secondary">
            {{ theme.latestInsight ?? theme.latestEventTitle ?? "这个主题当前还没有摘要。" }}
          </div>
          <div class="text-[0.88rem] text-ink-secondary">
            {{ buildThemeSummaryInsight(theme).headline }}：{{ buildThemeSummaryInsight(theme).summary }}
          </div>
          <div class="text-[0.88rem] text-ink-secondary">
            {{
              theme.latestBookmarkedAt
                ? `最近收藏于 ${formatSmartDateTimeLabel(theme.latestBookmarkedAt)}。`
                : theme.unreadEventCount
                  ? `当前仍有 ${theme.unreadEventCount} 条未读事件。`
                  : "当前收藏事件已基本完成首轮巡检。"
            }}
          </div>
          <div class="mt-2 flex flex-wrap gap-3">
            <RouterLink
              class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-ink-link"
              :to="{ path: `/themes/${theme.id}`, query: { section: 'events' } }"
            >
              查看主题事件
              <span aria-hidden="true" class="text-base leading-none">›</span>
            </RouterLink>
            <RouterLink
              class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-ink-link"
              :to="{ path: '/events', query: { themeId: theme.id, bookmark: 'bookmarked', sort: 'bookmarkedAt' } }"
            >
              只看收藏事件
              <span aria-hidden="true" class="text-base leading-none">›</span>
            </RouterLink>
            <RouterLink
              class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-ink-link"
              :to="{ path: `/themes/${theme.id}`, query: { section: 'timeline' } }"
            >
              查看时间线
              <span aria-hidden="true" class="text-base leading-none">›</span>
            </RouterLink>
            <RouterLink
              class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-ink-link"
              :to="{ path: '/sources/status', query: { themeId: theme.id, focus: theme.sourceHealth === 'warning' ? 'warning' : undefined } }"
            >
              查看来源状态
              <span aria-hidden="true" class="text-base leading-none">›</span>
            </RouterLink>
          </div>
        </article>
      </div>
    </div>
    <div v-if="steadyThemes.length">
      <div class="mb-3 text-[0.88rem] font-semibold text-[#625847]">持续跟踪中</div>
      <div class="grid gap-3 md:grid-cols-2">
        <article
          v-for="theme in steadyThemes"
          :key="`steady-${theme.id}`"
          class="grid gap-2.5 rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5"
        >
          <strong>{{ theme.name }}</strong>
          <div class="flex flex-wrap gap-x-2.5 gap-y-2">
            <span :class="pillToneClass(themeImpactTone(theme))">{{ impactToneLabel(themeImpactTone(theme)) }}</span>
            <span :class="pillToneClass('30d_low')">收藏 {{ theme.bookmarkedEventCount }}</span>
            <span :class="pillToneClass('neutral')" v-if="theme.unreadEventCount">未读 {{ theme.unreadEventCount }}</span>
            <span :class="pillToneClass(theme.sourceHealth)" v-if="theme.sourceHealth">
              {{ sourceHealthLabel(theme.sourceHealth) }}
            </span>
          </div>
          <div class="text-[0.88rem] text-ink-secondary">
            {{ theme.latestInsight ?? theme.latestEventTitle ?? "这个主题当前还没有摘要。" }}
          </div>
          <div class="text-[0.88rem] text-ink-secondary">
            {{ buildThemeSummaryInsight(theme).headline }}：{{ buildThemeSummaryInsight(theme).summary }}
          </div>
          <div class="text-[0.88rem] text-ink-secondary">
            {{
              theme.latestBookmarkedAt
                ? `最近收藏于 ${formatSmartDateTimeLabel(theme.latestBookmarkedAt)}。`
                : theme.unreadEventCount
                  ? `当前仍有 ${theme.unreadEventCount} 条未读事件。`
                  : "当前收藏事件已基本完成首轮巡检。"
            }}
          </div>
          <div class="mt-2 flex flex-wrap gap-3">
            <RouterLink
              class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-ink-link"
              :to="{ path: `/themes/${theme.id}`, query: { section: 'events' } }"
            >
              查看主题事件
              <span aria-hidden="true" class="text-base leading-none">›</span>
            </RouterLink>
            <RouterLink
              class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-ink-link"
              :to="{ path: '/events', query: { themeId: theme.id, bookmark: 'bookmarked', sort: 'bookmarkedAt' } }"
            >
              只看收藏事件
              <span aria-hidden="true" class="text-base leading-none">›</span>
            </RouterLink>
            <RouterLink
              class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-ink-link"
              :to="{ path: `/themes/${theme.id}`, query: { section: 'timeline' } }"
            >
              查看时间线
              <span aria-hidden="true" class="text-base leading-none">›</span>
            </RouterLink>
            <RouterLink
              class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-ink-link"
              :to="{ path: '/sources/status', query: { themeId: theme.id, focus: theme.sourceHealth === 'warning' ? 'warning' : undefined } }"
            >
              查看来源状态
              <span aria-hidden="true" class="text-base leading-none">›</span>
            </RouterLink>
          </div>
        </article>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from "vue";

import type { ThemeSummary } from "../../../lib/api";
import { impactToneLabel, themeImpactTone } from "../../../lib/impact";
import { formatSmartDateTimeLabel, pillToneClass, sourceHealthLabel } from "../../../lib/presentation";
import { buildThemeSummaryInsight } from "../../../lib/theme-summary-insight";
import { toTimestamp } from "../../../lib/time";

const props = defineProps<{
  themes: ThemeSummary[];
}>();

const recentThemes = computed(() => {
  const threshold = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return props.themes.filter((theme) => toTimestamp(theme.latestBookmarkedAt) >= threshold);
});

const steadyThemes = computed(() => {
  const threshold = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return props.themes.filter((theme) => toTimestamp(theme.latestBookmarkedAt) > 0 && toTimestamp(theme.latestBookmarkedAt) < threshold);
});
</script>
