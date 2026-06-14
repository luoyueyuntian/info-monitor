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
          @click="emit('applyPreset', preset.id)"
        >
          {{ preset.label }}
        </button>
      </div>
      <div class="flex flex-wrap items-center gap-2.5 text-[#625847]">
        <strong>当前筛选</strong>
        <span>{{ filterSummary }}</span>
        <button class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover" @click="emit('resetFilters')">重置筛选</button>

        <!-- Saved Views -->
        <div v-if="viewType" class="relative">
          <button
            class="inline-flex items-center justify-center rounded-xl border border-border bg-white px-3 py-2.5 text-[0.82rem] text-ink transition-colors hover:bg-slate-50"
            @click="showSavedViews = !showSavedViews"
          >
            已保存视角 {{ savedViewsList.length > 0 ? `(${savedViewsList.length})` : "" }}
          </button>
          <div
            v-if="showSavedViews"
            class="absolute right-0 top-full z-20 mt-1 w-64 rounded-xl border border-slate-400/20 bg-white shadow-lg"
          >
            <!-- Save current view -->
            <div class="border-b border-slate-200 p-3">
              <div class="flex gap-2">
                <input
                  v-model="newViewName"
                  class="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-[0.82rem]"
                  placeholder="视角名称..."
                  @keyup.enter="handleSaveView"
                />
                <button
                  class="rounded-lg bg-btn-primary px-2.5 py-1.5 text-[0.78rem] font-semibold text-ink-emphasis transition-colors hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="!newViewName.trim()"
                  @click="handleSaveView"
                >
                  保存
                </button>
              </div>
            </div>
            <!-- List saved views -->
            <div v-if="savedViewsList.length" class="max-h-48 overflow-y-auto">
              <div
                v-for="view in savedViewsList"
                :key="view.id"
                class="flex items-center justify-between gap-2 px-3 py-2 hover:bg-slate-50"
              >
                <button
                  class="flex-1 truncate text-left text-[0.82rem] text-ink"
                  @click="handleLoadView(view)"
                >
                  {{ view.name }}
                </button>
                <button
                  class="shrink-0 text-[0.78rem] text-slate-400 hover:text-rose-500"
                  @click="handleDeleteView(view.id)"
                >
                  ✕
                </button>
              </div>
            </div>
            <div v-else class="p-3 text-center text-[0.82rem] text-ink-secondary">
              暂无保存的视角
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="mt-3 flex flex-wrap items-center gap-3">
      <slot />
    </section>

    <slot name="banner" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  fetchSavedFilterViews,
  saveFilterView,
  deleteFilterView,
  type SavedFilterView,
} from "../lib/api";

const props = defineProps<{
  presets: readonly { id: string; label: string }[];
  activePresetId: string;
  filterSummary: string;
  /** View type namespace for saved views. If omitted, saved views UI is hidden. */
  viewType?: "events" | "themes" | "sources";
  /** Current filter state to save. Keys are filter names, values are filter values. */
  currentFilters?: Record<string, string>;
}>();

const emit = defineEmits<{
  applyPreset: [presetId: string];
  resetFilters: [];
  loadView: [filters: Record<string, string>];
}>();

const showSavedViews = ref(false);
const newViewName = ref("");
const savedViews = ref<SavedFilterView[]>([]);

// Load from DB on mount
onMounted(async () => {
  if (props.viewType) {
    try {
      savedViews.value = await fetchSavedFilterViews(props.viewType);
    } catch {
      // fallback already handled inside fetchSavedFilterViews
    }
  }
});

const savedViewsList = computed(() => {
  if (!props.viewType) return [];
  return savedViews.value.filter((v) => v.viewType === props.viewType);
});

async function handleSaveView() {
  if (!props.viewType || !newViewName.value.trim() || !props.currentFilters) return;
  const saved = await saveFilterView({
    name: newViewName.value.trim(),
    viewType: props.viewType,
    filters: props.currentFilters,
  });
  savedViews.value.push(saved);
  newViewName.value = "";
}

function handleLoadView(view: SavedFilterView) {
  emit("loadView", view.filters);
  showSavedViews.value = false;
}

async function handleDeleteView(viewId: string) {
  await deleteFilterView(viewId);
  savedViews.value = savedViews.value.filter((v) => v.id !== viewId);
}
</script>
