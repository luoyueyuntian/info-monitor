<template>
  <section class="card">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div class="grid gap-1">
        <strong class="text-ink-heading">数据源目录</strong>
        <div class="text-[0.88rem] text-ink-body">浏览所有可用数据来源，一键启用或禁用。</div>
      </div>
      <div class="flex items-center gap-3">
        <select
          v-model="catalogCategory"
          class="rounded-xl border border-slate-400/15 bg-white/95 px-3 py-2.5 text-sm"
        >
          <option value="">全部类型</option>
          <option value="stock_price">股价</option>
          <option value="commodity_price">商品价格</option>
          <option value="financial_event">金融事件</option>
          <option value="news_announcement">新闻公告</option>
          <option value="content_update">内容更新</option>
        </select>
        <input
          v-model="catalogSearch"
          type="text"
          placeholder="搜索来源名称..."
          class="w-48 rounded-xl border border-slate-400/15 bg-white/95 px-3 py-2.5 text-sm"
        />
      </div>
    </div>
    <div v-if="catalogLoading" class="mt-4 text-sm text-ink-secondary">加载中...</div>
    <div v-else-if="catalogError" class="mt-4 text-sm text-red-600">数据源目录加载失败，请刷新页面重试。</div>
    <div v-else class="mt-4 grid gap-3 sm:grid-cols-2">
      <div v-if="filteredPresets.length === 0" class="col-span-full text-sm text-ink-secondary">未找到匹配的数据来源</div>
      <div
        v-for="preset in filteredPresets"
        :key="preset.id"
        class="rounded-2xl border border-slate-400/15 bg-white/70 px-4 py-3 transition-shadow hover:shadow-md"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div class="mb-1 flex items-center gap-2">
              <span class="truncate text-sm font-semibold text-ink-heading">{{ preset.label }}</span>
              <span :class="catalogPillClass(preset.infoType)">{{ catalogCategoryLabel(preset.infoType) }}</span>
            </div>
            <p class="line-clamp-2 text-xs text-ink-body">{{ preset.description }}</p>
          </div>
          <div class="flex flex-shrink-0 flex-col items-center gap-1.5 pt-0.5">
            <button
              type="button"
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
              :class="isPresetEnabled(preset) ? 'bg-emerald-500' : 'bg-slate-300'"
              :disabled="catalogTogglingId === preset.id || !canTogglePreset(preset)"
              @click="handleTogglePreset(preset)"
            >
              <span
                class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                :class="isPresetEnabled(preset) ? 'translate-x-6' : 'translate-x-1'"
              />
            </button>
            <span class="text-[0.7rem] font-medium" :class="isPresetEnabled(preset) ? 'text-emerald-600' : 'text-slate-400'">
              {{
                catalogTogglingId === preset.id
                  ? "..."
                  : isPresetEnabled(preset)
                    ? "已启用"
                    : canTogglePreset(preset)
                      ? "已禁用"
                      : `需配置(${getPresetMissingRequiredFields(preset).join(",")})`
              }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import {
  createSource,
  createTheme,
  fetchSourcePresets,
  updateSourcePaused,
  type SourceStatus,
  type ThemeSummary,
} from "../../../../../lib/api";
import type { WorkspaceId } from "../../../../../lib/workspaces";
import type { SourcePreset } from "../../../../../views/sources/components/source-presets";
import {
  canAutoCreatePreset,
  getPresetMissingRequiredFields,
  resolveCatalogInfoType,
  resolveCatalogThemeType,
} from "./workspace-source-catalog";

const props = defineProps<{
  workspaceId: WorkspaceId | string;
  workspaceThemes: ThemeSummary[];
  workspaceSources: SourceStatus[];
  allSources: SourceStatus[];
  allThemes: ThemeSummary[];
  load: () => void | Promise<void>;
}>();

const catalogPresets = ref<SourcePreset[]>([]);
const catalogLoading = ref(true);
const catalogCategory = ref("");
const catalogSearch = ref("");
const catalogTogglingId = ref<string | null>(null);
const catalogError = ref(false);

function findSourceForPreset(preset: SourcePreset): SourceStatus | undefined {
  return props.allSources.find(
    (source) => source.adapterKey === preset.adapterKey && source.name === preset.label,
  );
}

function canTogglePreset(preset: SourcePreset): boolean {
  return Boolean(findSourceForPreset(preset)) || canAutoCreatePreset(preset);
}

const workspaceDefaultInfoTypes: Record<string, string[]> = {
  "stock-market": ["stock_price", "financial_event"],
  "market-impact": ["financial_event", "news_announcement"],
  "goods-supply": ["commodity_price"],
  "competitor-watch": ["content_update"],
};

const stockAdapterKeys = new Set(["sina_stock_price", "eastmoney_stock_kline", "yahoo_finance_price", "sina_gold_price"]);

const workspaceInfoTypes = computed(() => {
  const types = new Set<string>();

  const defaults = workspaceDefaultInfoTypes[props.workspaceId] ?? [];
  for (const infoType of defaults) {
    types.add(infoType);
  }

  for (const theme of props.workspaceThemes) {
    if (!theme.type) {
      continue;
    }

    if (theme.type === "price") {
      const hasStockSource = props.workspaceSources.some(
        (source) => source.themeId === theme.id && stockAdapterKeys.has(source.adapterKey ?? ""),
      );
      types.add(hasStockSource ? "stock_price" : "commodity_price");
      continue;
    }

    types.add(theme.type);
  }

  return types;
});

const filteredPresets = computed(() => {
  let result = catalogPresets.value.filter((preset) => workspaceInfoTypes.value.has(preset.infoType));

  if (catalogCategory.value) {
    result = result.filter((preset) => preset.infoType === catalogCategory.value);
  }

  if (catalogSearch.value.trim()) {
    const query = catalogSearch.value.trim().toLowerCase();
    result = result.filter(
      (preset) =>
        preset.label.toLowerCase().includes(query) ||
        preset.description.toLowerCase().includes(query) ||
        preset.adapterKey.toLowerCase().includes(query),
    );
  }

  return result;
});

function isPresetEnabled(preset: SourcePreset): boolean {
  const source = findSourceForPreset(preset);
  if (!source) {
    return false;
  }

  return !source.isPaused;
}

function catalogCategoryLabel(infoType: string): string {
  const map: Record<string, string> = {
    stock_price: "股价",
    commodity_price: "商品价格",
    financial_event: "金融事件",
    news_announcement: "新闻公告",
    content_update: "内容更新",
  };
  return map[infoType] ?? infoType;
}

function catalogPillClass(infoType: string): string {
  const base = "inline-flex items-center rounded-full px-1.5 py-0.5 text-[0.65rem] font-medium";
  const map: Record<string, string> = {
    stock_price: `${base} bg-amber-50 text-amber-700`,
    commodity_price: `${base} bg-orange-50 text-orange-700`,
    financial_event: `${base} bg-blue-50 text-blue-700`,
    news_announcement: `${base} bg-emerald-50 text-emerald-700`,
    content_update: `${base} bg-purple-50 text-purple-700`,
  };
  return map[infoType] ?? `${base} bg-slate-50 text-slate-700`;
}

async function handleTogglePreset(preset: SourcePreset) {
  if (!canTogglePreset(preset)) {
    return;
  }

  catalogTogglingId.value = preset.id;

  try {
    const source = findSourceForPreset(preset);

    if (source) {
      await updateSourcePaused(source.id, !source.isPaused);
    } else {
      const themeName = preset.label;
      const themeType = resolveCatalogThemeType(preset.infoType);
      const infoType = resolveCatalogInfoType(preset.infoType);
      let themeId: string | null = null;

      const matchingTheme = props.allThemes.find((theme) => theme.type === themeType && theme.name === themeName);
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
          infoType,
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

    await props.load();
  } catch (error) {
    console.error("Failed to toggle preset:", preset.id, error);
    alert(`操作失败: ${error instanceof Error ? error.message : "未知错误"}`);
  } finally {
    catalogTogglingId.value = null;
  }
}

async function loadCatalog() {
  catalogLoading.value = true;
  catalogError.value = false;

  try {
    const presets = await fetchSourcePresets();
    catalogPresets.value = presets.filter((preset) => preset.id !== "custom");
  } catch (error) {
    console.error("Failed to load catalog:", error);
    catalogError.value = true;
  } finally {
    catalogLoading.value = false;
  }
}

onMounted(() => {
  void loadCatalog();
});
</script>
