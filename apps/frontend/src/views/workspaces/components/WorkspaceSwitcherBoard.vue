<template>
  <section class="page">
    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <article class="card">
        <div class="text-[0.82rem] uppercase tracking-[0.08em] text-ink-label">全局视角</div>
        <div class="mt-3 text-[1.7rem] font-semibold text-ink-heading">{{ overallSummary.newMessages }}</div>
        <div class="mt-2 text-[0.92rem] leading-6 text-ink-body">工作区内的新增消息总数</div>
      </article>
      <article class="card">
        <div class="text-[0.82rem] uppercase tracking-[0.08em] text-ink-label">重大事件</div>
        <div class="mt-3 text-[1.7rem] font-semibold text-ink-heading">{{ overallSummary.majorEvents }}</div>
        <div class="mt-2 text-[0.92rem] leading-6 text-ink-body">需要立即进入对应工作区判断的高优先级变化</div>
      </article>
      <article class="card">
        <div class="text-[0.82rem] uppercase tracking-[0.08em] text-ink-label">待处理</div>
        <div class="mt-3 text-[1.7rem] font-semibold text-ink-heading">{{ overallSummary.openActions }}</div>
        <div class="mt-2 text-[0.92rem] leading-6 text-ink-body">还未完成首轮判断或仍未读的动作项</div>
      </article>
      <article class="card">
        <div class="text-[0.82rem] uppercase tracking-[0.08em] text-ink-label">异常来源</div>
        <div class="mt-3 text-[1.7rem] font-semibold text-ink-heading">{{ overallSummary.warningSources }}</div>
        <div class="mt-2 text-[0.92rem] leading-6 text-ink-body">优先排查，避免工作区结论被异常数据误导</div>
      </article>
      <article class="card">
        <div class="text-[0.82rem] uppercase tracking-[0.08em] text-ink-label">最近更新</div>
        <div class="mt-3 text-[1.15rem] font-semibold text-ink-heading">{{ formatSmartDateTimeLabel(overallSummary.updatedAt, referenceNow) }}</div>
        <div class="mt-2 text-[0.92rem] leading-6 text-ink-body">以当前工作区数据中的最新时间为基准</div>
      </article>
    </section>

    <section class="grid gap-4 xl:grid-cols-4">
      <RouterLink
        v-for="workspace in workspaceCards"
        :key="workspace.definition.id"
        :to="`/workspace/${workspace.definition.id}/dashboard`"
        class="grid gap-4 rounded-[24px] border border-slate-400/15 bg-white/82 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] transition-transform duration-150 hover:-translate-y-0.5 hover:bg-white"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="text-[0.82rem] uppercase tracking-[0.08em] text-ink-label">{{ workspace.definition.shortLabel }}</div>
            <h3 class="mt-2 text-[1.28rem] font-semibold text-ink-heading">{{ workspace.definition.label }}</h3>
          </div>
          <span :class="pillToneClass(workspaceStatusTone(workspace.summary.status))">
            {{ workspaceStatusLabel(workspace.summary.status) }}
          </span>
        </div>

        <p class="m-0 leading-7 text-ink-body">{{ workspace.definition.description }}</p>

        <div class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-2xl bg-slate-50/90 px-4 py-3">
            <div class="text-[0.8rem] uppercase tracking-[0.08em] text-ink-label">新增消息</div>
            <div class="mt-2 text-[1.4rem] font-semibold text-ink-heading">{{ workspace.summary.newMessages }}</div>
          </div>
          <div class="rounded-2xl bg-slate-50/90 px-4 py-3">
            <div class="text-[0.8rem] uppercase tracking-[0.08em] text-ink-label">重大事件</div>
            <div class="mt-2 text-[1.4rem] font-semibold text-ink-heading">{{ workspace.summary.majorEvents }}</div>
          </div>
          <div class="rounded-2xl bg-slate-50/90 px-4 py-3">
            <div class="text-[0.8rem] uppercase tracking-[0.08em] text-ink-label">待处理动作</div>
            <div class="mt-2 text-[1.4rem] font-semibold text-ink-heading">{{ workspace.summary.openActions }}</div>
          </div>
          <div class="rounded-2xl bg-slate-50/90 px-4 py-3">
            <div class="text-[0.8rem] uppercase tracking-[0.08em] text-ink-label">异常来源</div>
            <div class="mt-2 text-[1.4rem] font-semibold text-ink-heading">{{ workspace.summary.warningSources }}</div>
          </div>
        </div>

        <div class="grid gap-3 rounded-2xl border border-slate-400/15 bg-slate-50/80 px-4 py-4">
          <div class="flex items-center justify-between gap-3">
            <strong class="text-ink-heading">今日重点</strong>
            <span class="text-[0.88rem] text-ink-secondary">最近更新 {{ formatSmartDateTimeLabel(workspace.summary.updatedAt, referenceNow) }}</span>
          </div>
          <ul v-if="workspace.topEvents.length" class="m-0 grid gap-2 pl-5 text-[0.92rem] leading-6 text-ink-body">
            <li v-for="event in workspace.topEvents" :key="event.id">
              {{ event.title }}
            </li>
          </ul>
          <p v-else class="m-0 text-[0.92rem] leading-6 text-ink-body">当前没有需要立即处理的重点事件，可以直接进入工作区查看完整上下文。</p>
        </div>

        <div class="inline-flex items-center gap-2 text-[0.92rem] font-semibold text-ink-link">
          进入工作区
          <span aria-hidden="true">›</span>
        </div>
      </RouterLink>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import { fetchEvents, fetchSourceStatuses, fetchThemes, type EventSummary, type SourceStatus, type ThemeSummary } from "../../../lib/api";
import { formatSmartDateTimeLabel, pillToneClass } from "../../../lib/presentation";
import {
  buildWorkspaceDataset,
  buildWorkspaceSummary,
  sortWorkspaceEvents,
  workspaceDefinitions,
  workspaceReferenceNow,
  workspaceStatusLabel,
  workspaceStatusTone,
} from "../../../lib/workspaces";

const themes = ref<ThemeSummary[]>([]);
const events = ref<EventSummary[]>([]);
const sources = ref<SourceStatus[]>([]);

const referenceNow = computed(() => workspaceReferenceNow({ themes: themes.value, events: events.value, sources: sources.value }));

const workspaceCards = computed(() => workspaceDefinitions.map((definition) => {
  const dataset = buildWorkspaceDataset(definition.id, themes.value, events.value, sources.value);
  return {
    definition,
    summary: buildWorkspaceSummary(dataset),
    topEvents: sortWorkspaceEvents(dataset.events).slice(0, 3),
  };
}));

const overallSummary = computed(() => {
  return workspaceCards.value.reduce(
    (accumulator, workspace) => ({
      newMessages: accumulator.newMessages + workspace.summary.newMessages,
      majorEvents: accumulator.majorEvents + workspace.summary.majorEvents,
      openActions: accumulator.openActions + workspace.summary.openActions,
      warningSources: accumulator.warningSources + workspace.summary.warningSources,
      updatedAt: [accumulator.updatedAt, workspace.summary.updatedAt]
        .filter((value): value is string => typeof value === "string")
        .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null,
    }),
    {
      newMessages: 0,
      majorEvents: 0,
      openActions: 0,
      warningSources: 0,
      updatedAt: null as string | null,
    },
  );
});

async function loadWorkspaceIndex() {
  const [nextThemes, nextEvents, nextSources] = await Promise.all([
    fetchThemes(),
    fetchEvents(),
    fetchSourceStatuses(),
  ]);

  themes.value = nextThemes;
  events.value = nextEvents;
  sources.value = nextSources;
}

onMounted(() => void loadWorkspaceIndex());
</script>
