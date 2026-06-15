<template>
  <div v-if="workspace" class="page">
    <section class="mb-5 rounded-[28px] border border-slate-400/15 bg-[linear-gradient(135deg,#0f2031_0%,#16384c_52%,#23506b_100%)] px-6 py-6 text-white shadow-[0_22px_50px_rgba(15,23,42,0.22)]">
      <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div class="grid gap-3">
          <div class="inline-flex w-fit items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-white/82">
            股市专用大盘
          </div>
          <div>
            <div class="text-[0.84rem] uppercase tracking-[0.12em] text-white/58">{{ workspace.shortLabel }}</div>
            <h2 class="m-0 text-[2rem] font-semibold tracking-[-0.03em] text-white">市场总览与复盘入口</h2>
          </div>
          <p class="m-0 max-w-[58rem] text-[0.98rem] leading-7 text-white/72">
            优先聚焦当天盘后状态、重点异动对象和连续复盘判断，把报告、动作和主题调查整合成一套股市专用交互。
          </p>
        </div>

        <div class="grid gap-3 sm:grid-cols-3">
          <div class="rounded-2xl border border-white/12 bg-white/10 px-4 py-3">
            <div class="text-[0.76rem] uppercase tracking-[0.1em] text-white/58">重大事件</div>
            <div class="mt-2 text-[1.15rem] font-semibold text-white">{{ summary.majorEvents }}</div>
          </div>
          <div class="rounded-2xl border border-white/12 bg-white/10 px-4 py-3">
            <div class="text-[0.76rem] uppercase tracking-[0.1em] text-white/58">待处理动作</div>
            <div class="mt-2 text-[1.15rem] font-semibold text-white">{{ summary.openActions }}</div>
          </div>
          <div class="rounded-2xl border border-white/12 bg-white/10 px-4 py-3">
            <div class="text-[0.76rem] uppercase tracking-[0.1em] text-white/58">异常来源</div>
            <div class="mt-2 text-[1.15rem] font-semibold text-white">{{ summary.warningSources }}</div>
          </div>
        </div>
      </div>
    </section>

    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <article class="card" v-for="metric in metrics" :key="metric.label">
        <div class="text-[0.82rem] uppercase tracking-[0.08em] text-ink-label">{{ metric.label }}</div>
        <div class="mt-3 text-[1.7rem] font-semibold text-ink-heading">{{ metric.value }}</div>
        <div class="mt-2 text-[0.92rem] leading-6 text-ink-body">{{ metric.description }}</div>
      </article>
    </section>

    <div class="grid items-start gap-4 xl:grid-cols-[minmax(0,1.48fr)_minmax(340px,0.9fr)]">
      <section class="grid gap-4">
        <article class="card">
          <div class="card-topline">
            <h3>盘后复盘入口</h3>
            <span class="text-[0.88rem] text-ink-secondary">优先看已保存日报和连续复盘</span>
          </div>
          <div class="grid gap-3">
            <RouterLink
              :to="`/workspace/${workspace.id}/reports`"
              class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-4 transition-colors hover:bg-white"
            >
              <div class="font-semibold text-ink-heading">进入盘后报告</div>
              <div class="mt-2 text-[0.92rem] leading-6 text-ink-body">
                查看收盘概览、催化归并、时间线复盘、连续复盘和重点异动对象。
              </div>
            </RouterLink>
            <div class="rounded-2xl border border-slate-400/15 bg-white/80 px-4 py-4">
              <div class="font-semibold text-ink-heading">当前判断</div>
              <div class="mt-2 text-[0.92rem] leading-6 text-ink-body">
                {{ dashboardNarrative }}
              </div>
            </div>
          </div>
        </article>

        <article class="card">
          <div class="card-topline">
            <h3>重点异动动作</h3>
            <span class="text-[0.88rem] text-ink-secondary">优先处理股市相关待判断事件</span>
          </div>
          <div v-if="actionEvents.length" class="grid gap-3">
            <div
              v-for="event in actionEvents"
              :key="event.id"
              class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-4"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div class="font-semibold text-ink-heading">{{ event.title }}</div>
                  <div class="mt-1 text-[0.88rem] text-ink-secondary">{{ event.themeName }} · {{ formatSmartDateTimeLabel(event.occurredAt, referenceNow) }}</div>
                </div>
                <div class="flex flex-wrap gap-2">
                  <RouterLink
                    :to="`/workspace/${workspace.id}/actions/${event.id}`"
                    class="rounded-xl bg-btn-primary px-3 py-2 text-[0.86rem] font-semibold text-ink-emphasis transition-colors hover:bg-btn-primary-hover"
                  >
                    查看动作
                  </RouterLink>
                  <RouterLink
                    :to="`/workspace/${workspace.id}/topics/${event.themeId}`"
                    class="rounded-xl border border-slate-400/15 bg-white/80 px-3 py-2 text-[0.86rem] font-semibold text-slate-700 transition-colors hover:bg-white"
                  >
                    查看主题
                  </RouterLink>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="rounded-2xl bg-slate-50/90 px-4 py-4 text-ink-body">
            当前股市工作区没有积压动作，可以直接进入盘后报告或主题页复盘。
          </div>
        </article>
      </section>

      <aside class="grid gap-4">
        <article class="card">
          <div class="card-topline">
            <h3>股市重点主题</h3>
            <span class="text-[0.88rem] text-ink-secondary">优先围绕市场概览、龙虎榜和公告线索</span>
          </div>
          <div v-if="focusThemes.length" class="grid gap-3">
            <RouterLink
              v-for="theme in focusThemes"
              :key="theme.id"
              :to="`/workspace/${workspace.id}/topics/${theme.id}`"
              class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-4 transition-colors hover:bg-white"
            >
              <div class="flex flex-wrap items-center gap-2">
                <span :class="pillToneClass(workspaceTopicHealthTone(theme))">{{ themeTypeLabel(theme.type) }}</span>
                <span :class="pillToneClass(theme.sourceHealth)">{{ sourceHealthLabel(theme.sourceHealth) }}</span>
              </div>
              <div class="mt-3 font-semibold text-ink-heading">{{ theme.name }}</div>
              <div class="mt-2 text-[0.9rem] leading-6 text-ink-body">{{ theme.latestInsight || "暂无最新摘要" }}</div>
            </RouterLink>
          </div>
          <div v-else class="rounded-2xl bg-slate-50/90 px-4 py-4 text-ink-body">
            当前股市工作区还没有形成可复盘的核心主题。
          </div>
        </article>

        <article class="card">
          <div class="card-topline">
            <h3>来源健康</h3>
            <span class="text-[0.88rem] text-ink-secondary">市场数据可信度入口</span>
          </div>
          <div class="grid gap-3">
            <div class="rounded-2xl bg-slate-50/90 px-4 py-4">
              <div class="text-[0.82rem] uppercase tracking-[0.08em] text-ink-label">异常来源</div>
              <div class="mt-2 text-[1.4rem] font-semibold text-ink-heading">{{ summary.warningSources }}</div>
              <div class="mt-2 text-[0.9rem] leading-6 text-ink-body">优先排查异常来源，避免盘后结论被坏数据误导。</div>
            </div>
            <div v-if="warningSources.length" class="grid gap-2">
              <RouterLink
                v-for="source in warningSources"
                :key="source.id"
                :to="`/workspace/${workspace.id}/sources/${source.id}`"
                class="rounded-2xl border border-slate-400/15 bg-white/80 px-4 py-3 font-semibold text-slate-700 transition-colors hover:bg-white"
              >
                {{ source.name }} · {{ source.themeName }}
              </RouterLink>
            </div>
          </div>
        </article>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { formatSmartDateTimeLabel, pillToneClass, sourceHealthLabel, themeTypeLabel } from "../../../../../lib/presentation";
import {
  buildWorkspaceSummary,
  sortWorkspaceEvents,
  workspaceTopicHealthTone,
  type WorkspaceId,
} from "../../../../../lib/workspaces";
import { useWorkspaceData } from "../../../shared/useWorkspaceData";

const route = useRoute();
const router = useRouter();
const workspaceId = computed(() => String(route.params.workspaceId ?? "") as WorkspaceId);
const { workspace, dataset, referenceNow, load } = useWorkspaceData(workspaceId);

const summary = computed(() => buildWorkspaceSummary(dataset.value));

const metrics = computed(() => [
  { label: "活跃主题", value: summary.value.activeTopics, description: "当前仍在运行或判断中的主题数量" },
  { label: "新增消息", value: summary.value.newMessages, description: "最近一个交易日窗口内的新事件数量" },
  { label: "重大事件", value: summary.value.majorEvents, description: "需要优先处理的高优先级股市事件" },
  { label: "待处理动作", value: summary.value.openActions, description: "尚未完成首轮判断的股市动作总数" },
]);

const actionEvents = computed(() => sortWorkspaceEvents(
  dataset.value.events.filter((event) => event.status === "open" || !event.isRead),
).slice(0, 5));

const focusThemes = computed(() => {
  return [...dataset.value.themes]
    .sort((left, right) => {
      if (left.sourceHealth !== right.sourceHealth) {
        return left.sourceHealth === "warning" ? -1 : 1;
      }

      return new Date(right.latestEventAt ?? right.latestRunAt ?? 0).getTime() - new Date(left.latestEventAt ?? left.latestRunAt ?? 0).getTime();
    })
    .slice(0, 4);
});

const warningSources = computed(() => dataset.value.sources.filter((source) => source.status === "warning"));

const dashboardNarrative = computed(() => {
  if (summary.value.majorEvents > 0) {
    return `当前有 ${summary.value.majorEvents} 条高优先级股市事件，建议先进入动作区清理，再回到盘后报告判断主线是否延续。`;
  }

  if (summary.value.warningSources > 0) {
    return `当前有 ${summary.value.warningSources} 个异常来源，建议先排查数据质量，再使用市场总览做结论。`;
  }

  return "当前股市工作区状态相对平稳，可以优先进入盘后报告查看连续复盘和主催化变化。";
});

watch(workspace, (value) => {
  if (!value) {
    void router.replace("/");
  }
}, { immediate: true });

onMounted(() => void load());
</script>
