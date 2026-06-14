<template>
  <div v-if="workspace" class="page">
    <WorkspacePageHeader
      :workspace="workspace"
      title="工作区报告"
      description="日报、周报和复盘摘要都只聚焦当前工作区，避免跨工作区信息互相污染。"
    />

    <section class="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.9fr)]">
      <article class="card">
        <div class="card-topline">
          <h3>今日摘要</h3>
          <span class="text-[0.88rem] text-ink-secondary">{{ formatSmartDateTimeLabel(summary.updatedAt, referenceNow) }}</span>
        </div>
        <div class="grid gap-4">
          <div class="rounded-2xl bg-slate-50/90 px-4 py-4 text-[0.95rem] leading-7 text-ink-body">
            {{ dailyNarrative }}
          </div>
          <div class="grid gap-3 md:grid-cols-2">
            <div class="rounded-2xl border border-slate-400/15 bg-white/70 px-4 py-4">
              <strong class="block text-ink-heading">今日重点</strong>
              <ul class="mt-3 grid gap-2 pl-5 text-[0.92rem] leading-6 text-ink-body">
                <li v-for="item in majorBullets" :key="item">{{ item }}</li>
              </ul>
            </div>
            <div class="rounded-2xl border border-slate-400/15 bg-white/70 px-4 py-4">
              <strong class="block text-ink-heading">下一步建议</strong>
              <ul class="mt-3 grid gap-2 pl-5 text-[0.92rem] leading-6 text-ink-body">
                <li v-for="item in actionBullets" :key="item">{{ item }}</li>
              </ul>
            </div>
          </div>
        </div>
      </article>

      <aside class="grid gap-4">
        <article class="card">
          <div class="card-topline">
            <h3>周度脉络</h3>
            <span class="text-[0.88rem] text-ink-secondary">按当前样本推导</span>
          </div>
          <div class="text-[0.95rem] leading-7 text-ink-body">{{ weeklyNarrative }}</div>
        </article>

        <article class="card">
          <div class="card-topline">
            <h3>来源与覆盖</h3>
            <span class="text-[0.88rem] text-ink-secondary">工作区可信度概览</span>
          </div>
          <div class="grid gap-3">
            <div class="rounded-2xl bg-slate-50/90 px-4 py-4">
              <div class="text-[0.8rem] uppercase tracking-[0.08em] text-ink-label">来源总数</div>
              <div class="mt-2 text-[1.35rem] font-semibold text-ink-heading">{{ dataset.sources.length }}</div>
            </div>
            <div class="rounded-2xl bg-slate-50/90 px-4 py-4">
              <div class="text-[0.8rem] uppercase tracking-[0.08em] text-ink-label">异常来源</div>
              <div class="mt-2 text-[1.35rem] font-semibold text-ink-heading">{{ summary.warningSources }}</div>
            </div>
            <div class="text-[0.92rem] leading-6 text-ink-body">
              {{ coverageNarrative }}
            </div>
          </div>
        </article>
      </aside>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { formatSmartDateTimeLabel } from "../../../../../lib/presentation";
import { buildWorkspaceSummary, sortWorkspaceEvents, type WorkspaceId } from "../../../../../lib/workspaces";
import WorkspacePageHeader from "../../../components/WorkspacePageHeader.vue";
import { useWorkspaceData } from "../../../shared/useWorkspaceData";

const route = useRoute();
const router = useRouter();
const workspaceId = computed(() => String(route.params.workspaceId ?? "") as WorkspaceId);
const { workspace, dataset, referenceNow, load } = useWorkspaceData(workspaceId);

const summary = computed(() => buildWorkspaceSummary(dataset.value));
const sortedEvents = computed(() => sortWorkspaceEvents(dataset.value.events));

const dailyNarrative = computed(() => {
  return `${workspace.value?.label ?? "当前工作区"} 今日共新增 ${summary.value.newMessages} 条消息，出现 ${summary.value.majorEvents} 条重大事件，当前仍有 ${summary.value.openActions} 条待处理动作。你可以先从动作页清理待判断事件，再回到主题页沉淀结论。`;
});

const weeklyNarrative = computed(() => {
  if (!dataset.value.events.length) {
    return "当前样本不足，还无法形成稳定的周度节奏判断。";
  }

  return `${workspace.value?.label ?? "当前工作区"} 在当前样本中共有 ${dataset.value.events.length} 条事件、${dataset.value.themes.length} 个主题和 ${dataset.value.sources.length} 个来源。最近的变化集中在 ${sortedEvents.value.slice(0, 2).map((event) => event.themeName).join("、") || "暂无主题"}，适合继续围绕这些主题做下一轮复盘。`;
});

const majorBullets = computed(() => {
  if (!sortedEvents.value.length) {
    return ["当前没有可供总结的事件。"];
  }

  return sortedEvents.value.slice(0, 3).map((event) => `${event.themeName}：${event.title}`);
});

const actionBullets = computed(() => {
  const bullets = [];

  if (summary.value.openActions > 0) {
    bullets.push(`优先处理 ${summary.value.openActions} 条待判断动作，避免高优先级事件滞留。`);
  }

  if (summary.value.warningSources > 0) {
    bullets.push(`排查 ${summary.value.warningSources} 个异常来源，先保证当前工作区判断可信。`);
  }

  if (dataset.value.themes.some((theme) => theme.status === "paused")) {
    bullets.push("检查已暂停主题是否仍然值得继续监控。");
  }

  if (!bullets.length) {
    bullets.push("当前工作区状态平稳，可以把精力放在趋势复盘和主题笔记上。");
  }

  return bullets;
});

const coverageNarrative = computed(() => {
  if (!dataset.value.sources.length) {
    return "当前工作区还没有接入来源。";
  }

  if (summary.value.warningSources > 0) {
    return "来源覆盖已经建立，但存在异常节点。建议先修复异常来源，再把工作区内的主题判断沉淀为长期结论。";
  }

  return "来源整体稳定，可以把更多精力放在判断、复盘和行动节奏上。";
});

watch(workspace, (value) => {
  if (!value) {
    void router.replace("/");
  }
}, { immediate: true });

onMounted(() => void load());
</script>
