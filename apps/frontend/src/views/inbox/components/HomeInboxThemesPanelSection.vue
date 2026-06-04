<template>
  <article class="card">
    <div class="card-topline inbox-card-header">
      <div class="inbox-card-copy">
        <h3>最近更新的主题</h3>
        <p>{{ description }}</p>
      </div>
      <select v-model="sortBy" class="inbox-select">
        <option value="priority">优先级</option>
        <option value="latestEvent">最近事件</option>
        <option value="latestRun">最近运行</option>
      </select>
    </div>
    <div class="inbox-subtoolbar">
      <div class="toolbar-group">
        <button
          v-for="preset in themeQueuePresets"
          :key="preset.id"
          class="button secondary quick-preset-button quick-preset-button--compact"
          :class="{ 'quick-preset-button--active': themeQueueFilter === preset.id }"
          @click="themeQueueFilter = preset.id"
        >
          {{ preset.label }}
        </button>
      </div>
      <RouterLink class="text-action" :to="themeCenterTarget">
        查看主题中心
        <span aria-hidden="true">›</span>
      </RouterLink>
    </div>
    <div class="meta inbox-panel-summary">{{ summary }}</div>
    <div v-if="sortedThemes.length" class="list">
      <RouterLink
        v-for="theme in sortedThemes"
        :key="theme.id"
        class="list-item"
        :to="themeDetailTarget(theme)"
      >
        <strong>{{ theme.name }}</strong>
        <div class="meta">
          {{ themeTypeLabel(theme.type) }} · 状态: {{ themeStatusLabel(theme.status) }} · 来源数: {{ theme.sourceCount }}
        </div>
        <div class="meta-row" v-if="theme.openEventCount || theme.trackingEventCount || theme.unreadEventCount || theme.bookmarkedEventCount">
          <span class="meta" v-if="theme.openEventCount">待处理 {{ theme.openEventCount }}</span>
          <span class="meta" v-if="theme.trackingEventCount">关注中 {{ theme.trackingEventCount }}</span>
          <span class="meta" v-if="theme.unreadEventCount">未读 {{ theme.unreadEventCount }}</span>
          <span class="meta" v-if="theme.bookmarkedEventCount">收藏 {{ theme.bookmarkedEventCount }}</span>
        </div>
        <div class="muted">
          {{ theme.latestInsight ?? theme.latestEventTitle ?? "这个主题当前还没有摘要。" }}
        </div>
      </RouterLink>
    </div>
    <div v-else class="empty-state">
      当前视角下没有匹配的主题。
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { RouteLocationRaw } from "vue-router";

import type { ThemeSummary } from "../../../lib/api";
import { themePriorityScore } from "../../../lib/theme-ranking";
import { toTimestamp } from "../../../lib/time";
import { themeStatusLabel, themeTypeLabel } from "../../../lib/presentation";

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
    return "优先查看当前仍有待处理事件压着的主题。";
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

  return "按最近事件和运行情况快速挑出值得继续跟进的主题。";
});

const summary = computed(() => {
  if (themeQueueFilter.value === "open") {
    return `当前有 ${filteredThemes.value.length} 个主题存在待处理事件。`;
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

  return `共 ${props.themes.length} 个主题，其中 ${openThemeCount.value} 个有待处理事件，${trackingThemeCount.value} 个有关注中事件，${unreadThemeCount.value} 个有未读事件，${bookmarkedThemeCount.value} 个有收藏事件。`;
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

      return themePriorityScore(right) - themePriorityScore(left);
    })
    .slice(0, 6),
);
</script>
