<template>
  <div v-if="workspace" class="page">
    <section class="mb-5 rounded-[28px] border border-slate-400/15 bg-[linear-gradient(135deg,#122236_0%,#173a4e_52%,#235673_100%)] px-6 py-6 text-white shadow-[0_22px_50px_rgba(15,23,42,0.22)]">
      <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div class="grid gap-3">
          <div class="inline-flex w-fit items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-white/82">
            股市专用动作台
          </div>
          <div>
            <div class="text-[0.84rem] uppercase tracking-[0.12em] text-white/58">{{ workspace.shortLabel }}</div>
            <h2 class="m-0 text-[2rem] font-semibold tracking-[-0.03em] text-white">盘后调查动作台</h2>
          </div>
          <p class="m-0 max-w-[58rem] text-[0.98rem] leading-7 text-white/72">
            按高优先级异动、持续跟踪和已处理对象组织股市动作，优先围绕主催化、重点异动对象和关键主题展开调查。
          </p>
        </div>

        <div class="grid gap-3 sm:grid-cols-3">
          <div class="rounded-2xl border border-white/12 bg-white/10 px-4 py-3">
            <div class="text-[0.76rem] uppercase tracking-[0.1em] text-white/58">待判断</div>
            <div class="mt-2 text-[1.15rem] font-semibold text-white">{{ openEvents.length }}</div>
          </div>
          <div class="rounded-2xl border border-white/12 bg-white/10 px-4 py-3">
            <div class="text-[0.76rem] uppercase tracking-[0.1em] text-white/58">持续跟踪</div>
            <div class="mt-2 text-[1.15rem] font-semibold text-white">{{ trackingEvents.length }}</div>
          </div>
          <div class="rounded-2xl border border-white/12 bg-white/10 px-4 py-3">
            <div class="text-[0.76rem] uppercase tracking-[0.1em] text-white/58">已处理</div>
            <div class="mt-2 text-[1.15rem] font-semibold text-white">{{ ignoredEvents.length }}</div>
          </div>
        </div>
      </div>
    </section>

    <section class="card">
      <div class="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(180px,1fr))]">
        <input
          v-model="query"
          class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5"
          placeholder="搜索异动股、催化或主题..."
        />
        <select v-model="priorityFilter" class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5">
          <option value="all">全部优先级</option>
          <option value="critical">重大事件</option>
          <option value="high">重点关注</option>
          <option value="normal">常规观察</option>
        </select>
        <select v-model="statusFilter" class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5">
          <option value="all">全部状态</option>
          <option value="open">待判断</option>
          <option value="tracking">持续跟踪</option>
          <option value="ignored">已忽略</option>
        </select>
        <select v-model="readFilter" class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5">
          <option value="all">全部阅读状态</option>
          <option value="unread">未读</option>
          <option value="read">已读</option>
        </select>
      </div>
      <div class="mt-3 flex flex-wrap items-center justify-between gap-3 text-[0.9rem] text-ink-secondary">
        <span>当前筛选下共 {{ filteredEvents.length }} 条股市动作项。</span>
        <button
          class="rounded-xl bg-btn-primary px-4 py-2.5 font-semibold text-ink-emphasis transition-colors hover:bg-btn-primary-hover"
          @click="resetFilters"
        >
          重置筛选
        </button>
      </div>
    </section>

    <section class="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)]">
      <div class="grid gap-4">
        <article class="card">
          <div class="card-topline">
            <h3>优先调查对象</h3>
            <span class="text-[0.88rem] text-ink-secondary">按优先级和未读状态排序</span>
          </div>
          <div v-if="openEvents.length" class="grid gap-3">
            <div
              v-for="event in openEvents"
              :key="event.id"
              class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-4"
            >
              <div class="flex flex-wrap items-center gap-2">
                <span :class="pillToneClass(priorityMeta(event).tone)">{{ priorityMeta(event).label }}</span>
                <span :class="pillToneClass(event.signal)">{{ eventSignalLabel(event.signal) }}</span>
                <span :class="pillToneClass(eventImpactTone(event))">{{ impactToneLabel(eventImpactTone(event)) }}</span>
              </div>
              <div class="mt-3 text-[1rem] font-semibold text-ink-heading">{{ event.title }}</div>
              <div class="mt-2 text-[0.92rem] leading-6 text-ink-body">{{ event.summary }}</div>
              <div class="mt-3 flex flex-wrap gap-x-3 gap-y-2 text-[0.86rem] text-ink-secondary">
                <span>主题：{{ event.themeName }}</span>
                <span>时间：{{ formatSmartDateTimeLabel(event.occurredAt, referenceNow) }}</span>
              </div>
              <div class="mt-3 flex flex-wrap gap-2.5">
                <button
                  class="rounded-xl bg-btn-primary px-3 py-2 text-[0.86rem] font-semibold text-ink-emphasis transition-colors hover:bg-btn-primary-hover disabled:opacity-60"
                  :disabled="savingEventId === event.id && pendingAction === 'tracking'"
                  @click="handleUpdateStatus(event.id, 'tracking')"
                >
                  {{ savingEventId === event.id && pendingAction === "tracking" ? "更新中..." : "转为跟踪" }}
                </button>
                <button
                  class="rounded-xl border border-slate-400/15 bg-white/80 px-3 py-2 text-[0.86rem] font-semibold text-slate-700 transition-colors hover:bg-white disabled:opacity-60"
                  :disabled="savingEventId === event.id && pendingAction === 'ignored'"
                  @click="handleUpdateStatus(event.id, 'ignored')"
                >
                  {{ savingEventId === event.id && pendingAction === "ignored" ? "更新中..." : "忽略" }}
                </button>
                <RouterLink
                  :to="`/workspace/${workspace.id}/actions/${event.id}`"
                  class="rounded-xl border border-slate-400/15 bg-white/80 px-3 py-2 text-[0.86rem] font-semibold text-slate-700 transition-colors hover:bg-white"
                >
                  查看详情
                </RouterLink>
              </div>
            </div>
          </div>
          <div v-else class="rounded-2xl bg-slate-50/90 px-4 py-4 text-ink-body">
            当前筛选下没有待判断的股市动作项。
          </div>
        </article>

        <article class="card">
          <div class="card-topline">
            <h3>持续跟踪与已处理</h3>
            <span class="text-[0.88rem] text-ink-secondary">按状态回看历史判断节奏</span>
          </div>
          <div class="grid gap-3 md:grid-cols-2">
            <div class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-4">
              <strong class="block text-ink-heading">持续跟踪</strong>
              <div class="mt-3 grid gap-2">
                <div v-for="event in trackingEvents" :key="event.id" class="rounded-xl border border-slate-400/15 bg-white/80 px-3 py-3">
                  <div class="font-semibold text-ink-heading">{{ event.title }}</div>
                  <div class="mt-1 text-[0.84rem] text-ink-secondary">{{ event.themeName }}</div>
                </div>
                <div v-if="!trackingEvents.length" class="text-[0.84rem] text-ink-secondary">当前没有持续跟踪中的股市动作。</div>
              </div>
            </div>
            <div class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-4">
              <strong class="block text-ink-heading">已处理 / 已忽略</strong>
              <div class="mt-3 grid gap-2">
                <div v-for="event in ignoredEvents" :key="event.id" class="rounded-xl border border-slate-400/15 bg-white/80 px-3 py-3">
                  <div class="font-semibold text-ink-heading">{{ event.title }}</div>
                  <div class="mt-1 text-[0.84rem] text-ink-secondary">{{ event.themeName }}</div>
                </div>
                <div v-if="!ignoredEvents.length" class="text-[0.84rem] text-ink-secondary">当前没有已处理的股市动作。</div>
              </div>
            </div>
          </div>
        </article>
      </div>

      <aside class="grid gap-4">
        <article class="card">
          <div class="card-topline">
            <h3>股市调查入口</h3>
            <span class="text-[0.88rem] text-ink-secondary">直接进入主题或报告</span>
          </div>
          <div class="grid gap-3">
            <RouterLink
              :to="`/workspace/${workspace.id}/reports`"
              class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-4 transition-colors hover:bg-white"
            >
              <div class="font-semibold text-ink-heading">查看盘后报告</div>
              <div class="mt-2 text-[0.9rem] leading-6 text-ink-body">
                进入盘后复盘中心，查看主催化、时间线、重点异动对象和连续复盘。
              </div>
            </RouterLink>
            <RouterLink
              v-for="theme in focusThemes"
              :key="theme.id"
              :to="`/workspace/${workspace.id}/topics/${theme.id}`"
              class="rounded-2xl border border-slate-400/15 bg-white/80 px-4 py-4 transition-colors hover:bg-white"
            >
              <div class="flex items-center gap-2">
                <span :class="pillToneClass(workspaceTopicHealthTone(theme))">{{ themeTypeLabel(theme.type) }}</span>
                <span :class="pillToneClass(theme.sourceHealth)">{{ sourceHealthLabel(theme.sourceHealth) }}</span>
              </div>
              <div class="mt-3 font-semibold text-ink-heading">{{ theme.name }}</div>
              <div class="mt-2 text-[0.88rem] leading-6 text-ink-body">{{ theme.latestInsight || "暂无最新摘要" }}</div>
            </RouterLink>
          </div>
        </article>
      </aside>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { updateEventStatus } from "../../../../../lib/api";
import { eventImpactTone, impactToneLabel } from "../../../../../lib/impact";
import {
  eventSignalLabel,
  formatSmartDateTimeLabel,
  pillToneClass,
  sourceHealthLabel,
  themeTypeLabel,
} from "../../../../../lib/presentation";
import {
  scoreWorkspaceEventPriority,
  sortWorkspaceEvents,
  workspacePriorityLabel,
  workspaceTopicHealthTone,
  type WorkspaceId,
} from "../../../../../lib/workspaces";
import { useWorkspaceData } from "../../../shared/useWorkspaceData";

const route = useRoute();
const router = useRouter();
const workspaceId = computed(() => String(route.params.workspaceId ?? "") as WorkspaceId);
const { workspace, dataset, referenceNow, load } = useWorkspaceData(workspaceId);

const query = ref("");
const priorityFilter = ref("all");
const statusFilter = ref("all");
const readFilter = ref("all");
const savingEventId = ref("");
const pendingAction = ref("");

const filteredEvents = computed(() => {
  return sortWorkspaceEvents(dataset.value.events).filter((event) => {
    const text = `${event.title} ${event.summary} ${event.themeName}`.toLowerCase();
    const priority = scoreWorkspaceEventPriority(event, referenceNow.value).level;

    if (query.value && !text.includes(query.value.toLowerCase())) {
      return false;
    }

    if (priorityFilter.value !== "all" && priority !== priorityFilter.value) {
      return false;
    }

    if (statusFilter.value !== "all" && (event.status ?? "open") !== statusFilter.value) {
      return false;
    }

    if (readFilter.value === "read" && !event.isRead) {
      return false;
    }

    if (readFilter.value === "unread" && event.isRead) {
      return false;
    }

    return true;
  });
});

const openEvents = computed(() => filteredEvents.value.filter((event) => (event.status ?? "open") === "open"));
const trackingEvents = computed(() => filteredEvents.value.filter((event) => event.status === "tracking"));
const ignoredEvents = computed(() => filteredEvents.value.filter((event) => event.status === "ignored"));
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

function priorityMeta(event: (typeof filteredEvents.value)[number]) {
  const level = scoreWorkspaceEventPriority(event, referenceNow.value).level;
  return {
    label: workspacePriorityLabel(level),
    tone: level === "critical" ? "negative" : level === "high" ? "warning" : "neutral",
  };
}

function resetFilters() {
  query.value = "";
  priorityFilter.value = "all";
  statusFilter.value = "all";
  readFilter.value = "all";
}

async function handleUpdateStatus(eventId: string, status: string) {
  savingEventId.value = eventId;
  pendingAction.value = status;

  try {
    await updateEventStatus(eventId, status);
    await load();
  } finally {
    savingEventId.value = "";
    pendingAction.value = "";
  }
}

watch(workspace, (value) => {
  if (!value) {
    void router.replace("/");
  }
}, { immediate: true });

onMounted(() => void load());
</script>
