<template>
  <div v-if="workspace" class="page">
    <WorkspacePageHeader
      :workspace="workspace"
      title="渠道控制台"
      description="这里只看当前工作区的信息来源渠道。开启后，后续抓取会继续覆盖该渠道；关闭后，后续自动抓取将跳过该渠道。"
    />

    <section class="card">
      <div class="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_repeat(4,minmax(140px,1fr))]">
        <input
          v-model="query"
          class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5"
          placeholder="搜索来源、适配器或主题..."
        />
        <select v-model="statusFilter" class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5">
          <option value="all">全部健康状态</option>
          <option value="warning">异常</option>
          <option value="healthy">正常</option>
        </select>
        <select v-model="runFilter" class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5">
          <option value="all">全部运行状态</option>
          <option value="pending">排队中</option>
          <option value="completed">已完成</option>
          <option value="failed">失败</option>
        </select>
        <select v-model="pausedFilter" class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5">
          <option value="all">全部启停状态</option>
          <option value="paused">已暂停</option>
          <option value="active">运行中</option>
        </select>
        <button
          class="rounded-xl bg-btn-primary px-4 py-2.5 font-semibold text-ink-emphasis transition-colors hover:bg-btn-primary-hover"
          @click="resetFilters"
        >
          重置筛选
        </button>
      </div>
    </section>

    <section class="card">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="grid gap-1">
          <strong class="text-ink-heading">当前筛选渠道</strong>
          <div class="text-[0.92rem] leading-6 text-ink-body">
            共 {{ filteredSources.length }} 个渠道，其中 {{ activeFilteredSources.length }} 个已开启，{{ pausedFilteredSources.length }} 个已关闭。
          </div>
          <div class="text-[0.88rem] text-ink-secondary">
            关闭渠道后，scheduler 不会再自动为该渠道入队新的抓取任务。
          </div>
        </div>
        <div class="flex flex-wrap gap-2.5">
          <button
            class="rounded-xl border border-slate-400/15 bg-white/85 px-4 py-2.5 text-[0.9rem] font-semibold text-slate-700 transition-colors hover:bg-white disabled:opacity-60"
            :disabled="bulkUpdating || pausedFilteredSources.length === 0"
            @click="handleBulkSetChannelState(false)"
          >
            {{ bulkUpdating && pendingBulkAction === "resume" ? "开启中..." : "批量开启渠道" }}
          </button>
          <button
            class="rounded-xl bg-btn-primary px-4 py-2.5 text-[0.9rem] font-semibold text-ink-emphasis transition-colors hover:bg-btn-primary-hover disabled:opacity-60"
            :disabled="bulkUpdating || activeFilteredSources.length === 0"
            @click="handleBulkSetChannelState(true)"
          >
            {{ bulkUpdating && pendingBulkAction === "pause" ? "关闭中..." : "批量关闭渠道" }}
          </button>
        </div>
      </div>
    </section>

    <section
      v-if="operationMessage"
      class="rounded-[22px] border border-slate-400/15 bg-white/82 px-5 py-4 text-[0.94rem] leading-6 text-ink-body shadow-[0_12px_30px_rgba(15,23,42,0.05)]"
    >
      <strong class="block text-ink-heading">{{ operationMessage.title }}</strong>
      <div class="mt-1">{{ operationMessage.body }}</div>
    </section>

    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <article class="card" v-for="metric in metrics" :key="metric.label">
        <div class="text-[0.82rem] uppercase tracking-[0.08em] text-ink-label">{{ metric.label }}</div>
        <div class="mt-3 text-[1.6rem] font-semibold text-ink-heading">{{ metric.value }}</div>
        <div class="mt-2 text-[0.9rem] leading-6 text-ink-body">{{ metric.description }}</div>
      </article>
    </section>

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
            class="rounded-xl border border-slate-400/15 bg-white/95 px-3 py-2.5 text-sm w-48"
          />
        </div>
      </div>
      <div v-if="catalogLoading" class="mt-4 text-sm text-ink-secondary">加载中...</div>
      <div v-else-if="catalogError" class="mt-4 text-sm text-red-600">数据源目录加载失败，请刷新页面重试。</div>
      <div v-else class="mt-4 grid gap-3 sm:grid-cols-2">
        <div v-if="filteredPresets.length === 0" class="text-sm text-ink-secondary col-span-full">未找到匹配的数据来源</div>
        <div
          v-for="preset in filteredPresets"
          :key="preset.id"
          class="rounded-2xl border border-slate-400/15 bg-white/70 px-4 py-3 transition-shadow hover:shadow-md"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-sm font-semibold text-ink-heading truncate">{{ preset.label }}</span>
                <span :class="catalogPillClass(preset.infoType)">{{ catalogCategoryLabel(preset.infoType) }}</span>
              </div>
              <p class="text-xs text-ink-body line-clamp-2">{{ preset.description }}</p>
            </div>
            <div class="flex-shrink-0 flex flex-col items-center gap-1.5 pt-0.5">
              <button
                type="button"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
                :class="isPresetEnabled(preset) ? 'bg-emerald-500' : 'bg-slate-300'"
                :disabled="catalogTogglingId === preset.id"
                @click="handleTogglePreset(preset)"
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                  :class="isPresetEnabled(preset) ? 'translate-x-6' : 'translate-x-1'"
                />
              </button>
              <span class="text-[0.7rem] font-medium" :class="isPresetEnabled(preset) ? 'text-emerald-600' : 'text-slate-400'">
                {{ catalogTogglingId === preset.id ? '...' : isPresetEnabled(preset) ? '已启用' : '已禁用' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="grid gap-4 xl:grid-cols-2">
      <article
        v-for="source in filteredSources"
        :key="source.id"
        class="rounded-[24px] border border-slate-400/15 bg-white/82 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <span :class="pillToneClass(source.status)">{{ sourceStatusLabel(source.status) }}</span>
              <span :class="pillToneClass(source.latestRunStatus ?? 'pending')">{{ runStatusLabel(source.latestRunStatus) }}</span>
              <span :class="pillToneClass(source.isPaused ? 'pending' : 'active')">{{ source.isPaused ? "渠道已关闭" : "渠道已开启" }}</span>
            </div>
            <h3 class="mt-3 text-[1.1rem] font-semibold text-ink-heading">{{ source.name }}</h3>
          </div>
          <RouterLink
            :to="`/workspace/${workspace.id}/sources/${source.id}`"
            class="rounded-xl border border-slate-400/15 bg-white/80 px-3 py-2 text-[0.86rem] font-semibold text-slate-700 transition-colors hover:bg-white"
          >
            查看详情
          </RouterLink>
        </div>

        <div class="mt-3 grid gap-3 sm:grid-cols-2">
          <div class="rounded-2xl bg-slate-50/90 px-4 py-3">
            <div class="text-[0.8rem] uppercase tracking-[0.08em] text-ink-label">关联主题</div>
            <div class="mt-2 font-semibold text-ink-heading">{{ source.themeName }}</div>
          </div>
          <div class="rounded-2xl bg-slate-50/90 px-4 py-3">
            <div class="text-[0.8rem] uppercase tracking-[0.08em] text-ink-label">最近运行</div>
            <div class="mt-2 font-semibold text-ink-heading">{{ formatSmartDateTimeLabel(source.latestRunAt, referenceNow) }}</div>
          </div>
          <div class="rounded-2xl bg-slate-50/90 px-4 py-3">
            <div class="text-[0.8rem] uppercase tracking-[0.08em] text-ink-label">来源类型</div>
            <div class="mt-2 font-semibold text-ink-heading">{{ source.sourceType ?? "--" }}</div>
          </div>
          <div class="rounded-2xl bg-slate-50/90 px-4 py-3">
            <div class="text-[0.8rem] uppercase tracking-[0.08em] text-ink-label">适配器 / 渠道</div>
            <div class="mt-2 font-semibold text-ink-heading">{{ source.adapterKey ?? "--" }}</div>
          </div>
        </div>

        <div class="mt-3 rounded-2xl border border-slate-400/15 bg-slate-50/80 px-4 py-4 text-[0.92rem] leading-6 text-ink-body">
          <strong class="block text-ink-heading">当前判断</strong>
          <span v-if="source.status === 'warning'">来源异常，当前工作区的结论需要结合错误信息谨慎使用。</span>
          <span v-else-if="source.isPaused">渠道已关闭，后续自动抓取会跳过该渠道，直到你重新开启。</span>
          <span v-else>渠道已开启，来源运行稳定时会继续参与当前工作区的后续抓取。</span>
        </div>

        <div class="mt-4 flex flex-wrap gap-2.5">
          <button
            class="rounded-xl bg-btn-primary px-3 py-2 text-[0.86rem] font-semibold text-ink-emphasis transition-colors hover:bg-btn-primary-hover disabled:opacity-60"
            :disabled="source.isPaused || pendingSourceId === source.id && pendingAction === 'trigger'"
            @click="handleTrigger(source.id)"
          >
            {{
              source.isPaused
                ? "渠道关闭中不可运行"
                : pendingSourceId === source.id && pendingAction === "trigger"
                  ? "入队中..."
                  : "立即运行"
            }}
          </button>
          <button
            class="rounded-xl border border-slate-400/15 bg-white/80 px-3 py-2 text-[0.86rem] font-semibold text-slate-700 transition-colors hover:bg-white disabled:opacity-60"
            :disabled="pendingSourceId === source.id && pendingAction === (source.isPaused ? 'resume' : 'pause')"
            @click="handleTogglePaused(source.id, !source.isPaused)"
          >
            {{
              pendingSourceId === source.id && pendingAction === (source.isPaused ? "resume" : "pause")
                ? "更新中..."
                : source.isPaused
                  ? "开启渠道"
                  : "关闭渠道"
            }}
          </button>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { triggerSourceRun, updateSourcePaused, fetchSourcePresets, fetchThemes, createTheme, createSource } from "../../../../../lib/api";
import type { SourcePreset } from "../../../../../views/sources/components/source-presets";
import {
  formatSmartDateTimeLabel,
  pillToneClass,
  runStatusLabel,
  sourceStatusLabel,
} from "../../../../../lib/presentation";
import { type WorkspaceId } from "../../../../../lib/workspaces";
import WorkspacePageHeader from "../../../components/WorkspacePageHeader.vue";
import { useWorkspaceData } from "../../../shared/useWorkspaceData";

const route = useRoute();
const router = useRouter();
const workspaceId = computed(() => String(route.params.workspaceId ?? "") as WorkspaceId);
const { workspace, dataset, allSources, allThemes: workspaceThemes, referenceNow, load } = useWorkspaceData(workspaceId);

const query = ref("");
const statusFilter = ref("all");
const runFilter = ref("all");
const pausedFilter = ref("all");
const pendingSourceId = ref("");
const pendingAction = ref("");
const bulkUpdating = ref(false);
const pendingBulkAction = ref("");
const operationMessage = ref<{ title: string; body: string } | null>(null);

// Catalog state
const catalogPresets = ref<SourcePreset[]>([]);
const catalogLoading = ref(true);
const catalogCategory = ref("");
const catalogSearch = ref("");
const catalogTogglingId = ref<string | null>(null);
const allThemes = ref<Array<{ id: string; name: string; type: string }>>([]);
const catalogError = ref(false);

const filteredSources = computed(() => dataset.value.sources.filter((source) => {
  const text = `${source.name} ${source.adapterKey} ${source.themeName}`.toLowerCase();

  if (query.value && !text.includes(query.value.toLowerCase())) {
    return false;
  }

  if (statusFilter.value !== "all" && source.status !== statusFilter.value) {
    return false;
  }

  if (runFilter.value !== "all" && (source.latestRunStatus ?? "pending") !== runFilter.value) {
    return false;
  }

  if (pausedFilter.value === "paused" && !source.isPaused) {
    return false;
  }

  if (pausedFilter.value === "active" && source.isPaused) {
    return false;
  }

  return true;
}).sort((left, right) => {
  if (left.status !== right.status) {
    return left.status === "warning" ? -1 : 1;
  }

  return new Date(right.latestRunAt ?? right.latestSuccessAt ?? 0).getTime() - new Date(left.latestRunAt ?? left.latestSuccessAt ?? 0).getTime();
}));

const activeFilteredSources = computed(() => filteredSources.value.filter((source) => !source.isPaused));
const pausedFilteredSources = computed(() => filteredSources.value.filter((source) => source.isPaused));

const metrics = computed(() => [
  { label: "来源总数", value: dataset.value.sources.length, description: "当前工作区的全部数据来源" },
  { label: "异常来源", value: dataset.value.sources.filter((source) => source.status === "warning").length, description: "优先修复，避免工作区判断失真" },
  { label: "已关闭渠道", value: dataset.value.sources.filter((source) => source.isPaused).length, description: "关闭后不会继续自动抓取" },
  { label: "运行失败", value: dataset.value.sources.filter((source) => source.latestRunStatus === "failed").length, description: "最近一轮运行失败，需要回看日志和配置" },
]);

function resetFilters() {
  query.value = "";
  statusFilter.value = "all";
  runFilter.value = "all";
  pausedFilter.value = "all";
}

// Catalog logic
// Match by adapterKey AND source name to distinguish presets sharing the same adapterKey
// e.g. generic_price_list is used by JD, Taobao, PDD presets — name ensures correct match
// Note: if preset label changes, existing sources won't match — this is acceptable since
// labels are stable and users can manually manage mismatched sources via the status page
function findSourceForPreset(preset: SourcePreset): typeof allSources.value[number] | undefined {
  return allSources.value.find(
    (src) => src.adapterKey === preset.adapterKey && src.name === preset.label,
  );
}

// Default infoTypes per workspace focus
const workspaceDefaultInfoTypes: Record<string, string[]> = {
  "stock-market": ["stock_price", "financial_event"],
  "market-impact": ["financial_event", "news_announcement"],
  "goods-supply": ["commodity_price"],
  "competitor-watch": ["content_update"],
};

// Filter presets by workspace infoTypes — only show presets relevant to this workspace's themes
// Maps theme.type to preset infoTypes, handling the price → stock_price/commodity_price split
const stockAdapterKeys = new Set(["sina_stock_price", "eastmoney_stock_kline", "yahoo_finance_price", "sina_gold_price"]);
const workspaceInfoTypes = computed(() => {
  const types = new Set<string>();

  // Add default infoTypes for this workspace
  const defaults = workspaceDefaultInfoTypes[workspaceId.value] ?? [];
  for (const t of defaults) {
    types.add(t);
  }

  // Add infoTypes from existing themes
  for (const theme of dataset.value.themes) {
    if (!theme.type) continue;
    if (theme.type === "price") {
      const hasStockSource = dataset.value.sources.some(
        (src) => src.themeId === theme.id && stockAdapterKeys.has(src.adapterKey ?? ""),
      );
      types.add(hasStockSource ? "stock_price" : "commodity_price");
    } else {
      types.add(theme.type);
    }
  }
  return types;
});

const filteredPresets = computed(() => {
  let result = catalogPresets.value;
  // Only show presets whose infoType matches the workspace's theme infoTypes
  result = result.filter((p) => workspaceInfoTypes.value.has(p.infoType));
  if (catalogCategory.value) {
    result = result.filter((p) => p.infoType === catalogCategory.value);
  }
  if (catalogSearch.value.trim()) {
    const q = catalogSearch.value.trim().toLowerCase();
    result = result.filter(
      (p) =>
        p.label.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.adapterKey.toLowerCase().includes(q),
    );
  }
  return result;
});

function isPresetEnabled(preset: SourcePreset): boolean {
  const src = findSourceForPreset(preset);
  if (!src) return false;
  return !src.isPaused;
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
  catalogTogglingId.value = preset.id;
  try {
    const src = findSourceForPreset(preset);

    if (src) {
      await updateSourcePaused(src.id, src.isPaused ? false : true);
    } else {
      const themeName = preset.label;
      const themeType = preset.infoType;
      let themeId: string | null = null;

      const matchingTheme = allThemes.value.find(
        (t) => t.type === themeType && t.name === themeName,
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

    await load();
  } catch (e) {
    console.error("Failed to toggle preset:", preset.id, e);
    alert(`操作失败: ${e instanceof Error ? e.message : "未知错误"}`);
  } finally {
    catalogTogglingId.value = null;
  }
}

async function loadCatalog() {
  catalogLoading.value = true;
  catalogError.value = false;
  try {
    const [presets, themes] = await Promise.all([
      fetchSourcePresets(),
      fetchThemes(),
    ]);
    catalogPresets.value = presets.filter((p: SourcePreset) => p.id !== "custom");
    allThemes.value = themes as unknown as Array<{ id: string; name: string; type: string }>;
  } catch (e) {
    console.error("Failed to load catalog:", e);
    catalogError.value = true;
  } finally {
    catalogLoading.value = false;
  }
}

async function handleTrigger(sourceId: string) {
  pendingSourceId.value = sourceId;
  pendingAction.value = "trigger";
  operationMessage.value = null;

  try {
    await triggerSourceRun(sourceId);
    await load();
    const source = dataset.value.sources.find((item) => item.id === sourceId);
    operationMessage.value = {
      title: "渠道已入队运行",
      body: `渠道「${source?.name ?? sourceId}」已经入队，Worker 会按当前配置继续抓取。`,
    };
  } finally {
    pendingSourceId.value = "";
    pendingAction.value = "";
  }
}

async function handleTogglePaused(sourceId: string, isPaused: boolean) {
  pendingSourceId.value = sourceId;
  pendingAction.value = isPaused ? "pause" : "resume";
  operationMessage.value = null;

  try {
    await updateSourcePaused(sourceId, isPaused);
    await load();
    const source = dataset.value.sources.find((item) => item.id === sourceId);
    operationMessage.value = {
      title: isPaused ? "渠道已关闭" : "渠道已开启",
      body: isPaused
        ? `渠道「${source?.name ?? sourceId}」已关闭，后续自动抓取将跳过该渠道。`
        : `渠道「${source?.name ?? sourceId}」已开启，后续自动抓取会重新覆盖该渠道。`,
    };
  } finally {
    pendingSourceId.value = "";
    pendingAction.value = "";
  }
}

async function handleBulkSetChannelState(isPaused: boolean) {
  const targets = isPaused ? activeFilteredSources.value : pausedFilteredSources.value;

  if (targets.length === 0) {
    return;
  }

  bulkUpdating.value = true;
  pendingBulkAction.value = isPaused ? "pause" : "resume";
  operationMessage.value = null;

  try {
    await Promise.all(targets.map((source) => updateSourcePaused(source.id, isPaused)));
    await load();
    operationMessage.value = {
      title: isPaused ? "批量关闭完成" : "批量开启完成",
      body: isPaused
        ? `已关闭当前筛选结果中的 ${targets.length} 个渠道，后续自动抓取将不再覆盖这些渠道。`
        : `已开启当前筛选结果中的 ${targets.length} 个渠道，后续自动抓取会重新覆盖这些渠道。`,
    };
  } finally {
    bulkUpdating.value = false;
    pendingBulkAction.value = "";
  }
}

watch(workspace, (value) => {
  if (!value) {
    void router.replace("/");
  }
}, { immediate: true });

onMounted(() => {
  void load();
  void loadCatalog();
});
</script>
