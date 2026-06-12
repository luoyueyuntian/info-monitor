<template>
  <div>
    <section class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-400/15 bg-slate-50/80 p-4 shadow-[0_10px_26px_rgba(15,23,42,0.04)]">
      <div class="flex flex-wrap items-center gap-2.5">
        <span class="text-[0.82rem] font-bold uppercase tracking-[0.06em] text-ink-label">快速视角</span>
        <button
          v-for="preset in presets"
          :key="preset.id"
          class="quick-preset-button inline-flex items-center justify-center rounded-xl border border-border bg-white px-4 py-2.5 text-ink transition-colors hover:bg-slate-50"
          :class="activePresetId === preset.id ? 'border-[#2f2618] bg-btn-dark text-ink-on-dark hover:bg-btn-dark' : ''"
          @click="applySourcePreset(preset.id)"
        >
          {{ preset.label }}
        </button>
      </div>
      <div class="flex flex-wrap items-center gap-2.5 text-[#625847]">
        <strong>当前筛选</strong>
        <span>{{ filterSummary }}</span>
        <button class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover" @click="resetFilters">重置筛选</button>
      </div>
    </section>

    <section class="mt-3 flex flex-wrap items-center gap-3">
      <select class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5" :value="focusFilter" @change="setFocusFilter(($event.target as HTMLSelectElement).value)">
        <option value="all">全部来源</option>
        <option value="warning">异常来源</option>
        <option value="pending">待运行来源</option>
        <option value="healthy">正常来源</option>
      </select>
      <select class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5" :value="themeFilter" @change="setThemeFilter(($event.target as HTMLSelectElement).value)">
        <option value="all">全部主题</option>
        <option v-if="themeContextLabel" :value="themeFilter">{{ themeContextLabel }}</option>
        <option v-for="option in themeOptions" :key="option.id" :value="option.id">
          {{ option.name }}
        </option>
      </select>
      <select class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5" :value="impactFilter" @change="setImpactFilter(($event.target as HTMLSelectElement).value)">
        <option value="all">全部关联判断</option>
        <option value="negative">关联偏利空主题</option>
        <option value="positive">关联偏利好主题</option>
        <option value="neutral">关联中性主题</option>
      </select>
      <label class="flex items-center gap-2.5 font-semibold">
        <input :checked="recentOnly24h" type="checkbox" @change="setRecentOnly24h(($event.target as HTMLInputElement).checked)" />
        仅最近24小时运行
      </label>
    </section>

    <section v-if="sinceFilter" class="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-400/15 bg-slate-50/80 p-4 shadow-[0_10px_26px_rgba(15,23,42,0.04)]">
      <div class="flex flex-wrap items-center gap-2.5">
        <strong>增量视图</strong>
        <span class="text-[0.88rem] text-ink-secondary">
          当前只看 {{ formatDateTimeLabel(sinceFilter) }} 之后有新活动或状态变化的来源，共 {{ incrementalSourceCount }} 个。
        </span>
      </div>
      <button class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover" @click="clearSinceFilter">退出增量视图</button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { formatDateTimeLabel } from "../../../../lib/presentation";

defineProps<{
  presets: readonly { id: string; label: string }[];
  activePresetId: string;
  filterSummary: string;
  focusFilter: string;
  themeFilter: string;
  themeOptions: Array<{ id: string; name: string }>;
  themeContextLabel?: string;
  impactFilter: string;
  recentOnly24h: boolean;
  sinceFilter: string;
  incrementalSourceCount: number;
  applySourcePreset: (presetId: string) => void;
  resetFilters: () => void;
  setFocusFilter: (value: string) => void;
  setThemeFilter: (value: string) => void;
  setImpactFilter: (value: string) => void;
  setRecentOnly24h: (value: boolean) => void;
  clearSinceFilter: () => void;
}>();
</script>
