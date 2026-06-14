<template>
  <div v-if="workspace" class="page">
    <WorkspacePageHeader
      :workspace="workspace"
      title="工作区大盘"
      :description="workspace.description"
      :status-label="workspaceStatusLabel(summary.status)"
      :status-tone="workspaceStatusTone(summary.status)"
    />

    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <article class="card" v-for="metric in metrics" :key="metric.label">
        <div class="text-[0.82rem] uppercase tracking-[0.08em] text-ink-label">{{ metric.label }}</div>
        <div class="mt-3 text-[1.7rem] font-semibold text-ink-heading">{{ metric.value }}</div>
        <div class="mt-2 text-[0.92rem] leading-6 text-ink-body">{{ metric.description }}</div>
      </article>
    </section>

    <div class="grid items-start gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)]">
      <section class="grid gap-4">
        <article class="card">
          <div class="card-topline">
            <h3>今日重大事件</h3>
            <span class="text-[0.88rem] text-ink-secondary">按优先级和时间排序</span>
          </div>
          <div v-if="priorityEvents.length" class="grid gap-3">
            <RouterLink
              v-for="item in priorityEvents"
              :key="item.id"
              :to="`/workspace/${workspace.id}/actions/${item.id}`"
              class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-4 transition-colors hover:bg-white"
            >
              <div class="flex flex-wrap items-center gap-2">
                <span :class="pillToneClass(item.priorityTone)">{{ item.priorityLabel }}</span>
                <span :class="pillToneClass(item.event.signal)">{{ eventSignalLabel(item.event.signal) }}</span>
                <span :class="pillToneClass(item.event.status)">{{ eventStatusLabel(item.event.status) }}</span>
              </div>
              <div class="mt-3 text-[1rem] font-semibold text-ink-heading">{{ item.event.title }}</div>
              <div class="mt-2 text-[0.92rem] leading-6 text-ink-body">{{ item.event.summary }}</div>
              <div class="mt-3 flex flex-wrap gap-x-3 gap-y-2 text-[0.86rem] text-ink-secondary">
                <span>主题：{{ item.event.themeName }}</span>
                <span>时间：{{ formatSmartDateTimeLabel(item.event.occurredAt, referenceNow) }}</span>
                <span>影响：{{ impactToneLabel(item.impactTone) }}</span>
              </div>
            </RouterLink>
          </div>
          <div v-else class="rounded-2xl bg-slate-50/90 px-4 py-4 text-ink-body">
            当前没有重大事件，工作区处于相对平稳状态。
          </div>
        </article>

        <article class="card">
          <div class="card-topline">
            <h3>待处理动作</h3>
            <span class="text-[0.88rem] text-ink-secondary">优先处理未读且仍待判断的变化</span>
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
                  <button
                    class="rounded-xl bg-btn-primary px-3 py-2 text-[0.86rem] font-semibold text-ink-emphasis transition-colors hover:bg-btn-primary-hover disabled:opacity-60"
                    :disabled="savingEventId === event.id && pendingStatus === 'tracking'"
                    @click="handleUpdateStatus(event.id, 'tracking')"
                  >
                    {{ savingEventId === event.id && pendingStatus === "tracking" ? "更新中..." : "转为关注中" }}
                  </button>
                  <button
                    class="rounded-xl border border-slate-400/15 bg-white/80 px-3 py-2 text-[0.86rem] font-semibold text-slate-700 transition-colors hover:bg-white"
                    :disabled="savingEventId === event.id && pendingStatus === 'ignored'"
                    @click="handleUpdateStatus(event.id, 'ignored')"
                  >
                    {{ savingEventId === event.id && pendingStatus === "ignored" ? "更新中..." : "标记已忽略" }}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="rounded-2xl bg-slate-50/90 px-4 py-4 text-ink-body">
            当前工作区没有积压动作，可以继续查看主题和来源健康。
          </div>
        </article>
      </section>

      <aside class="grid gap-4">
        <article class="card">
          <div class="card-topline">
            <h3>重点主题</h3>
            <span class="text-[0.88rem] text-ink-secondary">按来源健康和最新变化排序</span>
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
              <div class="mt-3 text-[0.86rem] text-ink-secondary">
                最近事件：{{ formatSmartDateTimeLabel(theme.latestEventAt ?? theme.latestRunAt, referenceNow) }}
              </div>
            </RouterLink>
          </div>
          <div v-else class="rounded-2xl bg-slate-50/90 px-4 py-4 text-ink-body">
            {{ workspace.emptyBody }}
          </div>
        </article>

        <article class="card">
          <div class="card-topline">
            <h3>来源健康</h3>
            <span class="text-[0.88rem] text-ink-secondary">当前工作区的数据可信度</span>
          </div>
          <div class="grid gap-3">
            <div class="rounded-2xl bg-slate-50/90 px-4 py-4">
              <div class="text-[0.82rem] uppercase tracking-[0.08em] text-ink-label">异常来源</div>
              <div class="mt-2 text-[1.4rem] font-semibold text-ink-heading">{{ summary.warningSources }}</div>
              <div class="mt-2 text-[0.9rem] leading-6 text-ink-body">存在异常时，优先进入“来源”页补跑或排查，避免误判。</div>
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

        <article class="card">
          <div class="card-topline">
            <h3>最近新增</h3>
            <span class="text-[0.88rem] text-ink-secondary">按时间回看工作区更新节奏</span>
          </div>
          <div v-if="recentEvents.length" class="grid gap-3">
            <div v-for="event in recentEvents" :key="event.id" class="rounded-2xl bg-slate-50/90 px-4 py-4">
              <div class="flex flex-wrap items-center gap-2">
                <span :class="pillToneClass(event.signal)">{{ eventSignalLabel(event.signal) }}</span>
                <span :class="pillToneClass(event.status)">{{ eventStatusLabel(event.status) }}</span>
              </div>
              <div class="mt-3 font-semibold text-ink-heading">{{ event.title }}</div>
              <div class="mt-1 text-[0.86rem] text-ink-secondary">{{ formatSmartDateTimeLabel(event.occurredAt, referenceNow) }}</div>
            </div>
          </div>
        </article>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { updateEventStatus } from "../../../../../lib/api";
import { eventImpactTone, impactToneLabel } from "../../../../../lib/impact";
import {
  eventSignalLabel,
  eventStatusLabel,
  formatSmartDateTimeLabel,
  pillToneClass,
  sourceHealthLabel,
  themeTypeLabel,
} from "../../../../../lib/presentation";
import {
  buildWorkspaceSummary,
  scoreWorkspaceEventPriority,
  sortWorkspaceEvents,
  workspaceStatusLabel,
  workspaceStatusTone,
  workspaceTopicHealthTone,
  workspacePriorityLabel,
  type WorkspaceId,
} from "../../../../../lib/workspaces";
import WorkspacePageHeader from "../../../components/WorkspacePageHeader.vue";
import { useWorkspaceData } from "../../../shared/useWorkspaceData";

const route = useRoute();
const router = useRouter();
const workspaceId = computed(() => String(route.params.workspaceId ?? "") as WorkspaceId);
const { workspace, dataset, referenceNow, load } = useWorkspaceData(workspaceId);
const savingEventId = ref("");
const pendingStatus = ref("");

const summary = computed(() => buildWorkspaceSummary(dataset.value));

const priorityEvents = computed(() => sortWorkspaceEvents(dataset.value.events).slice(0, 4).map((event) => {
  const priority = scoreWorkspaceEventPriority(event, referenceNow.value);
  return {
    event,
    id: event.id,
    priorityLabel: workspacePriorityLabel(priority.level),
    priorityTone: priority.level === "critical" ? "negative" : priority.level === "high" ? "warning" : "neutral",
    impactTone: eventImpactTone(event),
  };
}));

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
const recentEvents = computed(() => [...dataset.value.events]
  .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime())
  .slice(0, 5));

const metrics = computed(() => [
  { label: "活跃主题", value: summary.value.activeTopics, description: "当前仍在运行或判断中的主题数量" },
  { label: "新增消息", value: summary.value.newMessages, description: "最近一个工作日窗口内的新事件数量" },
  { label: "重大事件", value: summary.value.majorEvents, description: "优先进入动作页处理的高优先级事件" },
  { label: "待处理动作", value: summary.value.openActions, description: "尚未完成首轮判断的任务总数" },
  { label: "异常来源", value: summary.value.warningSources, description: "可能影响当前判断可信度的来源数" },
]);

async function handleUpdateStatus(eventId: string, status: string) {
  savingEventId.value = eventId;
  pendingStatus.value = status;

  try {
    await updateEventStatus(eventId, status);
    await load();
  } finally {
    savingEventId.value = "";
    pendingStatus.value = "";
  }
}

watch(workspace, (value) => {
  if (!value) {
    void router.replace("/");
  }
}, { immediate: true });

onMounted(() => void load());
</script>
