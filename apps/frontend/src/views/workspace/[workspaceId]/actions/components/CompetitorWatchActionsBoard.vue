<template>
  <div v-if="workspace" class="page">
    <WorkspacePageHeader
      :workspace="workspace"
      title="竞品分诊台"
      description="先判断这次变化属于发版、定价、活动还是文档动作，再决定继续跟踪还是先搁置。"
    />

    <section class="card">
      <div class="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(180px,1fr))]">
        <input
          v-model="query"
          class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5"
          placeholder="搜索对象、标题或摘要..."
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

    <section class="grid gap-4">
      <article v-for="bucket in visibleBuckets" :key="bucket.actionType" class="card">
        <div class="card-topline">
          <h3>{{ actionTypeSectionLabel(bucket.actionType) }}</h3>
          <span class="text-[0.88rem] text-ink-secondary">{{ bucket.events.length }} 条</span>
        </div>
        <div class="grid gap-3">
          <div
            v-for="event in bucket.events"
            :key="event.id"
            class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-4"
          >
            <div class="flex flex-wrap items-center gap-2">
              <span :class="pillToneClass(priorityMeta(event).tone)">{{ priorityMeta(event).label }}</span>
              <span :class="pillToneClass(event.signal)">{{ eventSignalLabel(event.signal) }}</span>
            </div>
            <div class="mt-3 font-semibold text-ink-heading">{{ resolveObjectName(event) }}</div>
            <div class="mt-1 text-[0.88rem] text-ink-secondary">
              {{ event.themeName }} · {{ formatSmartDateTimeLabel(event.occurredAt, referenceNow) }}
            </div>
            <div class="mt-2 text-[0.92rem] leading-6 text-ink-body">{{ event.summary }}</div>
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
      </article>

      <div v-if="!visibleBuckets.length" class="card text-ink-body">
        当前筛选下没有可分诊的竞品动作。
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { updateEventStatus, type EventSummary } from "../../../../../lib/api";
import {
  eventSignalLabel,
  formatSmartDateTimeLabel,
  pillToneClass,
} from "../../../../../lib/presentation";
import {
  scoreWorkspaceEventPriority,
  workspacePriorityLabel,
  type WorkspaceId,
} from "../../../../../lib/workspaces";
import {
  buildCompetitorActionBuckets,
  resolveCompetitorObjectName,
  type CompetitorActionType,
} from "../../../../../workspaces/competitor-watch/intelligence";
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

const themesById = computed(() => new Map(dataset.value.themes.map((theme) => [theme.id, theme])));

const filteredEvents = computed(() => {
  return dataset.value.events.filter((event) => {
    const searchText = `${resolveObjectName(event)} ${event.title} ${event.summary} ${event.themeName}`.toLowerCase();
    const priority = scoreWorkspaceEventPriority(event, referenceNow.value).level;

    if (query.value && !searchText.includes(query.value.toLowerCase())) {
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

const visibleBuckets = computed(() =>
  buildCompetitorActionBuckets({ ...dataset.value, events: filteredEvents.value }, referenceNow.value),
);

function resolveObjectName(event: EventSummary) {
  return resolveCompetitorObjectName(event, themesById.value.get(event.themeId));
}

function actionTypeSectionLabel(actionType: CompetitorActionType) {
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

function priorityMeta(event: EventSummary) {
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
