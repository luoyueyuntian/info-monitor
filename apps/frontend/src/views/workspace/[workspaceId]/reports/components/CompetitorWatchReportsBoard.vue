<template>
  <div v-if="workspace" class="page">
    <section class="mb-5 rounded-[28px] border border-slate-400/15 bg-[linear-gradient(135deg,#2a2033_0%,#2d4458_50%,#40635c_100%)] px-6 py-6 text-white shadow-[0_22px_50px_rgba(15,23,42,0.22)]">
      <div class="grid gap-3">
        <div class="inline-flex w-fit items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-white/82">
          竞品情报摘要
        </div>
        <div>
          <div class="text-[0.84rem] uppercase tracking-[0.12em] text-white/58">{{ workspace.shortLabel }}</div>
          <h2 class="m-0 text-[2rem] font-semibold tracking-[-0.03em] text-white">把今天的动作脉冲翻译成一页判断</h2>
        </div>
        <p class="m-0 max-w-[58rem] text-[0.98rem] leading-7 text-white/72">
          从动作数量、活跃对象和来源可信度快速形成一页竞品情报摘要，避免只看零散事件。
        </p>
      </div>
    </section>

    <section class="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.9fr)]">
      <article class="card">
        <div class="card-topline">
          <h3>今日脉冲</h3>
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
            <h3>活跃对象</h3>
            <span class="text-[0.88rem] text-ink-secondary">最近谁动作最多</span>
          </div>
          <div v-if="focusObjects.length" class="grid gap-3">
            <div v-for="item in focusObjects" :key="item.objectName" class="rounded-2xl bg-slate-50/90 px-4 py-4">
              <div class="font-semibold text-ink-heading">{{ item.objectName }}</div>
              <div class="mt-2 text-[0.92rem] leading-6 text-ink-body">
                {{ item.eventCount }} 条动作，{{ item.openCount }} 条待判断。
              </div>
            </div>
          </div>
          <div v-else class="rounded-2xl bg-slate-50/90 px-4 py-4 text-ink-body">
            当前还没有足够的对象动作样本。
          </div>
        </article>

        <article class="card">
          <div class="card-topline">
            <h3>动作分布</h3>
            <span class="text-[0.88rem] text-ink-secondary">按类型聚合</span>
          </div>
          <div v-if="pulse.length" class="grid gap-3">
            <div v-for="item in pulse" :key="item.actionType" class="rounded-2xl bg-slate-50/90 px-4 py-4">
              <div class="font-semibold text-ink-heading">{{ actionTypeLabel(item.actionType) }}</div>
              <div class="mt-2 text-[0.92rem] leading-6 text-ink-body">
                {{ item.count }} 条动作，{{ item.openCount }} 条待判断。
              </div>
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
const sortedEvents = computed(() => sortWorkspaceEvents(dataset.value.events));
const pulse = computed(() => buildCompetitorPulse(dataset.value, referenceNow.value));
const focusObjects = computed(() => buildCompetitorFocusList(dataset.value, referenceNow.value).slice(0, 4));

const dailyNarrative = computed(() => {
  return `${workspace.value?.label ?? "当前工作区"} 今日共新增 ${summary.value.newMessages} 条动作，其中 ${summary.value.openActions} 条仍待判断。最近最活跃的对象是 ${focusObjects.value[0]?.objectName ?? "暂无"}，建议先围绕高优先级动作完成首轮分诊。`;
});

const majorBullets = computed(() => {
  if (!sortedEvents.value.length) {
    return ["当前没有可供汇总的竞品动作。"];
  }

  return sortedEvents.value.slice(0, 3).map((event) => `${event.themeName}：${event.title}`);
});

const actionBullets = computed(() => {
  const bullets: string[] = [];

  if (summary.value.openActions > 0) {
    bullets.push(`优先清理 ${summary.value.openActions} 条待判断动作，先确认影响范围。`);
  }
  if (summary.value.warningSources > 0) {
    bullets.push(`复核 ${summary.value.warningSources} 个异常来源，避免基于坏数据下结论。`);
  }
  if (pulse.value.length > 0) {
    bullets.push(`优先关注 ${actionTypeLabel(pulse.value[0].actionType)} 这一类动作是否在持续强化。`);
  }

  if (!bullets.length) {
    bullets.push("当前节奏平稳，可以继续等待下一轮竞品动作。");
  }

  return bullets;
});

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
