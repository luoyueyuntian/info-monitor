<template>
  <div>
    <section class="toolbar toolbar-panel">
      <div class="toolbar-group">
        <span class="toolbar-label">快速视角</span>
        <button
          v-for="preset in presets"
          :key="preset.id"
          class="button secondary quick-preset-button"
          :class="{ 'quick-preset-button--active': activePresetId === preset.id }"
          @click="applyPreset(preset.id)"
        >
          {{ preset.label }}
        </button>
      </div>
      <div class="toolbar-summary">
        <strong>当前筛选</strong>
        <span>{{ filterSummary }}</span>
        <button class="button secondary" @click="resetFilters">重置筛选</button>
      </div>
    </section>

    <section class="toolbar">
      <input :value="query" placeholder="搜索事件标题或主题..." @input="setQuery(($event.target as HTMLInputElement).value)" />
      <select :value="themeFilter" @change="setThemeFilter(($event.target as HTMLSelectElement).value)">
        <option value="all">全部主题</option>
        <option v-for="option in themeOptions" :key="option.id" :value="option.id">
          {{ option.name }}
        </option>
      </select>
      <select :value="statusFilter" @change="setStatusFilter(($event.target as HTMLSelectElement).value)">
        <option value="all">全部状态</option>
        <option value="open">待处理</option>
        <option value="tracking">关注中</option>
        <option value="ignored">已忽略</option>
      </select>
      <select :value="typeFilter" @change="setTypeFilter(($event.target as HTMLSelectElement).value)">
        <option value="all">全部类型</option>
        <option value="price">价格</option>
        <option value="news_announcement">公告</option>
        <option value="financial_event">金融事件</option>
      </select>
      <select :value="readFilter" @change="setReadFilter(($event.target as HTMLSelectElement).value)">
        <option value="all">全部阅读状态</option>
        <option value="unread">未读</option>
        <option value="read">已读</option>
      </select>
      <select :value="bookmarkFilter" @change="setBookmarkFilter(($event.target as HTMLSelectElement).value)">
        <option value="all">全部收藏状态</option>
        <option value="bookmarked">仅收藏</option>
      </select>
      <select :value="sortBy" @change="setSortBy(($event.target as HTMLSelectElement).value)">
        <option value="occurredAt">按事件时间</option>
        <option value="statusChanged">按最近状态变化</option>
      </select>
      <label class="checkbox-row">
        <input :checked="recentOnly24h" type="checkbox" @change="setRecentOnly24h(($event.target as HTMLInputElement).checked)" />
        仅最近24小时
      </label>
    </section>

    <section v-if="sinceFilter" class="toolbar toolbar-panel change-focus-banner">
      <div class="toolbar-group">
        <strong>增量视图</strong>
        <span class="meta">
          当前只看 {{ formatSmartDateTimeLabel(sinceFilter) }} 之后新增或发生状态变化的事件，共 {{ incrementalEventCount }} 条。
        </span>
      </div>
      <button class="button secondary" @click="clearSinceFilter">退出增量视图</button>
    </section>

    <section class="toolbar toolbar-panel">
      <div class="toolbar-group">
        <label class="checkbox-row">
          <input
            :checked="allVisibleSelected"
            type="checkbox"
            @change="toggleSelectAllVisible"
          />
          选中当前筛选结果
        </label>
        <span class="meta">已选 {{ selectedCount }} 条事件</span>
      </div>
      <div class="actions">
        <button
          class="button secondary"
          :disabled="!selectedCount || bulkUpdating"
          @click="handleBulkUpdateStatus('open')"
        >
          {{ bulkUpdating && pendingBulkStatus === 'open' ? "正在更新..." : "批量标记待处理" }}
        </button>
        <button
          class="button secondary"
          :disabled="!selectedCount || bulkUpdating"
          @click="handleBulkUpdateStatus('tracking')"
        >
          {{ bulkUpdating && pendingBulkStatus === 'tracking' ? "正在更新..." : "批量标记关注中" }}
        </button>
        <button
          class="button secondary"
          :disabled="!selectedCount || bulkUpdating"
          @click="handleBulkUpdateStatus('ignored')"
        >
          {{ bulkUpdating && pendingBulkStatus === 'ignored' ? "正在更新..." : "批量标记已忽略" }}
        </button>
        <button
          class="button secondary"
          :disabled="!selectedCount || bulkUpdating"
          @click="handleBulkUpdateMeta({ isRead: true }, 'read')"
        >
          {{ bulkUpdating && pendingBulkStatus === 'read' ? "正在更新..." : "批量标记已读" }}
        </button>
        <button
          class="button secondary"
          :disabled="!selectedCount || bulkUpdating"
          @click="handleBulkUpdateMeta({ isBookmarked: true }, 'bookmark')"
        >
          {{ bulkUpdating && pendingBulkStatus === 'bookmark' ? "正在更新..." : "批量加入收藏" }}
        </button>
        <button
          class="button secondary"
          :disabled="!selectedCount || bulkUpdating"
          @click="handleBulkUpdateMeta({ isBookmarked: false }, 'unbookmark')"
        >
          {{ bulkUpdating && pendingBulkStatus === 'unbookmark' ? "正在更新..." : "批量取消收藏" }}
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { formatSmartDateTimeLabel } from "../../../lib/presentation";

defineProps<{
  presets: readonly { id: string; label: string }[];
  activePresetId: string;
  filterSummary: string;
  query: string;
  themeFilter: string;
  statusFilter: string;
  typeFilter: string;
  readFilter: string;
  bookmarkFilter: string;
  sortBy: string;
  recentOnly24h: boolean;
  sinceFilter: string;
  incrementalEventCount: number;
  themeOptions: Array<{ id: string; name: string }>;
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
</script>
