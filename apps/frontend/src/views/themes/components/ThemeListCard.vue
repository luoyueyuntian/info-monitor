<template>
  <article class="card">
    <div class="card-topline">
      <h3>主题列表</h3>
      <span class="text-[0.88rem] text-ink-secondary">共 {{ themes.length }} 个主题</span>
    </div>
    <div v-if="themes.length" class="flex flex-col gap-3">
      <article
        v-for="theme in themes"
        :key="theme.id"
        class="grid gap-2.5 rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5"
      >
        <label class="mb-3 flex items-center gap-2.5 text-[0.88rem] text-ink-secondary">
          <input
            :checked="selectedThemeIds.includes(theme.id)"
            type="checkbox"
            @change="toggleThemeSelection(theme.id)"
          />
          选中主题
        </label>
        <div class="mb-3 flex flex-wrap items-center gap-2">
          <span :class="pillToneClass()">{{ themeTypeLabel(theme.type) }}</span>
          <span :class="pillToneClass(theme.sourceHealth)" v-if="theme.sourceHealth">
            {{ sourceHealthLabel(theme.sourceHealth) }}
          </span>
          <span :class="pillToneClass(themeImpactTone(theme))" v-if="theme.latestEventSignal">
            {{ impactToneLabel(themeImpactTone(theme)) }}
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
        <div class="flex items-center gap-2">
          <RouterLink
            class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.98rem] font-semibold text-ink-link"
            :to="themeDetailTarget(theme)"
          >
            {{ theme.name }}
            <span aria-hidden="true" class="text-base leading-none">›</span>
          </RouterLink>
          <button
            class="text-lg transition-colors"
            :class="isFavorited(theme.id) ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400'"
            :title="isFavorited(theme.id) ? '取消收藏' : '收藏主题'"
            @click="toggleFavorite(theme.id)"
          >
            {{ isFavorited(theme.id) ? "★" : "☆" }}
          </button>
        </div>
        <div class="flex flex-wrap gap-x-2.5 gap-y-2">
          <span class="text-[0.88rem] text-ink-secondary">状态: {{ themeStatusLabel(theme.status) }}</span>
          <span class="text-[0.88rem] text-ink-secondary">来源数: {{ theme.sourceCount }}</span>
          <span class="text-[0.88rem] text-ink-secondary">最近运行: {{ formatDateTimeLabel(theme.latestRunAt) }}</span>
          <span class="text-[0.88rem] text-ink-secondary">最近事件: {{ formatDateTimeLabel(theme.latestEventAt) }}</span>
        </div>
        <div class="text-ink-body">
          {{ theme.latestInsight ?? theme.latestEventTitle ?? "这个主题当前还没有摘要。" }}
        </div>
        <div class="text-[0.88rem] text-ink-secondary">
          {{ buildThemeSummaryInsight(theme).headline }}：{{ buildThemeSummaryInsight(theme).summary }}
        </div>
        <div class="mt-2 flex flex-wrap gap-3">
          <RouterLink
            class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-400/15 bg-white/70 px-4 py-2.5 font-semibold text-slate-700 transition-colors hover:bg-white/90"
            :to="themeDetailTarget(theme)"
          >
            查看主题
          </RouterLink>
          <RouterLink
            class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-400/15 bg-white/70 px-4 py-2.5 font-semibold text-slate-700 transition-colors hover:bg-white/90"
            :to="{ path: '/events', query: { themeId: theme.id, status: (theme.openEventCount ?? 0) > 0 ? 'open' : undefined, impact: themeImpactTone(theme) !== 'neutral' ? themeImpactTone(theme) : undefined, sort: (theme.openEventCount ?? 0) > 0 ? 'statusChanged' : 'occurredAt' } }"
          >
            查看相关事件
          </RouterLink>
          <RouterLink
            class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-400/15 bg-white/70 px-4 py-2.5 font-semibold text-slate-700 transition-colors hover:bg-white/90"
            :to="{ path: '/sources/status', query: { themeId: theme.id, focus: theme.sourceHealth === 'warning' ? 'warning' : undefined } }"
          >
            查看来源状态
          </RouterLink>
          <RouterLink
            class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-400/15 bg-white/70 px-4 py-2.5 font-semibold text-slate-700 transition-colors hover:bg-white/90"
            :to="{ path: `/themes/${theme.id}`, query: { section: theme.type === 'price' ? 'trend' : 'timeline' } }"
          >
            {{ theme.type === "price" ? "查看趋势" : "查看时间线" }}
          </RouterLink>
        </div>
      </article>
    </div>
    <div v-else class="rounded-2xl bg-slate-100/90 p-4 text-ink-body">
      当前筛选条件下没有匹配的主题。
    </div>
  </article>
</template>

<script setup lang="ts">
import { onMounted, reactive } from "vue";
import type { ThemeSummary } from "../../../lib/api";
import { fetchThemeFavorites, setThemeFavorite } from "../../../lib/api";
import { impactToneLabel, themeImpactTone } from "../../../lib/impact";
import {
  eventSignalLabel,
  formatDateTimeLabel,
  pillToneClass,
  sourceHealthLabel,
  themeStatusLabel,
  themeTypeLabel,
} from "../../../lib/presentation";
import { buildThemeSummaryInsight } from "../../../lib/theme-summary-insight";

defineProps<{
  themes: ThemeSummary[];
  selectedThemeIds: string[];
  toggleThemeSelection: (themeId: string) => void;
}>();

const emit = defineEmits<{
  favoriteChanged: [];
}>();

const favoriteIds = reactive(new Set<string>());

// Load favorites from DB on mount
onMounted(async () => {
  try {
    const favs = await fetchThemeFavorites();
    for (const id of favs) favoriteIds.add(id);
  } catch {
    // fallback handled inside fetchThemeFavorites
  }
});

function isFavorited(themeId: string): boolean {
  return favoriteIds.has(themeId);
}

async function toggleFavorite(themeId: string) {
  const currentlyFavorited = favoriteIds.has(themeId);
  await setThemeFavorite(themeId, !currentlyFavorited);
  if (currentlyFavorited) {
    favoriteIds.delete(themeId);
  } else {
    favoriteIds.add(themeId);
  }
  emit("favoriteChanged");
}

function themeDetailTarget(theme: ThemeSummary) {
  if ((theme.openEventCount ?? 0) > 0 || (theme.unreadEventCount ?? 0) > 0) {
    return { path: `/themes/${theme.id}`, query: { section: "events" } };
  }

  if (theme.sourceHealth === "warning") {
    return { path: `/themes/${theme.id}`, query: { section: "sources" } };
  }

  if (theme.type === "price") {
    return { path: `/themes/${theme.id}`, query: { section: "trend" } };
  }

  return { path: `/themes/${theme.id}`, query: { section: "analysis" } };
}
</script>
