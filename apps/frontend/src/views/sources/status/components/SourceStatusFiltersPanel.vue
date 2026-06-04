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
          @click="applySourcePreset(preset.id)"
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
      <select :value="focusFilter" @change="setFocusFilter(($event.target as HTMLSelectElement).value)">
        <option value="all">全部来源</option>
        <option value="warning">异常来源</option>
        <option value="pending">待运行来源</option>
        <option value="healthy">正常来源</option>
      </select>
      <label class="checkbox-row">
        <input :checked="recentOnly24h" type="checkbox" @change="setRecentOnly24h(($event.target as HTMLInputElement).checked)" />
        仅最近24小时运行
      </label>
    </section>

    <section v-if="sinceFilter" class="toolbar toolbar-panel change-focus-banner">
      <div class="toolbar-group">
        <strong>增量视图</strong>
        <span class="meta">
          当前只看 {{ formatDateTimeLabel(sinceFilter) }} 之后有新活动或状态变化的来源，共 {{ incrementalSourceCount }} 个。
        </span>
      </div>
      <button class="button secondary" @click="clearSinceFilter">退出增量视图</button>
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
  recentOnly24h: boolean;
  sinceFilter: string;
  incrementalSourceCount: number;
  applySourcePreset: (presetId: string) => void;
  resetFilters: () => void;
  setFocusFilter: (value: string) => void;
  setRecentOnly24h: (value: boolean) => void;
  clearSinceFilter: () => void;
}>();
</script>
