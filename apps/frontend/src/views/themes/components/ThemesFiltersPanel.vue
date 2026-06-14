<template>
  <FilterBar
    :presets="presets"
    :active-preset-id="activePresetId"
    :filter-summary="filterSummary"
    view-type="themes"
    :current-filters="currentFilters"
    @apply-preset="applyThemePreset"
    @reset-filters="resetFilters"
    @load-view="emit('loadView', $event)"
  >
    <input class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5" :value="query" placeholder="搜索主题..." @input="setQuery(($event.target as HTMLInputElement).value)" />
    <select class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5" :value="typeFilter" @change="setTypeFilter(($event.target as HTMLSelectElement).value)">
      <option value="all">全部类型</option>
      <option value="price">价格</option>
      <option value="content_update">内容更新</option>
      <option value="news_announcement">公告</option>
      <option value="financial_event">金融事件</option>
    </select>
    <select class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5" :value="statusFilter" @change="setStatusFilter(($event.target as HTMLSelectElement).value)">
      <option value="all">全部主题状态</option>
      <option value="active">活跃</option>
      <option value="paused">暂停</option>
      <option value="archived">归档</option>
    </select>
    <select class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5" :value="eventQueueFilter" @change="setEventQueueFilter(($event.target as HTMLSelectElement).value)">
      <option value="all">全部处理状态</option>
      <option value="open">有待处理事件</option>
      <option value="tracking">有关注中事件</option>
      <option value="ignored">仅已忽略事件</option>
      <option value="unread">有未读事件</option>
      <option value="bookmarked">有收藏事件</option>
    </select>
    <select class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5" :value="healthFilter" @change="setHealthFilter(($event.target as HTMLSelectElement).value)">
      <option value="all">全部健康状态</option>
      <option value="healthy">正常</option>
      <option value="warning">异常</option>
    </select>
    <select class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5" :value="impactFilter" @change="setImpactFilter(($event.target as HTMLSelectElement).value)">
      <option value="all">全部影响</option>
      <option value="positive">偏利好</option>
      <option value="negative">偏利空</option>
      <option value="neutral">中性</option>
    </select>
    <label class="flex items-center gap-2.5 font-semibold">
      <input :checked="recentOnly24h" type="checkbox" @change="setRecentOnly24h(($event.target as HTMLInputElement).checked)" />
      仅最近24小时更新
    </label>
    <label class="flex items-center gap-2.5 font-semibold">
      <input :checked="favoritesOnly" type="checkbox" @change="setFavoritesOnly(($event.target as HTMLInputElement).checked)" />
      仅收藏主题
    </label>
    <select class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5" :value="sortBy" @change="setSortBy(($event.target as HTMLSelectElement).value)">
      <option value="attention">优先处理</option>
      <option value="priority">优先级</option>
      <option value="latestEvent">最近事件</option>
      <option value="latestRun">最近运行</option>
      <option value="latestBookmarked">最近收藏</option>
      <option value="name">名称</option>
    </select>
    <button v-if="query" class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover" @click="clearQuery">清空搜索</button>
  </FilterBar>
</template>

<script setup lang="ts">
import { computed } from "vue";
import FilterBar from "../../../components/FilterBar.vue";

const props = defineProps<{
  presets: readonly { id: string; label: string }[];
  activePresetId: string;
  filterSummary: string;
  query: string;
  typeFilter: string;
  statusFilter: string;
  eventQueueFilter: string;
  healthFilter: string;
  impactFilter: string;
  recentOnly24h: boolean;
  favoritesOnly: boolean;
  sortBy: string;
  applyThemePreset: (presetId: string) => void;
  resetFilters: () => void;
  setQuery: (value: string) => void;
  setTypeFilter: (value: string) => void;
  setStatusFilter: (value: string) => void;
  setEventQueueFilter: (value: string) => void;
  setHealthFilter: (value: string) => void;
  setImpactFilter: (value: string) => void;
  setRecentOnly24h: (value: boolean) => void;
  setFavoritesOnly: (value: boolean) => void;
  setSortBy: (value: string) => void;
  clearQuery: () => void;
}>();

const emit = defineEmits<{
  loadView: [filters: Record<string, string>];
}>();

const currentFilters = computed(() => ({
  query: props.query,
  type: props.typeFilter,
  status: props.statusFilter,
  queue: props.eventQueueFilter,
  health: props.healthFilter,
  impact: props.impactFilter,
  sort: props.sortBy,
  recent: props.recentOnly24h ? "24h" : "",
  fav: props.favoritesOnly ? "1" : "",
}));
</script>
