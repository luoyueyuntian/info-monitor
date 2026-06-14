<template>
  <div v-if="workspace" class="page">
    <WorkspacePageHeader
      :workspace="workspace"
      title="动作工作台"
      description="这里只展示当前工作区需要你处理的事件。跨工作区数据不会混进来，切换工作区就像切换项目。"
    />

    <section class="card">
      <div class="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(180px,1fr))]">
        <input
          v-model="query"
          class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5"
          placeholder="搜索标题、摘要或主题..."
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
        <span>当前筛选下共 {{ filteredEvents.length }} 条动作项。</span>
        <button
          class="rounded-xl bg-btn-primary px-4 py-2.5 font-semibold text-ink-emphasis transition-colors hover:bg-btn-primary-hover"
          @click="resetFilters"
        >
          重置筛选
        </button>
      </div>
    </section>

    <section class="grid gap-4 xl:grid-cols-3">
      <article class="card">
        <div class="card-topline">
          <h3>待判断</h3>
          <span class="text-[0.88rem] text-ink-secondary">{{ openEvents.length }} 条</span>
        </div>
        <div class="grid gap-3">
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
            <div class="mt-3 font-semibold text-ink-heading">{{ event.title }}</div>
            <div class="mt-2 text-[0.9rem] leading-6 text-ink-body">{{ event.summary }}</div>
            <div class="mt-3 text-[0.86rem] text-ink-secondary">{{ event.themeName }} · {{ formatSmartDateTimeLabel(event.occurredAt, referenceNow) }}</div>
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
          <div v-if="!openEvents.length" class="rounded-2xl bg-slate-50/90 px-4 py-4 text-ink-body">当前筛选下没有待判断事件。</div>
        </div>
      </article>

      <article class="card">
        <div class="card-topline">
          <h3>持续跟踪</h3>
          <span class="text-[0.88rem] text-ink-secondary">{{ trackingEvents.length }} 条</span>
        </div>
        <div class="grid gap-3">
          <div
            v-for="event in trackingEvents"
            :key="event.id"
            class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-4"
          >
            <div class="flex flex-wrap items-center gap-2">
              <span :class="pillToneClass(priorityMeta(event).tone)">{{ priorityMeta(event).label }}</span>
              <span :class="pillToneClass(event.signal)">{{ eventSignalLabel(event.signal) }}</span>
            </div>
            <div class="mt-3 font-semibold text-ink-heading">{{ event.title }}</div>
            <div class="mt-2 text-[0.86rem] text-ink-secondary">{{ event.themeName }} · {{ formatSmartDateTimeLabel(event.occurredAt, referenceNow) }}</div>
            <div class="mt-3 flex flex-wrap gap-2.5">
              <button
                class="rounded-xl border border-slate-400/15 bg-white/80 px-3 py-2 text-[0.86rem] font-semibold text-slate-700 transition-colors hover:bg-white disabled:opacity-60"
                :disabled="savingEventId === event.id && pendingAction === 'open'"
                @click="handleUpdateStatus(event.id, 'open')"
              >
                {{ savingEventId === event.id && pendingAction === "open" ? "更新中..." : "退回待判断" }}
              </button>
              <RouterLink
                :to="`/workspace/${workspace.id}/topics/${event.themeId}`"
                class="rounded-xl bg-btn-primary px-3 py-2 text-[0.86rem] font-semibold text-ink-emphasis transition-colors hover:bg-btn-primary-hover"
              >
                查看主题
              </RouterLink>
            </div>
          </div>
          <div v-if="!trackingEvents.length" class="rounded-2xl bg-slate-50/90 px-4 py-4 text-ink-body">当前筛选下没有持续跟踪事件。</div>
        </div>
      </article>

      <article class="card">
        <div class="card-topline">
          <h3>已处理 / 已忽略</h3>
          <span class="text-[0.88rem] text-ink-secondary">{{ ignoredEvents.length }} 条</span>
        </div>
        <div class="grid gap-3">
          <div
            v-for="event in ignoredEvents"
            :key="event.id"
            class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-4"
          >
            <div class="flex flex-wrap items-center gap-2">
              <span :class="pillToneClass(event.status)">{{ eventStatusLabel(event.status) }}</span>
              <span :class="pillToneClass(event.signal)">{{ eventSignalLabel(event.signal) }}</span>
            </div>
            <div class="mt-3 font-semibold text-ink-heading">{{ event.title }}</div>
            <div class="mt-2 text-[0.86rem] text-ink-secondary">{{ event.themeName }} · {{ formatSmartDateTimeLabel(event.occurredAt, referenceNow) }}</div>
            <div class="mt-3 flex flex-wrap gap-2.5">
              <button
                class="rounded-xl border border-slate-400/15 bg-white/80 px-3 py-2 text-[0.86rem] font-semibold text-slate-700 transition-colors hover:bg-white disabled:opacity-60"
                :disabled="savingEventId === event.id && pendingAction === 'open'"
                @click="handleUpdateStatus(event.id, 'open')"
              >
                {{ savingEventId === event.id && pendingAction === "open" ? "更新中..." : "重新打开" }}
              </button>
            </div>
          </div>
          <div v-if="!ignoredEvents.length" class="rounded-2xl bg-slate-50/90 px-4 py-4 text-ink-body">当前筛选下没有已处理事件。</div>
        </div>
      </article>
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
  eventStatusLabel,
  formatSmartDateTimeLabel,
  pillToneClass,
} from "../../../../../lib/presentation";
import {
  scoreWorkspaceEventPriority,
  sortWorkspaceEvents,
  workspacePriorityLabel,
  type WorkspaceId,
} from "../../../../../lib/workspaces";
import WorkspacePageHeader from "../../../components/WorkspacePageHeader.vue";
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
