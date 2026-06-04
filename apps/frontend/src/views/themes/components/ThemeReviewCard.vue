<template>
  <article class="card" v-if="themes.length">
    <div class="card-topline">
      <h3>长期观察</h3>
      <span class="text-[0.88rem] text-[#766f63]">优先回看已经沉淀了收藏事件的主题</span>
    </div>
    <div class="grid gap-3 md:grid-cols-2">
      <RouterLink
        v-for="theme in themes"
        :key="theme.id"
        class="grid gap-2.5 rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5"
        :to="`/themes/${theme.id}?section=events`"
      >
        <strong>{{ theme.name }}</strong>
        <div class="flex flex-wrap gap-x-2.5 gap-y-2">
          <span :class="pillToneClass('30d_low')">收藏 {{ theme.bookmarkedEventCount }}</span>
          <span :class="pillToneClass('neutral')" v-if="theme.unreadEventCount">未读 {{ theme.unreadEventCount }}</span>
          <span :class="pillToneClass(theme.sourceHealth)" v-if="theme.sourceHealth">
            {{ sourceHealthLabel(theme.sourceHealth) }}
          </span>
        </div>
        <div class="text-[0.88rem] text-[#766f63]">
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
