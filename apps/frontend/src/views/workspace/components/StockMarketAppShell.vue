<template>
  <div class="min-h-full bg-[radial-gradient(circle_at_top,#edf5fb_0%,#f7fafc_28%,#f3f5f7_100%)]">
    <header class="sticky top-0 z-30 border-b border-slate-400/15 bg-[rgba(250,252,255,0.9)] px-6 py-4 backdrop-blur-md md:px-7">
      <div class="mx-auto flex w-full max-w-[1560px] flex-col gap-4">
        <section class="grid gap-3 rounded-[22px] border border-slate-400/15 bg-white/84 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)] lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <div class="text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-[#54708c]">Current Stock View</div>
            <div class="mt-1 text-[1.05rem] font-semibold tracking-[-0.02em] text-[#172536]">{{ currentSection.label }}</div>
            <div class="mt-1 text-[0.92rem] leading-6 text-[#526273]">{{ currentSection.description }}</div>
          </div>
          <nav class="flex flex-wrap items-start gap-2">
            <RouterLink
              v-for="item in sectionNavItems"
              :key="item.to"
              :to="item.to"
              class="rounded-full px-3.5 py-2 text-[0.88rem] font-semibold transition-colors"
              :class="sectionNavClass(item.to)"
            >
              {{ item.label }}
            </RouterLink>
          </nav>
        </section>
      </div>
    </header>

    <div class="mx-auto w-full max-w-[1560px] px-6 py-6 md:px-7">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

import type { WorkspaceDefinition } from "../../../lib/workspaces";

defineProps<{
  workspace: WorkspaceDefinition;
}>();

const route = useRoute();
const currentWorkspaceId = computed(() => String(route.params.workspaceId ?? "stock-market"));
const sectionNavItems = computed(() => {
  const base = `/workspace/${currentWorkspaceId.value}`;
  return [
    { label: "大盘", to: `${base}/dashboard` },
    { label: "动作", to: `${base}/actions` },
    { label: "主题", to: `${base}/topics` },
    { label: "来源", to: `${base}/sources` },
    { label: "报告", to: `${base}/reports` },
  ];
});
const currentSection = computed(() => {
  const path = route.path;

  if (path.includes("/actions")) {
    return {
      label: "盘后调查动作台",
      description: "优先处理重点异动、持续跟踪对象和需要快速判断的股市事件。",
    };
  }

  if (path.includes("/topics")) {
    return {
      label: "市场总览、公告与异动主题",
      description: "按市场总览、公告线索和异动调查组织股市主题，便于从报告直接进入调查对象。",
    };
  }

  if (path.includes("/sources")) {
    return {
      label: "股市来源与渠道控制台",
      description: "统一查看行情、公告、龙虎榜等股市来源状态，决定哪些渠道继续参与盘后分析。",
    };
  }

  if (path.includes("/reports")) {
    return {
      label: "盘后复盘中心",
      description: "查看收盘概览、催化归并、时间线复盘和连续复盘，形成每天的市场故事。",
    };
  }

  return {
    label: "市场总览与复盘入口",
    description: "从这里进入盘后报告、调查动作和主题资产，快速建立当天的股市判断。",
  };
});

function sectionNavClass(target: string) {
  return route.path === target || route.path.startsWith(`${target}/`)
    ? "bg-[#143149] text-white"
    : "bg-slate-100 text-slate-700 hover:bg-slate-200";
}
</script>
