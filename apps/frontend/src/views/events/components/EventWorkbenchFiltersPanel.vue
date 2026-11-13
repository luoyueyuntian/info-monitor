<template>
  <FilterBar
    :presets="presets"
    :active-preset-id="activePresetId"
    :filter-summary="filterSummary"
    view-type="events"
    :current-filters="currentFilters"
    @apply-preset="applyPreset"
    @reset-filters="resetFilters"
    @load-view="emit('loadView', $event)"
  >
    <input class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5" :value="query" placeholder="搜索事件标题或主题..." @input="setQuery(($event.target as HTMLInputElement).value)" />
    <select class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5" :value="themeFilter" @change="setThemeFilter(($event.target as HTMLSelectElement).value)">
      <option value="all">全部主题</option>
      <option v-if="themeContextLabel" :value="themeFilter">{{ themeContextLabel }}</option>
      <option v-for="option in themeOptions" :key="option.id" :value="option.id">
        {{ option.name }}
      </option>
    </select>
    <select class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5" :value="statusFilter" @change="setStatusFilter(($event.target as HTMLSelectElement).value)">
      <option value="all">全部状态</option>
      <option value="open">待处理</option>
      <option value="tracking">关注中</option>
      <option value="ignored">已忽略</option>
    </select>
    <select class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5" :value="typeFilter" @change="setTypeFilter(($event.target as HTMLSelectElement).value)">
      <option value="all">全部类型</option>
      <option value="price">价格</option>
      <option value="content_update">内容更新</option>
      <option value="news_announcement">公告</option>
      <option value="financial_event">金融事件</option>
    </select>
    <select class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5" :value="impactFilter" @change="setImpactFilter(($event.target as HTMLSelectElement).value)">
      <option value="all">全部影响</option>
      <option value="positive">偏利好</option>
      <option value="negative">偏利空</option>
      <option value="neutral">中性</option>
    </select>
    <select class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5" :value="readFilter" @change="setReadFilter(($event.target as HTMLSelectElement).value)">
      <option value="all">全部阅读状态</option>
      <option value="unread">未读</option>
      <option value="read">已读</option>
    </select>
    <select class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5" :value="bookmarkFilter" @change="setBookmarkFilter(($event.target as HTMLSelectElement).value)">
      <option value="all">全部收藏状态</option>
      <option value="bookmarked">仅收藏</option>
    </select>
    <select class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5" :value="sortBy" @change="setSortBy(($event.target as HTMLSelectElement).value)">
      <option value="occurredAt">按事件时间</option>
      <option value="statusChanged">按最近状态变化</option>
      <option value="bookmarkedAt">按最近收藏</option>
    </select>
    <label class="flex items-center gap-2.5 font-semibold">
      <input :checked="recentOnly24h" type="checkbox" @change="setRecentOnly24h(($event.target as HTMLInputElement).checked)" />
      仅最近24小时
    </label>

    <template #banner>
      <section v-if="sinceFilter" class="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-400/15 bg-slate-50/80 p-4 shadow-[0_10px_26px_rgba(15,23,42,0.04)]">
        <div class="flex flex-wrap items-center gap-2.5">
          <strong>增量视图</strong>
          <span class="text-[0.88rem] text-ink-secondary">
            当前只看 {{ formatSmartDateTimeLabel(sinceFilter) }} 之后新增或发生状态变化的事件，共 {{ incrementalEventCount }} 条。
          </span>
        </div>
        <button class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover" @click="clearSinceFilter">退出增量视图</button>
      </section>
    </template>
  </FilterBar>

  <!-- Bulk Actions (separate section, not part of FilterBar) -->
  <section class="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-400/15 bg-slate-50/80 p-4 shadow-[0_10px_26px_rgba(15,23,42,0.04)]">
    <div class="flex flex-wrap items-center gap-2.5">
      <label class="flex items-center gap-2.5 font-semibold">
        <input
          :checked="allVisibleSelected"
          type="checkbox"
          @change="toggleSelectAllVisible"
        />
        选中当前页事件
      </label>
      <span class="text-[0.88rem] text-ink-secondary">已选 {{ selectedCount }} 条事件</span>
    </div>
    <div class="flex flex-wrap gap-3">
      <button
        class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="!selectedCount || bulkUpdating"
        @click="handleBulkUpdateStatus('open')"
      >
        {{ bulkUpdating && pendingBulkStatus === 'open' ? "正在更新..." : "批量标记待处理" }}
      </button>
      <button
        class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="!selectedCount || bulkUpdating"
        @click="handleBulkUpdateStatus('tracking')"
      >
        {{ bulkUpdating && pendingBulkStatus === 'tracking' ? "正在更新..." : "批量标记关注中" }}
      </button>
      <button
        class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="!selectedCount || bulkUpdating"
        @click="handleBulkUpdateStatus('ignored')"
      >
        {{ bulkUpdating && pendingBulkStatus === 'ignored' ? "正在更新..." : "批量标记已忽略" }}
      </button>
      <button
        class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="!selectedCount || bulkUpdating"
        @click="handleBulkUpdateMeta({ isRead: true }, 'read')"
      >
        {{ bulkUpdating && pendingBulkStatus === 'read' ? "正在更新..." : "批量标记已读" }}
      </button>
      <button
        class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="!selectedCount || bulkUpdating"
        @click="handleBulkUpdateMeta({ isBookmarked: true }, 'bookmark')"
      >
        {{ bulkUpdating && pendingBulkStatus === 'bookmark' ? "正在更新..." : "批量加入收藏" }}
      </button>
      <button
        class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="!selectedCount || bulkUpdating"
        @click="handleBulkUpdateMeta({ isBookmarked: false }, 'unbookmark')"
      >
        {{ bulkUpdating && pendingBulkStatus === 'unbookmark' ? "正在更新..." : "批量取消收藏" }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import FilterBar from "../../../components/FilterBar.vue";
import { computed } from "vue";
import { formatSmartDateTimeLabel } from "../../../lib/presentation";

const props = defineProps<{
  presets: readonly { id: string; label: string }[];
  activePresetId: string;
  filterSummary: string;
  query: string;
  themeFilter: string;
  statusFilter: string;
  typeFilter: string;
  impactFilter: string;
  readFilter: string;
  bookmarkFilter: string;
  sortBy: string;
  recentOnly24h: boolean;
  sinceFilter: string;
  incrementalEventCount: number;
  themeOptions: Array<{ id: string; name: string }>;
  themeContextLabel?: string;
  selectedCount: number;
  allVisibleSelected: boolean;
  bulkUpdating: boolean;
  pendingBulkStatus: string;
  applyPreset: (presetId: string) => void;
  resetFilters: () => void;
  setQuery: (value: string) => void;
  setThemeFilter: (value: string) => void;
  setStatusFilter: (value: string) => void;
  setTypeFilter: (value: string) => void;
  setImpactFilter: (value: string) => void;
  setReadFilter: (value: string) => void;
  setBookmarkFilter: (value: string) => void;
  setSortBy: (value: string) => void;
  setRecentOnly24h: (value: boolean) => void;
  clearSinceFilter: () => void;
  toggleSelectAllVisible: (event: Event) => void;
  handleBulkUpdateStatus: (status: string) => void;
  handleBulkUpdateMeta: (
    input: {
      isRead?: boolean;
      isBookmarked?: boolean;
    },
    pendingKey: string,
  ) => void;
}>();

const emit = defineEmits<{
  loadView: [filters: Record<string, string>];
}>();

const currentFilters = computed(() => ({
  query: props.query,
  theme: props.themeFilter,
  status: props.statusFilter,
  type: props.typeFilter,
  impact: props.impactFilter,
  read: props.readFilter,
  bookmark: props.bookmarkFilter,
  sort: props.sortBy,
  recent: props.recentOnly24h ? "24h" : "",
}));
</script>
