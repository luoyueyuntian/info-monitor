<template>
  <div v-if="workspace" class="page">
    <section class="mb-5 rounded-[28px] border border-slate-400/15 bg-[linear-gradient(135deg,#172a1f_0%,#1e4632_48%,#305f43_100%)] px-6 py-6 text-white shadow-[0_22px_50px_rgba(15,23,42,0.18)]">
      <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div class="grid gap-3">
          <div class="inline-flex w-fit items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-white/82">
            竞品动作雷达
          </div>
          <div>
            <div class="text-[0.84rem] uppercase tracking-[0.12em] text-white/58">{{ workspace.shortLabel }}</div>
            <h2 class="m-0 text-[2rem] font-semibold tracking-[-0.03em] text-white">最近哪些对象在连续出招</h2>
          </div>
          <p class="m-0 max-w-[58rem] text-[0.98rem] leading-7 text-white/72">
            从发版、定价、活动和文档动作里快速判断哪些变化值得继续跟踪，哪些来源需要先验证。
          </p>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-2xl border border-white/12 bg-white/10 px-4 py-3">
            <div class="text-[0.76rem] uppercase tracking-[0.1em] text-white/58">待判断动作</div>
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
      <article v-for="metric in metrics" :key="metric.label" class="card">
        <div class="text-[0.82rem] uppercase tracking-[0.08em] text-ink-label">{{ metric.label }}</div>
        <div class="mt-3 text-[1.7rem] font-semibold text-ink-heading">{{ metric.value }}</div>
        <div class="mt-2 text-[0.92rem] leading-6 text-ink-body">{{ metric.description }}</div>
      </article>
    </section>

    <div class="grid items-start gap-4 xl:grid-cols-[minmax(0,1.48fr)_minmax(340px,0.9fr)]">
      <section class="grid gap-4">
        <article class="card">
          <div class="card-topline">
            <h3>动作脉冲</h3>
            <span class="text-[0.88rem] text-ink-secondary">按动作类型聚合</span>
          </div>
          <div v-if="pulse.length" class="grid gap-3">
            <div
              v-for="item in pulse"
              :key="item.actionType"
              class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-4"
            >
              <div class="font-semibold text-ink-heading">{{ actionTypeLabel(item.actionType) }}</div>
              <div class="mt-2 text-[0.92rem] leading-6 text-ink-body">
                累计 {{ item.count }} 条动作，其中 {{ item.openCount }} 条仍待判断。
              </div>
            </div>
          </div>
          <div v-else class="rounded-2xl bg-slate-50/90 px-4 py-4 text-ink-body">
            当前还没有形成可判断的竞品动作脉冲。
          </div>
        </article>

        <article class="card">
          <div class="card-topline">
            <h3>高优先级动作</h3>
            <span class="text-[0.88rem] text-ink-secondary">优先判断影响范围</span>
          </div>
          <div v-if="priorityEvents.length" class="grid gap-3">
            <RouterLink
              v-for="event in priorityEvents"
              :key="event.id"
              :to="`/workspace/${workspace.id}/actions/${event.id}`"
              class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-4 transition-colors hover:bg-white"
            >
              <div class="font-semibold text-ink-heading">{{ event.title }}</div>
              <div class="mt-2 text-[0.92rem] leading-6 text-ink-body">{{ event.summary }}</div>
              <div class="mt-3 text-[0.86rem] text-ink-secondary">
                {{ event.themeName }} · {{ formatSmartDateTimeLabel(event.occurredAt, referenceNow) }}
              </div>
            </RouterLink>
          </div>
          <div v-else class="rounded-2xl bg-slate-50/90 px-4 py-4 text-ink-body">
            当前没有需要优先判断的竞品动作。
          </div>
        </article>
      </section>

      <aside class="grid gap-4">
        <article class="card">
          <div class="card-topline">
            <h3>活跃观察对象</h3>
            <span class="text-[0.88rem] text-ink-secondary">最近谁动作最多</span>
          </div>
          <div v-if="focusObjects.length" class="grid gap-3">
            <div
              v-for="item in focusObjects"
              :key="item.objectName"
              class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-4"
            >
              <div class="font-semibold text-ink-heading">{{ item.objectName }}</div>
              <div class="mt-2 text-[0.92rem] leading-6 text-ink-body">
                {{ item.eventCount }} 条动作，{{ item.openCount }} 条待判断。
              </div>
              <div class="mt-3 text-[0.86rem] text-ink-secondary">
                最近动作：{{ formatSmartDateTimeLabel(item.latestOccurredAt, referenceNow) }}
              </div>
            </div>
          </div>
          <div v-else class="rounded-2xl bg-slate-50/90 px-4 py-4 text-ink-body">
            当前还没有形成活跃观察对象。
          </div>
        </article>

        <article class="card">
          <div class="card-topline">
            <h3>来源提醒</h3>
            <span class="text-[0.88rem] text-ink-secondary">先验证再下判断</span>
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
          <div v-else class="rounded-2xl bg-slate-50/90 px-4 py-4 text-ink-body">
            当前没有异常来源，可以优先围绕动作本身做判断。
          </div>
        </article>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { formatSmartDateTimeLabel } from "../../../../../lib/presentation";
import {
  buildWorkspaceSummary,
  sortWorkspaceEvents,
  type WorkspaceId,
} from "../../../../../lib/workspaces";
import {
  buildCompetitorFocusList,
  buildCompetitorPulse,
  type CompetitorActionType,
} from "../../../../../workspaces/competitor-watch/intelligence";
import { useWorkspaceData } from "../../../shared/useWorkspaceData";

const route = useRoute();
const router = useRouter();
const workspaceId = computed(() => String(route.params.workspaceId ?? "") as WorkspaceId);
const { workspace, dataset, referenceNow, load } = useWorkspaceData(workspaceId);

const summary = computed(() => buildWorkspaceSummary(dataset.value));
const pulse = computed(() => buildCompetitorPulse(dataset.value, referenceNow.value));
const focusObjects = computed(() => buildCompetitorFocusList(dataset.value, referenceNow.value).slice(0, 5));
const priorityEvents = computed(() => sortWorkspaceEvents(dataset.value.events).slice(0, 4));
const warningSources = computed(() => dataset.value.sources.filter((source) => source.status === "warning"));

const metrics = computed(() => [
  { label: "活跃观察对象", value: focusObjects.value.length, description: "最近确实在发生动作的竞品或产品对象数量" },
  { label: "24小时新增动作", value: summary.value.newMessages, description: "最近一个观察窗口里新增的竞品动作数" },
  { label: "待判断动作", value: summary.value.openActions, description: "仍需要先完成首轮分诊的动作项" },
  { label: "异常来源", value: summary.value.warningSources, description: "需要先验证抓取可信度的来源数量" },
]);

function actionTypeLabel(actionType: CompetitorActionType) {
  switch (actionType) {
    case "feature_release":
      return "功能与版本";
    case "pricing_packaging":
      return "定价与包装";
    case "campaign_content":
      return "活动与内容";
    case "docs_support":
      return "文档与支持";
    default:
      return "其他动作";
  }
}

watch(workspace, (value) => {
  if (!value) {
    void router.replace("/");
  }
}, { immediate: true });

onMounted(() => void load());
</script>
