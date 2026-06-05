<template>
  <div>
    <section class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-400/15 bg-slate-50/80 p-4 shadow-[0_10px_26px_rgba(15,23,42,0.04)]">
      <div class="flex flex-wrap items-center gap-2.5">
        <span class="text-[0.82rem] font-bold uppercase tracking-[0.06em] text-[#6b5e49]">快速视角</span>
        <button
          v-for="preset in presets"
          :key="preset.id"
          class="quick-preset-button inline-flex items-center justify-center rounded-xl border border-[rgba(120,120,120,0.22)] bg-white px-4 py-2.5 text-[#1d1d1d] transition-colors hover:bg-slate-50"
          :class="activePresetId === preset.id ? 'border-[#2f2618] bg-[#2f2618] text-[#fff7e7] hover:bg-[#2f2618]' : ''"
          @click="applyThemePreset(preset.id)"
        >
          {{ preset.label }}
        </button>
      </div>
      <div class="flex flex-wrap items-center gap-2.5 text-[#625847]">
        <strong>当前筛选</strong>
        <span>{{ filterSummary }}</span>
        <button class="inline-flex items-center justify-center rounded-xl bg-[#e6dcc8] px-4 py-2.5 text-[#3a3126] transition-colors hover:bg-[#ddd1bb]" @click="resetFilters">重置筛选</button>
      </div>
    </section>

    <section class="mt-3 flex flex-wrap items-center gap-3">
      <input class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5" :value="query" placeholder="搜索主题..." @input="setQuery(($event.target as HTMLInputElement).value)" />
      <select class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5" :value="typeFilter" @change="setTypeFilter(($event.target as HTMLSelectElement).value)">
        <option value="all">全部类型</option>
        <option value="price">价格</option>
        <option value="content_update">内容更新</option>
        <option value="news_announcement">公告</option>
        <option value="financial_event">金融事件</option>
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
      <select class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5" :value="sortBy" @change="setSortBy(($event.target as HTMLSelectElement).value)">
        <option value="attention">优先处理</option>
        <option value="priority">优先级</option>
        <option value="latestEvent">最近事件</option>
        <option value="latestRun">最近运行</option>
        <option value="latestBookmarked">最近收藏</option>
        <option value="name">名称</option>
      </select>
      <button v-if="query" class="inline-flex items-center justify-center rounded-xl bg-[#e6dcc8] px-4 py-2.5 text-[#3a3126] transition-colors hover:bg-[#ddd1bb]" @click="clearQuery">清空搜索</button>
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
  impactFilter: string;
  recentOnly24h: boolean;
  sortBy: string;
  applyThemePreset: (presetId: string) => void;
  resetFilters: () => void;
  setQuery: (value: string) => void;
  setTypeFilter: (value: string) => void;
  setEventQueueFilter: (value: string) => void;
  setHealthFilter: (value: string) => void;
  setImpactFilter: (value: string) => void;
  setRecentOnly24h: (value: boolean) => void;
  setSortBy: (value: string) => void;
  clearQuery: () => void;
}>();
</script>
