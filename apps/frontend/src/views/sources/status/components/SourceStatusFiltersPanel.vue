<template>
  <FilterBar
    :presets="presets"
    :active-preset-id="activePresetId"
    :filter-summary="filterSummary"
    view-type="sources"
    :current-filters="currentFilters"
    @apply-preset="applySourcePreset"
    @reset-filters="resetFilters"
    @load-view="emit('loadView', $event)"
  >
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

    <template #banner>
      <section v-if="sinceFilter" class="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-400/15 bg-slate-50/80 p-4 shadow-[0_10px_26px_rgba(15,23,42,0.04)]">
        <div class="flex flex-wrap items-center gap-2.5">
          <strong>增量视图</strong>
          <span class="text-[0.88rem] text-ink-secondary">
            当前只看 {{ formatDateTimeLabel(sinceFilter) }} 之后有新活动或状态变化的来源，共 {{ incrementalSourceCount }} 个。
          </span>
        </div>
        <button class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover" @click="clearSinceFilter">退出增量视图</button>
      </section>
    </template>
  </FilterBar>
</template>

<script setup lang="ts">
import { computed } from "vue";
import FilterBar from "../../../../components/FilterBar.vue";
import { formatDateTimeLabel } from "../../../../lib/presentation";

const props = defineProps<{
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

const emit = defineEmits<{
  loadView: [filters: Record<string, string>];
}>();

const currentFilters = computed(() => ({
  focus: props.focusFilter,
  theme: props.themeFilter,
  impact: props.impactFilter,
  recent: props.recentOnly24h ? "24h" : "",
}));
</script>
