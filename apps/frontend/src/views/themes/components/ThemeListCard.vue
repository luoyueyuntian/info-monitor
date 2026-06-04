<template>
  <article class="card">
    <div class="card-topline">
      <h3>主题列表</h3>
      <span class="text-[0.88rem] text-[#766f63]">共 {{ themes.length }} 个主题</span>
    </div>
    <div v-if="themes.length" class="flex flex-col gap-3">
      <RouterLink
        v-for="theme in themes"
        :key="theme.id"
        class="grid gap-2.5 rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5"
        :to="`/themes/${theme.id}`"
      >
        <div class="mb-3 flex flex-wrap items-center gap-2">
          <span :class="pillToneClass()">{{ themeTypeLabel(theme.type) }}</span>
          <span :class="pillToneClass(theme.sourceHealth)" v-if="theme.sourceHealth">
            {{ sourceHealthLabel(theme.sourceHealth) }}
          </span>
          <span :class="pillToneClass(theme.latestEventSignal)" v-if="theme.latestEventSignal">
            {{ eventSignalLabel(theme.latestEventSignal) }}
          </span>
          <span :class="pillToneClass('neutral')" v-if="theme.openEventCount">
            待处理 {{ theme.openEventCount }}
          </span>
          <span :class="pillToneClass('tracking')" v-if="theme.trackingEventCount">
            关注中 {{ theme.trackingEventCount }}
          </span>
          <span :class="pillToneClass('neutral')" v-if="theme.unreadEventCount">
            未读 {{ theme.unreadEventCount }}
          </span>
          <span :class="pillToneClass('30d_low')" v-if="theme.bookmarkedEventCount">
            收藏 {{ theme.bookmarkedEventCount }}
          </span>
        </div>
        <strong>{{ theme.name }}</strong>
        <div class="flex flex-wrap gap-x-2.5 gap-y-2">
          <span class="text-[0.88rem] text-[#766f63]">状态: {{ themeStatusLabel(theme.status) }}</span>
          <span class="text-[0.88rem] text-[#766f63]">来源数: {{ theme.sourceCount }}</span>
          <span class="text-[0.88rem] text-[#766f63]">最近运行: {{ formatDateTimeLabel(theme.latestRunAt) }}</span>
          <span class="text-[0.88rem] text-[#766f63]">最近事件: {{ formatDateTimeLabel(theme.latestEventAt) }}</span>
        </div>
        <div class="text-[#6f665a]">
          {{ theme.latestInsight ?? theme.latestEventTitle ?? "这个主题当前还没有摘要。" }}
        </div>
      </RouterLink>
    </div>
    <div v-else class="rounded-2xl bg-slate-100/90 p-4 text-[#6f665a]">
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
