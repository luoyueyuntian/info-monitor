<template>
  <div v-if="workspace" class="page">
    <WorkspacePageHeader
      :workspace="workspace"
      title="主题资产"
      description="主题是这个工作区的长期观察对象。这里不会混入其他工作区的主题，方便你把判断沉淀成稳定资产。"
    />

    <section class="card">
      <div class="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_repeat(4,minmax(140px,1fr))]">
        <input
          v-model="query"
          class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5"
          placeholder="搜索主题名或摘要..."
        />
        <select v-model="statusFilter" class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5">
          <option value="all">全部状态</option>
          <option value="active">活跃</option>
          <option value="paused">暂停</option>
          <option value="archived">归档</option>
        </select>
        <select v-model="healthFilter" class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5">
          <option value="all">全部来源健康</option>
          <option value="healthy">正常</option>
          <option value="warning">异常</option>
        </select>
        <select v-model="attentionFilter" class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5">
          <option value="all">全部关注状态</option>
          <option value="hot">有重点事件</option>
          <option value="open">有待处理动作</option>
          <option value="tracking">有持续跟踪事件</option>
        </select>
        <button
          class="rounded-xl bg-btn-primary px-4 py-2.5 font-semibold text-ink-emphasis transition-colors hover:bg-btn-primary-hover"
          @click="resetFilters"
        >
          重置筛选
        </button>
      </div>
      <div class="mt-3 text-[0.9rem] text-ink-secondary">当前筛选下有 {{ filteredTopics.length }} 个主题。</div>
    </section>

    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <article class="card" v-for="metric in metrics" :key="metric.label">
        <div class="text-[0.82rem] uppercase tracking-[0.08em] text-ink-label">{{ metric.label }}</div>
        <div class="mt-3 text-[1.6rem] font-semibold text-ink-heading">{{ metric.value }}</div>
        <div class="mt-2 text-[0.9rem] leading-6 text-ink-body">{{ metric.description }}</div>
      </article>
    </section>

    <section class="grid gap-4 xl:grid-cols-2">
      <RouterLink
        v-for="topic in filteredTopics"
        :key="topic.theme.id"
        :to="`/workspace/${workspace.id}/topics/${topic.theme.id}`"
        class="grid gap-4 rounded-[24px] border border-slate-400/15 bg-white/82 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] transition-colors hover:bg-white"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <span :class="pillToneClass(workspaceTopicHealthTone(topic.theme))">{{ themeTypeLabel(topic.theme.type) }}</span>
              <span :class="pillToneClass(topic.theme.sourceHealth)">{{ sourceHealthLabel(topic.theme.sourceHealth) }}</span>
              <span :class="pillToneClass(topic.theme.status === 'active' ? 'active' : topic.theme.status === 'paused' ? 'pending' : 'neutral')">
                {{ themeStatusLabel(topic.theme.status) }}
              </span>
            </div>
            <h3 class="mt-3 text-[1.15rem] font-semibold text-ink-heading">{{ topic.theme.name }}</h3>
          </div>
          <div class="text-right text-[0.86rem] text-ink-secondary">
            <div>最近更新</div>
            <div class="mt-1 font-semibold text-ink-heading">{{ formatSmartDateTimeLabel(topic.theme.latestEventAt ?? topic.theme.latestRunAt, referenceNow) }}</div>
          </div>
        </div>

        <p class="m-0 leading-7 text-ink-body">{{ topic.theme.latestInsight || "暂无结构化摘要，建议先进入详情页补充观察结论。" }}</p>

        <div class="grid gap-3 sm:grid-cols-3">
          <div class="rounded-2xl bg-slate-50/90 px-4 py-3">
            <div class="text-[0.8rem] uppercase tracking-[0.08em] text-ink-label">事件</div>
            <div class="mt-2 text-[1.25rem] font-semibold text-ink-heading">{{ topic.eventCount }}</div>
          </div>
          <div class="rounded-2xl bg-slate-50/90 px-4 py-3">
            <div class="text-[0.8rem] uppercase tracking-[0.08em] text-ink-label">待处理</div>
            <div class="mt-2 text-[1.25rem] font-semibold text-ink-heading">{{ topic.openCount }}</div>
          </div>
          <div class="rounded-2xl bg-slate-50/90 px-4 py-3">
            <div class="text-[0.8rem] uppercase tracking-[0.08em] text-ink-label">来源</div>
            <div class="mt-2 text-[1.25rem] font-semibold text-ink-heading">{{ topic.sourceCount }}</div>
          </div>
        </div>

        <div class="grid gap-3 rounded-2xl border border-slate-400/15 bg-slate-50/80 px-4 py-4">
          <div class="flex items-center justify-between gap-3">
            <strong class="text-ink-heading">观察建议</strong>
            <span class="text-[0.88rem] text-ink-secondary">{{ topic.hotEvent ? "存在重点事件" : "常规跟踪" }}</span>
          </div>
          <div class="text-[0.92rem] leading-6 text-ink-body">{{ topic.recommendation }}</div>
        </div>
      </RouterLink>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  formatSmartDateTimeLabel,
  pillToneClass,
  sourceHealthLabel,
  themeStatusLabel,
  themeTypeLabel,
} from "../../../../../lib/presentation";
import {
  scoreWorkspaceEventPriority,
  workspaceTopicHealthTone,
  type WorkspaceId,
} from "../../../../../lib/workspaces";
import WorkspacePageHeader from "../../../components/WorkspacePageHeader.vue";
import { useWorkspaceData } from "../../../shared/useWorkspaceData";

const route = useRoute();
const router = useRouter();
const workspaceId = computed(() => String(route.params.workspaceId ?? "") as WorkspaceId);
const { workspace, dataset, referenceNow, load } = useWorkspaceData(workspaceId);

const query = ref("");
const statusFilter = ref("all");
const healthFilter = ref("all");
const attentionFilter = ref("all");

const topicCards = computed(() => dataset.value.themes.map((theme) => {
  const relatedEvents = dataset.value.events.filter((event) => event.themeId === theme.id);
  const relatedSources = dataset.value.sources.filter((source) => source.themeId === theme.id);
  const hotEvent = relatedEvents.some((event) => scoreWorkspaceEventPriority(event, referenceNow.value).level !== "normal");
  const openCount = relatedEvents.filter((event) => (event.status ?? "open") === "open").length;
  const trackingCount = relatedEvents.filter((event) => event.status === "tracking").length;

  let recommendation = "保持当前工作区节奏，按最近变化低频复核。";
  if (theme.sourceHealth === "warning") {
    recommendation = "优先排查来源异常，再决定是否继续基于这个主题做判断。";
  } else if (openCount > 0) {
    recommendation = "当前主题仍有待判断动作，建议优先进入主题详情完成首轮判断。";
  } else if (trackingCount > 0) {
    recommendation = "这个主题已经进入持续观察阶段，适合结合趋势和时间线低频回看。";
  } else if (hotEvent) {
    recommendation = "虽然动作项不多，但最近出现了重点变化，建议补充观察结论。";
  }

  return {
    theme,
    eventCount: relatedEvents.length,
    openCount,
    trackingCount,
    sourceCount: relatedSources.length,
    hotEvent,
    recommendation,
  };
}));

const filteredTopics = computed(() => topicCards.value.filter((topic) => {
  const text = `${topic.theme.name} ${topic.theme.latestInsight ?? ""}`.toLowerCase();

  if (query.value && !text.includes(query.value.toLowerCase())) {
    return false;
  }

  if (statusFilter.value !== "all" && topic.theme.status !== statusFilter.value) {
    return false;
  }

  if (healthFilter.value !== "all" && topic.theme.sourceHealth !== healthFilter.value) {
    return false;
  }

  if (attentionFilter.value === "hot" && !topic.hotEvent) {
    return false;
  }

  if (attentionFilter.value === "open" && topic.openCount === 0) {
    return false;
  }

  if (attentionFilter.value === "tracking" && topic.trackingCount === 0) {
    return false;
  }

  return true;
}).sort((left, right) => {
  if (left.theme.sourceHealth !== right.theme.sourceHealth) {
    return left.theme.sourceHealth === "warning" ? -1 : 1;
  }

  return new Date(right.theme.latestEventAt ?? right.theme.latestRunAt ?? 0).getTime() - new Date(left.theme.latestEventAt ?? left.theme.latestRunAt ?? 0).getTime();
}));

const metrics = computed(() => [
  { label: "全部主题", value: dataset.value.themes.length, description: "当前工作区的长期观察资产总量" },
  { label: "有重点变化", value: topicCards.value.filter((topic) => topic.hotEvent).length, description: "最近出现高优先级变化的主题数" },
  { label: "待处理主题", value: topicCards.value.filter((topic) => topic.openCount > 0).length, description: "仍有待判断事件的主题数" },
  { label: "异常主题", value: topicCards.value.filter((topic) => topic.theme.sourceHealth === 'warning').length, description: "先修复来源，再继续做主题判断" },
]);

function resetFilters() {
  query.value = "";
  statusFilter.value = "all";
  healthFilter.value = "all";
  attentionFilter.value = "all";
}

watch(workspace, (value) => {
  if (!value) {
    void router.replace("/");
  }
}, { immediate: true });

onMounted(() => void load());
</script>
