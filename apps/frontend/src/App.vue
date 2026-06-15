<template>
  <div class="grid min-h-screen overflow-hidden xl:grid-cols-[300px_minmax(0,1fr)]">
    <aside class="border-b border-b-[#3a2e1c]/12 bg-white/84 p-6 backdrop-blur-md xl:sticky xl:top-0 xl:h-screen xl:self-start xl:overflow-y-auto xl:border-b-0 xl:border-r xl:border-r-slate-500/15">
      <div class="flex flex-col gap-4">
        <RouterLink to="/" class="grid gap-3 rounded-3xl border border-slate-400/15 bg-white/70 p-4 transition-colors hover:bg-white/90">
          <div class="flex items-center gap-3">
            <img
              class="h-15 w-15 shrink-0 rounded-2xl object-cover shadow-lg shadow-slate-900/10"
              :src="brandLogo"
              alt="Info Monitor logo"
            />
            <div class="min-w-0">
              <h1 class="m-0 text-[1.25rem] font-semibold text-[#1d1d1d]">Info Monitor</h1>
              <p class="m-0 text-[0.92rem] leading-6 text-ink-body">Workspace-first monitoring OS</p>
            </div>
          </div>
        </RouterLink>

        <section class="grid gap-2.5 rounded-3xl border border-slate-400/15 bg-white/70 p-4">
          <div class="flex items-center justify-between gap-3">
            <strong class="text-[0.82rem] uppercase tracking-[0.08em] text-ink-label">Workspaces</strong>
          </div>
          <RouterLink
            v-for="workspace in workspaceDefinitions"
            :key="workspace.id"
            :to="`/workspace/${workspace.id}/dashboard`"
            class="rounded-2xl border px-4 py-3 transition-colors"
            :class="workspaceLinkClass(workspace.id)"
          >
            <div class="flex items-center justify-between gap-3">
              <span class="font-semibold">{{ workspace.label }}</span>
              <span class="text-[0.78rem] uppercase tracking-[0.08em] text-ink-secondary">{{ workspace.shortLabel }}</span>
            </div>
            <div class="mt-1.5 text-[0.88rem] leading-6 text-ink-body">
              {{ workspace.summary }}
            </div>
          </RouterLink>
        </section>

        <section
          v-if="isStockMarket && stockMarketSidebarReport"
          class="grid gap-3 rounded-3xl border border-slate-400/15 bg-[linear-gradient(135deg,#11253a_0%,#17384d_50%,#215872_100%)] p-4 text-white shadow-[0_14px_32px_rgba(15,23,42,0.14)]"
        >
          <RouterLink
            :to="{ path: '/workspace/stock-market/reports', query: { focus: 'snapshot' } }"
            class="grid gap-2 rounded-2xl border p-3 transition-colors"
            :class="stockSidebarCardClass(isReportsRoute && !selectedStockReportDate)"
          >
            <div class="text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-white/66">Stock Snapshot</div>
            <div class="mt-2 text-[1.05rem] font-semibold tracking-[-0.02em] text-white">{{ stockMarketSidebarReport.headline }}</div>
            <div class="mt-2 text-[0.9rem] leading-6 text-white/74">{{ stockMarketSidebarReport.summary }}</div>
          </RouterLink>

          <div class="grid gap-2 rounded-2xl border p-3" :class="stockSidebarCardClass(activeCatalystThemeId === stockMarketSidebarReport.catalystSummary.primary[0]?.targetThemeId)">
            <div class="text-[0.78rem] uppercase tracking-[0.08em] text-white/58">主催化</div>
            <RouterLink
              v-if="stockMarketSidebarReport.catalystSummary.primary[0]?.targetThemeId"
              :to="`/workspace/stock-market/topics/${stockMarketSidebarReport.catalystSummary.primary[0]?.targetThemeId}`"
              class="text-[0.9rem] leading-6 text-white hover:underline"
            >
              {{ stockMarketSidebarReport.catalystSummary.primary[0]?.title }}
            </RouterLink>
            <div v-else class="text-[0.9rem] leading-6 text-white">
              {{ stockMarketSidebarReport.catalystSummary.primary[0]?.title ?? "暂无明显主催化" }}
            </div>
          </div>

          <RouterLink
            :to="{ path: '/workspace/stock-market/reports', query: { focus: 'sector' } }"
            class="grid gap-2 rounded-2xl border p-3 text-white transition-colors"
            :class="stockSidebarCardClass(isReportsRoute && currentStockFocus === 'sector')"
          >
            <div class="text-[0.78rem] uppercase tracking-[0.08em] text-white/58">主线板块</div>
            <div class="text-[0.9rem] leading-6 text-white">{{ stockMarketSidebarReport.sectorFocus[0] ?? "暂无明显主线板块" }}</div>
          </RouterLink>

          <RouterLink
            v-if="stockMarketSidebarReport.moverCards[0]"
            :to="{ path: '/workspace/stock-market/reports', query: { focus: 'movers' } }"
            class="grid gap-2 rounded-2xl border p-3 text-white transition-colors"
            :class="stockSidebarCardClass(isReportsRoute && !selectedStockReportDate)"
          >
            <div class="text-[0.78rem] uppercase tracking-[0.08em] text-white/58">重点异动对象</div>
            <div class="text-[0.9rem] leading-6 text-white">
              {{ stockMarketSidebarReport.moverCards[0].label }} · {{ stockMarketSidebarReport.moverCards[0].changeText }}
            </div>
          </RouterLink>

          <RouterLink
            v-if="stockMarketSidebarHistory.length > 1"
            :to="{ path: '/workspace/stock-market/reports', query: { focus: 'evolution' } }"
            class="grid gap-2 rounded-2xl border p-3 text-white transition-colors"
            :class="stockSidebarCardClass(isReportsRoute && !selectedStockReportDate)"
          >
            <div class="text-[0.78rem] uppercase tracking-[0.08em] text-white/58">连续复盘</div>
            <div class="text-[0.9rem] leading-6 text-white">
              最近 {{ stockMarketSidebarHistory.length }} 个交易日持续复盘
            </div>
          </RouterLink>

          <div class="grid gap-2">
            <div class="text-[0.78rem] uppercase tracking-[0.08em] text-white/58">最近日报</div>
            <RouterLink
              v-for="item in stockMarketSidebarHistory"
              :key="item.id"
              :to="{ path: '/workspace/stock-market/reports', query: { date: item.date } }"
              class="rounded-2xl border px-3 py-2.5 text-[0.86rem] leading-6 text-white/78 transition-colors"
              :class="stockSidebarCardClass(selectedStockReportDate === item.date)"
            >
              <div class="font-semibold text-white">{{ item.date }}</div>
              <div>{{ item.report.headline }}</div>
            </RouterLink>
          </div>
        </section>
      </div>
    </aside>

    <main class="min-h-0 overflow-y-auto overscroll-contain xl:h-screen">
      <div v-if="currentWorkspace && currentWorkspace.id !== 'stock-market'" class="sticky top-0 z-20 border-b border-slate-400/15 bg-[rgba(242,244,247,0.92)] px-6 py-4 backdrop-blur-md md:px-7">
        <div class="grid gap-3 rounded-xl border border-slate-400/15 bg-white/80 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="mt-1 text-[0.9rem] text-ink-body">
              <strong class="text-[0.82rem] uppercase tracking-[0.08em] text-ink-label">Current Module</strong>
              {{ currentWorkspace.label }}
            </div>

            <nav class="flex flex-wrap justify-end gap-2.5">
              <RouterLink
                v-for="item in workspaceNavItems"
                :key="item.to"
                :to="item.to"
                class="font-semibold transition-colors"
                :class="workspaceSubnavClass(item.to)"
              >
                {{ item.label }}
              </RouterLink>
            </nav>
          </div>
        </div>
      </div>

      <div class="p-6 md:p-7">
        <StockMarketAppShell v-if="currentWorkspace?.id === 'stock-market'" :workspace="currentWorkspace">
          <RouterView />
        </StockMarketAppShell>
        <RouterView v-else />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute } from "vue-router";

import brandLogo from "./assets/logo-128.png";
import { getWorkspaceDefinition, workspaceDefinitions } from "./lib/workspaces";
import { refreshStockMarketReportState, useStockMarketReportState } from "./lib/stock-market-report-state";
import StockMarketAppShell from "./views/workspace/components/StockMarketAppShell.vue";

const route = useRoute();

const currentWorkspace = computed(() => getWorkspaceDefinition(String(route.params.workspaceId ?? "")));
const { report: stockMarketSidebarReport, history: stockMarketSidebarHistory } = useStockMarketReportState();
const isStockMarket = computed(() => currentWorkspace.value?.id === "stock-market");
const isReportsRoute = computed(() => route.path.startsWith("/workspace/stock-market/reports"));
const selectedStockReportDate = computed(() => typeof route.query.date === "string" ? route.query.date : "");
const currentStockFocus = computed(() => typeof route.query.focus === "string" ? route.query.focus : "");
const activeCatalystThemeId = computed(() => {
  const themeId = route.params.themeId;
  return typeof themeId === "string" ? themeId : "";
});

const workspaceNavItems = computed(() => {
  if (!currentWorkspace.value) {
    return [];
  }

  const base = `/workspace/${currentWorkspace.value.id}`;
  return [
    { label: "大盘", to: `${base}/dashboard` },
    { label: "动作", to: `${base}/actions` },
    { label: "主题", to: `${base}/topics` },
    { label: "来源", to: `${base}/sources` },
    { label: "报告", to: `${base}/reports` },
  ];
});

function workspaceLinkClass(workspaceId: string) {
  return workspaceId === currentWorkspace.value?.id
    ? "border-[#2f2618]/30 bg-[#f5efe2] text-[#2f2618]"
    : "border-slate-400/15 bg-white/70 text-[#53452f] hover:bg-white/92";
}

function workspaceSubnavClass(target: string) {
  return route.path === target || route.path.startsWith(`${target}/`)
    ? "text-ink-on-dark"
    : "text-[#0099ff] hover:bg-white/92";
}

function stockSidebarCardClass(isActive: boolean) {
  return isActive
    ? "border-white/30 bg-white/18 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
    : "border-white/12 bg-white/10 hover:bg-white/16";
}

async function loadStockMarketSidebarData() {
  if (!isStockMarket.value) {
    return;
  }

  await refreshStockMarketReportState({ historyLimit: 3 });
}

function handleWindowFocus() {
  void loadStockMarketSidebarData();
}

let stockSidebarRefreshTimer: number | null = null;

function startStockSidebarRefreshLoop() {
  if (stockSidebarRefreshTimer != null || typeof window === "undefined") {
    return;
  }

  stockSidebarRefreshTimer = window.setInterval(() => {
    if (isStockMarket.value) {
      void loadStockMarketSidebarData();
    }
  }, 60_000);
}

function stopStockSidebarRefreshLoop() {
  if (stockSidebarRefreshTimer == null || typeof window === "undefined") {
    return;
  }

  window.clearInterval(stockSidebarRefreshTimer);
  stockSidebarRefreshTimer = null;
}

watch(isStockMarket, (value) => {
  void loadStockMarketSidebarData();

  if (value) {
    startStockSidebarRefreshLoop();
  } else {
    stopStockSidebarRefreshLoop();
  }
}, { immediate: true });

watch(
  () => route.fullPath,
  () => {
    if (isStockMarket.value) {
      void loadStockMarketSidebarData();
    }
  },
);

onMounted(() => {
  if (typeof window !== "undefined") {
    window.addEventListener("focus", handleWindowFocus);
  }
  void loadStockMarketSidebarData();
});

onUnmounted(() => {
  if (typeof window !== "undefined") {
    window.removeEventListener("focus", handleWindowFocus);
  }
  stopStockSidebarRefreshLoop();
});
</script>
