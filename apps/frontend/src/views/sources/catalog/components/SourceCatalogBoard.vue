<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h2 class="text-xl font-bold text-ink-heading">数据来源目录</h2>
        <p class="mt-1 text-sm text-ink-secondary">浏览所有可用数据来源，一键启用或禁用。</p>
      </div>
      <div class="flex items-center gap-3">
        <select
          v-model="categoryFilter"
          class="rounded-xl border border-slate-400/15 bg-white/70 px-3 py-2 text-sm text-ink-body focus:outline-none"
        >
          <option value="">全部类型</option>
          <option value="price">价格</option>
          <option value="financial_event">金融事件</option>
          <option value="news_announcement">新闻公告</option>
          <option value="content_update">内容更新</option>
        </select>
        <input
          v-model="search"
          type="text"
          placeholder="搜索来源名称..."
          class="rounded-xl border border-slate-400/15 bg-white/70 px-3 py-2 text-sm text-ink-body focus:outline-none w-56"
        />
      </div>
    </div>

    <div v-if="loading" class="py-16 text-center text-ink-secondary">加载中...</div>

    <div v-else class="grid gap-4">
      <div v-if="filteredPresets.length === 0" class="py-16 text-center text-ink-secondary">
        未找到匹配的数据来源
      </div>

      <div
        v-for="preset in filteredPresets"
        :key="preset.id"
        class="rounded-2xl border border-slate-400/15 bg-white/70 px-5 py-4 transition-shadow hover:shadow-md"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <h3 class="text-base font-bold text-ink-heading truncate">{{ preset.label }}</h3>
              <span :class="categoryPillClass(preset.infoType)">{{ categoryLabel(preset.infoType) }}</span>
            </div>
            <p class="text-sm text-ink-body line-clamp-2 mb-2">{{ preset.description }}</p>
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-secondary">
              <span>Adapter: {{ preset.adapterKey }}</span>
              <span>来源类型: {{ preset.sourceType }}</span>
            </div>
            <p v-if="preset.help" class="mt-2 text-xs text-ink-secondary italic line-clamp-2">{{ preset.help }}</p>
          </div>
          <div class="flex-shrink-0 flex flex-col items-center gap-2 pt-1">
            <button
              type="button"
              class="relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
              :class="isPresetEnabled(preset) ? 'bg-emerald-500' : 'bg-slate-300'"
              :disabled="togglingId === preset.id"
              @click="togglePreset(preset)"
            >
              <span
                class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
                :class="isPresetEnabled(preset) ? 'translate-x-6' : 'translate-x-1'"
              />
            </button>
            <span class="text-xs font-medium" :class="isPresetEnabled(preset) ? 'text-emerald-600' : 'text-slate-400'">
              {{ togglingId === preset.id ? '处理中...' : isPresetEnabled(preset) ? '已启用' : '已禁用' }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { sourcePresetOptions, type SourcePreset } from "../../components/source-presets";
import {
  fetchThemes,
  createTheme,
  fetchSourceStatuses,
  updateSourcePaused,
  createSource,
} from "../../../../lib/api";

const presets = sourcePresetOptions.filter((p: SourcePreset) => p.id !== "custom");
const categoryFilter = ref("");
const search = ref("");
const loading = ref(true);
const togglingId = ref<string | null>(null);

type MatchedSource = { id: string; adapterKey: string; themeId: string; isPaused: boolean; name: string };
type ThemeSummary = { id: string; name: string; type: string };

const existingSources = ref<MatchedSource[]>([]);
const existingThemes = ref<ThemeSummary[]>([]);

const filteredPresets = computed(() => {
  let result = presets;
  if (categoryFilter.value) {
    result = result.filter((p: SourcePreset) => p.infoType === categoryFilter.value);
  }
  if (search.value.trim()) {
    const q = search.value.trim().toLowerCase();
    result = result.filter(
      (p: SourcePreset) =>
        p.label.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.adapterKey.toLowerCase().includes(q),
    );
  }
  return result;
});

function categoryLabel(infoType: string): string {
  const map: Record<string, string> = {
    price: "价格",
    financial_event: "金融事件",
    news_announcement: "新闻公告",
    content_update: "内容更新",
  };
  return map[infoType] ?? infoType;
}

function categoryPillClass(infoType: string): string {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";
  const map: Record<string, string> = {
    price: `${base} bg-amber-50 text-amber-700`,
    financial_event: `${base} bg-blue-50 text-blue-700`,
    news_announcement: `${base} bg-emerald-50 text-emerald-700`,
    content_update: `${base} bg-purple-50 text-purple-700`,
  };
  return map[infoType] ?? `${base} bg-slate-50 text-slate-700`;
}

const presetToSource = computed(() => {
  const map = new Map<string, MatchedSource>();
  for (const src of existingSources.value) {
    if (src.adapterKey) {
      map.set(src.adapterKey, src);
    }
  }
  return map;
});

function isPresetEnabled(preset: SourcePreset): boolean {
  const src = presetToSource.value.get(preset.adapterKey);
  if (!src) return false;
  return !src.isPaused;
}

async function loadData() {
  loading.value = true;
  try {
    const [themes, sources] = await Promise.all([fetchThemes(), fetchSourceStatuses()]);
    existingThemes.value = themes as unknown as ThemeSummary[];
    existingSources.value = sources.map((s) => ({
      id: s.id,
      adapterKey: s.adapterKey ?? "",
      themeId: s.themeId,
      isPaused: s.isPaused ?? false,
      name: s.name,
    }));
  } catch (e) {
    console.error("Failed to load source catalog data:", e);
  } finally {
    loading.value = false;
  }
}

async function togglePreset(preset: SourcePreset) {
  togglingId.value = preset.id;
  try {
    const src = presetToSource.value.get(preset.adapterKey);

    if (src) {
      await updateSourcePaused(src.id, src.isPaused ? false : true);
    } else {
      const themeName = preset.label;
      const themeType = preset.infoType;
      let themeId: string | null = null;

      const matchingTheme = existingThemes.value.find(
        (t: ThemeSummary) => t.type === themeType && t.name === themeName,
      );
      if (matchingTheme) {
        themeId = matchingTheme.id;
      }

      if (themeId && matchingTheme) {
        await createSource({
          themeId,
          name: preset.label,
          sourceType: preset.sourceType,
          adapterKey: preset.adapterKey,
          config: preset.defaultConfig,
          onboardingStatus: "active",
        });
      } else {
        const result = await createTheme({
          name: themeName,
          themeType,
          infoType: preset.infoType,
          description: preset.description,
          sources: [
            {
              name: preset.label,
              sourceType: preset.sourceType,
              adapterKey: preset.adapterKey,
              config: preset.defaultConfig,
            },
          ],
          runImmediately: true,
        });
        themeId = result.id;
      }
    }

    await loadData();
  } catch (e) {
    console.error("Failed to toggle preset:", preset.id, e);
    alert(`操作失败: ${e instanceof Error ? e.message : "未知错误"}`);
  } finally {
    togglingId.value = null;
  }
}

onMounted(loadData);
</script>
