<template>
  <section class="page">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1>周度回顾</h1>
        <p class="text-[0.92rem] text-ink-secondary">浏览历史周度总结，跟踪趋势变化</p>
      </div>
      <div class="flex items-center gap-2">
        <select
          v-model="weeksToLoad"
          class="rounded-lg border border-border bg-white px-3 py-2 text-[0.88rem]"
          @change="loadHistory"
        >
          <option :value="4">最近 4 周</option>
          <option :value="8">最近 8 周</option>
          <option :value="12">最近 12 周</option>
        </select>
        <button
          class="inline-flex items-center justify-center rounded-xl border border-border bg-white px-3 py-2 text-[0.88rem] transition-colors hover:bg-slate-50"
          :disabled="loading"
          @click="loadHistory"
        >
          {{ loading ? "加载中..." : "刷新" }}
        </button>
      </div>
    </div>

    <div v-if="loading && weeks.length === 0" class="text-ink-secondary">加载中...</div>

    <div v-else-if="weeks.length === 0" class="rounded-2xl border border-dashed border-slate-400/30 p-8 text-center text-ink-secondary">
      暂无周度回顾数据
    </div>

    <div v-else class="grid gap-4">
      <article
        v-for="(week, index) in weeks"
        :key="week.weekStart"
        class="card"
      >
        <div class="card-topline">
          <h3>{{ weekLabel(week) }}</h3>
          <div class="flex items-center gap-2">
            <span v-if="week.weekOverWeekDelta" :class="deltaTrendClass(week.weekOverWeekDelta.trend)">
              {{ deltaTrendLabel(week.weekOverWeekDelta) }}
            </span>
            <button
              class="text-[0.82rem] text-ink-link hover:underline"
              @click="toggleExpanded(index)"
            >
              {{ expandedIndex === index ? "收起" : "展开" }}
            </button>
          </div>
        </div>

        <!-- Summary Grid -->
        <div class="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div class="rounded-xl bg-slate-50 px-3 py-2.5 text-center">
            <div class="text-xs text-gray-500">总事件</div>
            <div class="text-lg font-semibold">{{ week.totalEvents }}</div>
          </div>
          <div class="rounded-xl bg-slate-50 px-3 py-2.5 text-center">
            <div class="text-xs text-gray-500">本周新增</div>
            <div class="text-lg font-semibold">{{ week.recentEvents }}</div>
          </div>
          <div class="rounded-xl bg-slate-50 px-3 py-2.5 text-center">
            <div class="text-xs text-gray-500">异常来源</div>
            <div class="text-lg font-semibold" :class="week.warningSources.length > 0 ? 'text-amber-600' : ''">
              {{ week.warningSources.length }}
            </div>
          </div>
          <div class="rounded-xl bg-slate-50 px-3 py-2.5 text-center">
            <div class="text-xs text-gray-500">主要类别</div>
            <div class="text-sm font-semibold">{{ week.dominantCategory?.label ?? "--" }}</div>
          </div>
        </div>

        <!-- Category Breakdown -->
        <div class="mb-4">
          <h4 class="mb-2 text-[0.88rem] font-semibold text-slate-700">类别分布</h4>
          <div class="grid gap-2">
            <div
              v-for="item in week.items"
              :key="item.category"
              class="flex items-center gap-3 rounded-lg bg-white/70 px-3 py-2"
            >
              <span class="min-w-[6rem] text-[0.84rem] font-medium">{{ item.label }}</span>
              <div class="flex-1">
                <div class="h-2 rounded-full bg-slate-100">
                  <div
                    class="h-2 rounded-full bg-blue-500"
                    :style="{ width: `${categoryPercentage(week, item)}%` }"
                  ></div>
                </div>
              </div>
              <span class="text-[0.82rem] text-slate-600">{{ item.recentCount }} 新增</span>
            </div>
          </div>
        </div>

        <!-- Expanded Details -->
        <div v-if="expandedIndex === index">
          <!-- Direction Breakdown -->
          <div v-if="week.directionBreakdown" class="mb-4">
            <h4 class="mb-2 text-[0.88rem] font-semibold text-slate-700">方向分布</h4>
            <div class="flex flex-wrap gap-3">
              <span class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[0.84rem] text-emerald-700">
                看多 {{ week.directionBreakdown.bullish }}
              </span>
              <span class="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-[0.84rem] text-rose-700">
                看空 {{ week.directionBreakdown.bearish }}
              </span>
              <span class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[0.84rem] text-slate-600">
                中性 {{ week.directionBreakdown.neutral }}
              </span>
            </div>
          </div>

          <!-- Warning Sources -->
          <div v-if="week.warningSources.length > 0" class="mb-4">
            <h4 class="mb-2 text-[0.88rem] font-semibold text-amber-700">异常来源</h4>
            <div class="grid gap-2">
              <div
                v-for="source in week.warningSources"
                :key="source.id"
                class="rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2"
              >
                <div class="flex items-center gap-2">
                  <span class="font-medium text-[0.84rem]">{{ source.name }}</span>
                  <span class="text-[0.78rem] text-slate-500">{{ source.themeName }}</span>
                </div>
                <div v-if="source.lastErrorMessage" class="mt-1 text-[0.82rem] text-amber-700">
                  {{ source.lastErrorMessage }}
                </div>
              </div>
            </div>
          </div>

          <!-- Top Changes -->
          <div v-if="week.topChanges && week.topChanges.length > 0" class="mb-4">
            <h4 class="mb-2 text-[0.88rem] font-semibold text-slate-700">主要变化</h4>
            <ul class="m-0 pl-4">
              <li v-for="change in week.topChanges" :key="change" class="text-[0.84rem] text-slate-600">
                {{ change }}
              </li>
            </ul>
          </div>

          <!-- Top Themes to Follow -->
          <div v-if="week.topThemesToFollow && week.topThemesToFollow.length > 0" class="mb-4">
            <h4 class="mb-2 text-[0.88rem] font-semibold text-slate-700">重点关注主题</h4>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="theme in week.topThemesToFollow"
                :key="theme"
                class="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-[0.84rem] text-blue-700"
              >
                {{ theme }}
              </span>
            </div>
          </div>

          <!-- Daily Trend -->
          <div class="mb-4">
            <h4 class="mb-2 text-[0.88rem] font-semibold text-slate-700">每日趋势</h4>
            <div class="flex items-end gap-1">
              <div
                v-for="(day, dayIndex) in week.dayLabels"
                :key="day"
                class="flex flex-1 flex-col items-center"
              >
                <div
                  class="w-full rounded-t bg-blue-400"
                  :style="{ height: `${trendBarHeight(week, dayIndex)}px` }"
                ></div>
                <span class="mt-1 text-[0.7rem] text-slate-500">{{ dayLabel(day) }}</span>
              </div>
            </div>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";

type WeeklySummary = {
  generatedAt: string;
  weekStart: string;
  weekEnd: string;
  totalEvents: number;
  recentEvents: number;
  items: Array<{
    category: string;
    label: string;
    count: number;
    recentCount: number;
    dailyTrend: number[];
  }>;
  warningSources: Array<{
    id: string;
    name: string;
    themeName: string;
    status: string;
    lastErrorMessage: string | null;
  }>;
  directionBreakdown?: {
    bullish: number;
    bearish: number;
    neutral: number;
  };
  dayLabels: string[];
  dominantCategory?: {
    category: string;
    label: string;
    percentage: number;
  };
  weekOverWeekDelta?: {
    totalEventsDelta: number;
    recentEventsDelta: number;
    trend: "up" | "down" | "flat";
  };
  topChanges?: string[];
  topThemesToFollow?: string[];
};

const weeks = ref<WeeklySummary[]>([]);
const loading = ref(false);
const weeksToLoad = ref(4);
const expandedIndex = ref<number | null>(null);

async function loadHistory() {
  loading.value = true;
  try {
    const response = await fetch(`/api/weekly-summary/history?weeks=${weeksToLoad.value}`);
    if (response.ok) {
      weeks.value = await response.json();
    }
  } finally {
    loading.value = false;
  }
}

function toggleExpanded(index: number) {
  expandedIndex.value = expandedIndex.value === index ? null : index;
}

function weekLabel(week: WeeklySummary): string {
  try {
    const start = new Date(week.weekStart);
    const end = new Date(week.weekEnd);
    return `${start.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" })} - ${end.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" })}`;
  } catch {
    return `${week.weekStart} - ${week.weekEnd}`;
  }
}

function dayLabel(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("zh-CN", { weekday: "narrow" });
  } catch {
    return dateStr.slice(-2);
  }
}

function categoryPercentage(week: WeeklySummary, item: WeeklySummary["items"][number]): number {
  const total = week.items.reduce((sum, i) => sum + i.recentCount, 0);
  return total > 0 ? (item.recentCount / total) * 100 : 0;
}

function trendBarHeight(week: WeeklySummary, dayIndex: number): number {
  const trend = week.items[0]?.dailyTrend ?? [];
  const value = trend[dayIndex] ?? 0;
  const max = Math.max(...trend, 1);
  return Math.max(4, (value / max) * 60);
}

function deltaTrendClass(trend: "up" | "down" | "flat"): string {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-[0.78rem] font-semibold";
  switch (trend) {
    case "up": return `${base} bg-emerald-100 text-emerald-700`;
    case "down": return `${base} bg-rose-100 text-rose-700`;
    default: return `${base} bg-slate-100 text-slate-600`;
  }
}

function deltaTrendLabel(delta: { totalEventsDelta: number; recentEventsDelta: number; trend: "up" | "down" | "flat" }): string {
  const sign = delta.recentEventsDelta > 0 ? "+" : "";
  return `${sign}${delta.recentEventsDelta} 本周`;
}

onMounted(() => loadHistory());
</script>
