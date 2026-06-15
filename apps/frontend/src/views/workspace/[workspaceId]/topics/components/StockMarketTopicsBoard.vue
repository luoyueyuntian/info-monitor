<template>
  <div v-if="workspace" class="page">
    <section class="mb-5 rounded-[28px] border border-slate-400/15 bg-[linear-gradient(135deg,#13253a_0%,#173a4d_50%,#225a75_100%)] px-6 py-6 text-white shadow-[0_22px_50px_rgba(15,23,42,0.22)]">
      <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div class="grid gap-3">
          <div class="inline-flex w-fit items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-white/82">
            股市专用主题台
          </div>
          <div>
            <div class="text-[0.84rem] uppercase tracking-[0.12em] text-white/58">{{ workspace.shortLabel }}</div>
            <h2 class="m-0 text-[2rem] font-semibold tracking-[-0.03em] text-white">市场总览、公告与异动主题</h2>
          </div>
          <p class="m-0 max-w-[58rem] text-[0.98rem] leading-7 text-white/72">
            按市场总览、公告线索和异动调查三条路径组织股市主题，方便你从盘后报告直接进入对应调查对象。
          </p>
        </div>

        <div class="grid gap-3 sm:grid-cols-3">
          <div class="rounded-2xl border border-white/12 bg-white/10 px-4 py-3">
            <div class="text-[0.76rem] uppercase tracking-[0.1em] text-white/58">核心主题</div>
            <div class="mt-2 text-[1.15rem] font-semibold text-white">{{ overviewThemes.length }}</div>
          </div>
          <div class="rounded-2xl border border-white/12 bg-white/10 px-4 py-3">
            <div class="text-[0.76rem] uppercase tracking-[0.1em] text-white/58">公告主题</div>
            <div class="mt-2 text-[1.15rem] font-semibold text-white">{{ announcementThemes.length }}</div>
          </div>
          <div class="rounded-2xl border border-white/12 bg-white/10 px-4 py-3">
            <div class="text-[0.76rem] uppercase tracking-[0.1em] text-white/58">异动调查</div>
            <div class="mt-2 text-[1.15rem] font-semibold text-white">{{ investigationThemes.length }}</div>
          </div>
        </div>
      </div>
    </section>

    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <article class="card" v-for="metric in metrics" :key="metric.label">
        <div class="text-[0.82rem] uppercase tracking-[0.08em] text-ink-label">{{ metric.label }}</div>
        <div class="mt-3 text-[1.6rem] font-semibold text-ink-heading">{{ metric.value }}</div>
        <div class="mt-2 text-[0.9rem] leading-6 text-ink-body">{{ metric.description }}</div>
      </article>
    </section>

    <section class="grid gap-4 xl:grid-cols-3">
      <article class="card">
        <div class="card-topline">
          <h3>市场总览主题</h3>
          <span class="text-[0.88rem] text-ink-secondary">{{ overviewThemes.length }} 个</span>
        </div>
        <div class="grid gap-3">
          <RouterLink
            v-for="theme in overviewThemes"
            :key="theme.id"
            :to="`/workspace/${workspace.id}/topics/${theme.id}`"
            class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-4 transition-colors hover:bg-white"
          >
            <div class="flex items-center gap-2">
              <span :class="pillToneClass(workspaceTopicHealthTone(theme))">{{ themeTypeLabel(theme.type) }}</span>
              <span :class="pillToneClass(theme.sourceHealth)">{{ sourceHealthLabel(theme.sourceHealth) }}</span>
            </div>
            <div class="mt-3 font-semibold text-ink-heading">{{ theme.name }}</div>
            <div class="mt-2 text-[0.9rem] leading-6 text-ink-body">{{ theme.latestInsight || "暂无最新摘要" }}</div>
          </RouterLink>
          <div v-if="!overviewThemes.length" class="rounded-2xl bg-slate-50/90 px-4 py-4 text-ink-body">当前没有市场总览类主题。</div>
        </div>
      </article>

      <article class="card">
        <div class="card-topline">
          <h3>公告与线索主题</h3>
          <span class="text-[0.88rem] text-ink-secondary">{{ announcementThemes.length }} 个</span>
        </div>
        <div class="grid gap-3">
          <RouterLink
            v-for="theme in announcementThemes"
            :key="theme.id"
            :to="`/workspace/${workspace.id}/topics/${theme.id}`"
            class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-4 transition-colors hover:bg-white"
          >
            <div class="flex items-center gap-2">
              <span :class="pillToneClass(workspaceTopicHealthTone(theme))">{{ themeTypeLabel(theme.type) }}</span>
              <span :class="pillToneClass(theme.sourceHealth)">{{ sourceHealthLabel(theme.sourceHealth) }}</span>
            </div>
            <div class="mt-3 font-semibold text-ink-heading">{{ theme.name }}</div>
            <div class="mt-2 text-[0.9rem] leading-6 text-ink-body">{{ theme.latestInsight || "暂无最新摘要" }}</div>
          </RouterLink>
          <div v-if="!announcementThemes.length" class="rounded-2xl bg-slate-50/90 px-4 py-4 text-ink-body">当前没有公告或线索类主题。</div>
        </div>
      </article>

      <article class="card">
        <div class="card-topline">
          <h3>异动调查主题</h3>
          <span class="text-[0.88rem] text-ink-secondary">{{ investigationThemes.length }} 个</span>
        </div>
        <div class="grid gap-3">
          <RouterLink
            v-for="theme in investigationThemes"
            :key="theme.id"
            :to="`/workspace/${workspace.id}/topics/${theme.id}`"
            class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-4 transition-colors hover:bg-white"
          >
            <div class="flex items-center gap-2">
              <span :class="pillToneClass(workspaceTopicHealthTone(theme))">{{ themeTypeLabel(theme.type) }}</span>
              <span :class="pillToneClass(theme.sourceHealth)">{{ sourceHealthLabel(theme.sourceHealth) }}</span>
            </div>
            <div class="mt-3 font-semibold text-ink-heading">{{ theme.name }}</div>
            <div class="mt-2 text-[0.9rem] leading-6 text-ink-body">{{ theme.latestInsight || "暂无最新摘要" }}</div>
          </RouterLink>
          <div v-if="!investigationThemes.length" class="rounded-2xl bg-slate-50/90 px-4 py-4 text-ink-body">当前没有异动调查类主题。</div>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  pillToneClass,
  sourceHealthLabel,
  themeTypeLabel,
} from "../../../../../lib/presentation";
import {
  workspaceTopicHealthTone,
  type WorkspaceId,
} from "../../../../../lib/workspaces";
import { useWorkspaceData } from "../../../shared/useWorkspaceData";

const route = useRoute();
const router = useRouter();
const workspaceId = computed(() => String(route.params.workspaceId ?? "") as WorkspaceId);
const { workspace, dataset, load } = useWorkspaceData(workspaceId);

const overviewThemes = computed(() => dataset.value.themes.filter((theme) => {
  const text = `${theme.name} ${theme.latestInsight ?? ""}`.toLowerCase();
  return text.includes("市场概览") || text.includes("收盘") || theme.id === "theme-cn-hk-market-overview";
}));

const announcementThemes = computed(() => dataset.value.themes.filter((theme) => {
  const text = `${theme.name} ${theme.latestInsight ?? ""}`.toLowerCase();
  return text.includes("公告") || text.includes("上交所") || text.includes("深交所") || text.includes("港交所");
}));

const investigationThemes = computed(() => dataset.value.themes.filter((theme) => {
  if (overviewThemes.value.some((item) => item.id === theme.id)) {
    return false;
  }

  if (announcementThemes.value.some((item) => item.id === theme.id)) {
    return false;
  }

  return true;
}));

const metrics = computed(() => [
  { label: "总主题数", value: dataset.value.themes.length, description: "当前股市工作区已纳入的全部主题" },
  { label: "总览主题", value: overviewThemes.value.length, description: "市场总览和收盘复盘入口" },
  { label: "公告主题", value: announcementThemes.value.length, description: "交易所公告和事件线索主题" },
  { label: "调查主题", value: investigationThemes.value.length, description: "围绕异动和个股调查的补充主题" },
]);

watch(workspace, (value) => {
  if (!value) {
    void router.replace("/");
  }
}, { immediate: true });

onMounted(() => void load());
</script>
