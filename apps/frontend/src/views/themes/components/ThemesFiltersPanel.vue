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
          @click="applyThemePreset(preset.id)"
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
      <input :value="query" placeholder="搜索主题..." @input="setQuery(($event.target as HTMLInputElement).value)" />
      <select :value="typeFilter" @change="setTypeFilter(($event.target as HTMLSelectElement).value)">
        <option value="all">全部类型</option>
        <option value="price">价格</option>
        <option value="news_announcement">公告</option>
        <option value="financial_event">金融事件</option>
      </select>
      <select :value="eventQueueFilter" @change="setEventQueueFilter(($event.target as HTMLSelectElement).value)">
        <option value="all">全部处理状态</option>
        <option value="open">有待处理事件</option>
        <option value="tracking">有关注中事件</option>
        <option value="ignored">仅已忽略事件</option>
        <option value="unread">有未读事件</option>
        <option value="bookmarked">有收藏事件</option>
      </select>
      <select :value="healthFilter" @change="setHealthFilter(($event.target as HTMLSelectElement).value)">
        <option value="all">全部健康状态</option>
        <option value="healthy">正常</option>
        <option value="warning">异常</option>
      </select>
      <label class="checkbox-row">
        <input :checked="recentOnly24h" type="checkbox" @change="setRecentOnly24h(($event.target as HTMLInputElement).checked)" />
        仅最近24小时更新
      </label>
      <select :value="sortBy" @change="setSortBy(($event.target as HTMLSelectElement).value)">
        <option value="attention">优先处理</option>
        <option value="priority">优先级</option>
        <option value="latestEvent">最近事件</option>
        <option value="latestRun">最近运行</option>
        <option value="name">名称</option>
      </select>
      <button v-if="query" class="button secondary" @click="clearQuery">清空搜索</button>
    </section>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  presets: readonly { id: string; label: string }[];
  activePresetId: string;
  filterSummary: string;
  query: string;
  typeFilter: string;
  eventQueueFilter: string;
  healthFilter: string;
  recentOnly24h: boolean;
  sortBy: string;
  applyThemePreset: (presetId: string) => void;
  resetFilters: () => void;
  setQuery: (value: string) => void;
  setTypeFilter: (value: string) => void;
  setEventQueueFilter: (value: string) => void;
  setHealthFilter: (value: string) => void;
  setRecentOnly24h: (value: boolean) => void;
  setSortBy: (value: string) => void;
  clearQuery: () => void;
}>();
</script>
