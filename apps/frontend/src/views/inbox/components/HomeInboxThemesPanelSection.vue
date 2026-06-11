<template>
  <article class="rounded-[18px] border border-slate-400/15 bg-white/78 p-[18px] shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
    <div class="mb-3 flex flex-wrap items-start justify-between gap-4">
      <div class="grid min-w-0 gap-1">
        <h3 class="m-0 text-[1.02rem] font-semibold text-[#2f2618]">最近更新的主题</h3>
        <p class="m-0 text-[0.9rem] leading-[1.45] text-[#756a5b]">{{ description }}</p>
      </div>
      <select v-model="sortBy" class="min-w-32 rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5">
        <option value="priority">优先级</option>
        <option value="latestEvent">最近事件</option>
        <option value="latestRun">最近运行</option>
        <option value="latestBookmarked">最近收藏</option>
      </select>
    </div>
    <div class="mb-2.5 flex flex-wrap items-center justify-between gap-x-3.5 gap-y-2.5">
      <div class="flex flex-wrap items-center gap-2.5">
        <button
          v-for="preset in themeQueuePresets"
          :key="preset.id"
          class="inline-flex items-center justify-center rounded-xl border border-[rgba(120,120,120,0.22)] bg-white px-3 py-2 text-[0.88rem] text-[#1d1d1d] transition-colors hover:bg-slate-50"
          :class="themeQueueFilter === preset.id ? 'border-[#2f2618] bg-[#2f2618] text-[#fff7e7] hover:bg-[#2f2618]' : ''"
          @click="themeQueueFilter = preset.id"
        >
          {{ preset.label }}
        </button>
      </div>
      <RouterLink class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-[#6b4f1f]" :to="themeCenterTarget">
        查看主题中心
        <span aria-hidden="true" class="text-base leading-none">›</span>
      </RouterLink>
    </div>
    <div class="mb-3 text-[0.88rem] text-[#766f63]">{{ summary }}</div>
    <div v-if="sortedThemes.length" class="flex flex-col gap-3">
      <article
        v-for="theme in sortedThemes"
        :key="theme.id"
        class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5"
      >
        <RouterLink
          class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.98rem] font-semibold text-[#6b4f1f]"
          :to="themeDetailTarget(theme)"
        >
          {{ theme.name }}
          <span aria-hidden="true" class="text-base leading-none">›</span>
        </RouterLink>
        <div class="text-[0.88rem] text-[#766f63]">
          {{ themeTypeLabel(theme.type) }} · 状态: {{ themeStatusLabel(theme.status) }} · 来源数: {{ theme.sourceCount }}
        </div>
        <div class="flex flex-wrap gap-x-2.5 gap-y-2" v-if="theme.latestEventSignal">
          <span :class="pillToneClass(themeImpactTone(theme))">{{ impactToneLabel(themeImpactTone(theme)) }}</span>
          <span :class="pillToneClass(theme.latestEventSignal)">{{ eventSignalLabel(theme.latestEventSignal) }}</span>
        </div>
        <div class="flex flex-wrap gap-x-2.5 gap-y-2" v-if="theme.openEventCount || theme.trackingEventCount || theme.unreadEventCount || theme.bookmarkedEventCount">
          <span class="text-[0.88rem] text-[#766f63]" v-if="theme.openEventCount">待处理 {{ theme.openEventCount }}</span>
          <span class="text-[0.88rem] text-[#766f63]" v-if="theme.trackingEventCount">关注中 {{ theme.trackingEventCount }}</span>
          <span class="text-[0.88rem] text-[#766f63]" v-if="theme.unreadEventCount">未读 {{ theme.unreadEventCount }}</span>
          <span class="text-[0.88rem] text-[#766f63]" v-if="theme.bookmarkedEventCount">收藏 {{ theme.bookmarkedEventCount }}</span>
        </div>
        <div class="text-[#6f665a]">
          {{ theme.latestInsight ?? theme.latestEventTitle ?? "这个主题当前还没有摘要。" }}
        </div>
        <div class="text-[0.88rem] text-[#766f63]">
          {{ buildThemeSummaryInsight(theme).headline }}：{{ buildThemeSummaryInsight(theme).summary }}
        </div>
        <div class="text-[0.88rem] text-[#766f63]" v-if="theme.latestBookmarkedAt">
          最近收藏于 {{ formatSmartDateTimeLabel(theme.latestBookmarkedAt) }}
        </div>
        <div class="mt-2 flex flex-wrap gap-3">
          <RouterLink
            class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-[#6b4f1f]"
            :to="themeDetailTarget(theme)"
          >
            查看主题
            <span aria-hidden="true" class="text-base leading-none">›</span>
          </RouterLink>
          <RouterLink
            class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-[#6b4f1f]"
            :to="{ path: '/events', query: { themeId: theme.id, impact: themeImpactTone(theme) !== 'neutral' ? themeImpactTone(theme) : undefined, status: (theme.openEventCount ?? 0) > 0 ? 'open' : undefined, sort: (theme.openEventCount ?? 0) > 0 ? 'statusChanged' : 'occurredAt' } }"
          >
            查看相关事件
            <span aria-hidden="true" class="text-base leading-none">›</span>
          </RouterLink>
          <RouterLink
            class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-[#6b4f1f]"
            :to="{ path: '/sources/status', query: { themeId: theme.id, focus: theme.sourceHealth === 'warning' ? 'warning' : undefined } }"
          >
            查看来源状态
            <span aria-hidden="true" class="text-base leading-none">›</span>
          </RouterLink>
        </div>
      </article>
    </div>
    <div v-else class="rounded-2xl bg-slate-100/90 p-4 text-[#6f665a]">
      当前视角下没有匹配的主题。
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { RouteLocationRaw } from "vue-router";

import type { ThemeSummary } from "../../../lib/api";
import { impactToneLabel, themeImpactTone } from "../../../lib/impact";
import { themeLatestBookmarkedScore, themePriorityScore } from "../../../lib/theme-ranking";
import { buildThemeSummaryInsight } from "../../../lib/theme-summary-insight";
import { toTimestamp } from "../../../lib/time";
import { eventSignalLabel, formatSmartDateTimeLabel, pillToneClass, themeStatusLabel, themeTypeLabel } from "../../../lib/presentation";

const props = defineProps<{
  themes: ThemeSummary[];
  themeDetailTarget: (theme: ThemeSummary) => RouteLocationRaw;
}>();

const sortBy = ref("priority");
const themeQueueFilter = ref<"all" | "open" | "tracking" | "unread" | "bookmarked">("all");
const themeQueuePresets = [
  { id: "all", label: "全部主题" },
  { id: "open", label: "待处理主题" },
  { id: "tracking", label: "关注中主题" },
  { id: "unread", label: "未读主题" },
  { id: "bookmarked", label: "收藏主题" },
] as const;

const openThemeCount = computed(() => props.themes.filter((theme) => (theme.openEventCount ?? 0) > 0).length);
const trackingThemeCount = computed(() =>
  props.themes.filter((theme) => (theme.trackingEventCount ?? 0) > 0).length,
);
const unreadThemeCount = computed(() => props.themes.filter((theme) => (theme.unreadEventCount ?? 0) > 0).length);
const bookmarkedThemeCount = computed(() =>
  props.themes.filter((theme) => (theme.bookmarkedEventCount ?? 0) > 0).length,
);
const negativeThemeCount = computed(() =>
  props.themes.filter((theme) => themeImpactTone(theme) === "negative").length,
);
const positiveThemeCount = computed(() =>
  props.themes.filter((theme) => themeImpactTone(theme) === "positive").length,
);

const filteredThemes = computed(() =>
  props.themes.filter((theme) => {
    if (themeQueueFilter.value === "open") {
      return (theme.openEventCount ?? 0) > 0;
    }

    if (themeQueueFilter.value === "tracking") {
      return (theme.trackingEventCount ?? 0) > 0;
    }

    if (themeQueueFilter.value === "unread") {
      return (theme.unreadEventCount ?? 0) > 0;
    }

    if (themeQueueFilter.value === "bookmarked") {
      return (theme.bookmarkedEventCount ?? 0) > 0;
    }

    return true;
  }),
);

const description = computed(() => {
  if (themeQueueFilter.value === "open") {
    return "优先查看当前仍有待处理事件压着的主题，尤其是偏利空判断的主题。";
  }

  if (themeQueueFilter.value === "tracking") {
    return "优先回看已经进入持续跟进阶段的主题。";
  }

  if (themeQueueFilter.value === "unread") {
    return "优先查看仍有未读事件、还没完成快速巡检的主题。";
  }

  if (themeQueueFilter.value === "bookmarked") {
    return "优先回看已经被收藏、值得长期跟踪的重点主题。";
  }

  return "按最近事件、运行情况和主题信号判断快速挑出值得继续跟进的主题。";
});

const summary = computed(() => {
  if (themeQueueFilter.value === "open") {
    return `当前有 ${filteredThemes.value.length} 个主题存在待处理事件，其中偏利空主题更值得优先处理。`;
  }

  if (themeQueueFilter.value === "tracking") {
    return `当前有 ${filteredThemes.value.length} 个主题处于关注中跟进状态。`;
  }

  if (themeQueueFilter.value === "unread") {
    return `当前有 ${filteredThemes.value.length} 个主题仍有未读事件。`;
  }

  if (themeQueueFilter.value === "bookmarked") {
    return `当前有 ${filteredThemes.value.length} 个主题包含收藏事件。`;
  }

  return `共 ${props.themes.length} 个主题，其中 ${openThemeCount.value} 个有待处理事件，${trackingThemeCount.value} 个有关注中事件，${unreadThemeCount.value} 个有未读事件，${bookmarkedThemeCount.value} 个有收藏事件；判断上有 ${negativeThemeCount.value} 个偏利空主题、${positiveThemeCount.value} 个偏利好主题。`;
});

const themeCenterTarget = computed(() => ({
  path: "/themes",
  query:
    themeQueueFilter.value === "all"
      ? { sort: "attention" }
      : { queue: themeQueueFilter.value, sort: "attention" },
}));

const sortedThemes = computed(() =>
  [...filteredThemes.value]
    .sort((left, right) => {
      if (sortBy.value === "latestEvent") {
        return toTimestamp(right.latestEventAt) - toTimestamp(left.latestEventAt);
      }

      if (sortBy.value === "latestRun") {
        return toTimestamp(right.latestRunAt) - toTimestamp(left.latestRunAt);
      }

      if (sortBy.value === "latestBookmarked") {
        return themeLatestBookmarkedScore(right) - themeLatestBookmarkedScore(left);
      }

      return themePriorityScore(right) - themePriorityScore(left);
    })
    .slice(0, 6),
);
</script>
