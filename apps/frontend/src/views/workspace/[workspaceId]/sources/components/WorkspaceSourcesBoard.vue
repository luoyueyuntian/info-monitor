<template>
  <div v-if="workspace" class="page">
    <WorkspacePageHeader
      :workspace="workspace"
      title="来源控制台"
      description="这里只看当前工作区的数据来源。来源健康异常时，先修复采集质量，再继续基于这些数据做结论。"
    />

    <section class="card">
      <div class="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_repeat(4,minmax(140px,1fr))]">
        <input
          v-model="query"
          class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5"
          placeholder="搜索来源、适配器或主题..."
        />
        <select v-model="statusFilter" class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5">
          <option value="all">全部健康状态</option>
          <option value="warning">异常</option>
          <option value="healthy">正常</option>
        </select>
        <select v-model="runFilter" class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5">
          <option value="all">全部运行状态</option>
          <option value="pending">排队中</option>
          <option value="completed">已完成</option>
          <option value="failed">失败</option>
        </select>
        <select v-model="pausedFilter" class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5">
          <option value="all">全部启停状态</option>
          <option value="paused">已暂停</option>
          <option value="active">运行中</option>
        </select>
        <button
          class="rounded-xl bg-btn-primary px-4 py-2.5 font-semibold text-ink-emphasis transition-colors hover:bg-btn-primary-hover"
          @click="resetFilters"
        >
          重置筛选
        </button>
      </div>
    </section>

    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <article class="card" v-for="metric in metrics" :key="metric.label">
        <div class="text-[0.82rem] uppercase tracking-[0.08em] text-ink-label">{{ metric.label }}</div>
        <div class="mt-3 text-[1.6rem] font-semibold text-ink-heading">{{ metric.value }}</div>
        <div class="mt-2 text-[0.9rem] leading-6 text-ink-body">{{ metric.description }}</div>
      </article>
    </section>

    <section class="grid gap-4 xl:grid-cols-2">
      <article
        v-for="source in filteredSources"
        :key="source.id"
        class="rounded-[24px] border border-slate-400/15 bg-white/82 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <span :class="pillToneClass(source.status)">{{ sourceStatusLabel(source.status) }}</span>
              <span :class="pillToneClass(source.latestRunStatus ?? 'pending')">{{ runStatusLabel(source.latestRunStatus) }}</span>
              <span :class="pillToneClass(source.isPaused ? 'pending' : 'active')">{{ source.isPaused ? "已暂停" : "运行中" }}</span>
            </div>
            <h3 class="mt-3 text-[1.1rem] font-semibold text-ink-heading">{{ source.name }}</h3>
          </div>
          <RouterLink
            :to="`/workspace/${workspace.id}/sources/${source.id}`"
            class="rounded-xl border border-slate-400/15 bg-white/80 px-3 py-2 text-[0.86rem] font-semibold text-slate-700 transition-colors hover:bg-white"
          >
            查看详情
          </RouterLink>
        </div>

        <div class="mt-3 grid gap-3 sm:grid-cols-2">
          <div class="rounded-2xl bg-slate-50/90 px-4 py-3">
            <div class="text-[0.8rem] uppercase tracking-[0.08em] text-ink-label">关联主题</div>
            <div class="mt-2 font-semibold text-ink-heading">{{ source.themeName }}</div>
          </div>
          <div class="rounded-2xl bg-slate-50/90 px-4 py-3">
            <div class="text-[0.8rem] uppercase tracking-[0.08em] text-ink-label">最近运行</div>
            <div class="mt-2 font-semibold text-ink-heading">{{ formatSmartDateTimeLabel(source.latestRunAt, referenceNow) }}</div>
          </div>
        </div>

        <div class="mt-3 rounded-2xl border border-slate-400/15 bg-slate-50/80 px-4 py-4 text-[0.92rem] leading-6 text-ink-body">
          <strong class="block text-ink-heading">当前判断</strong>
          <span v-if="source.status === 'warning'">来源异常，当前工作区的结论需要结合错误信息谨慎使用。</span>
          <span v-else-if="source.isPaused">来源已暂停，后续不会自动带来新变化。</span>
          <span v-else>来源运行稳定，可以继续作为当前工作区的判断依据。</span>
        </div>

        <div class="mt-4 flex flex-wrap gap-2.5">
          <button
            class="rounded-xl bg-btn-primary px-3 py-2 text-[0.86rem] font-semibold text-ink-emphasis transition-colors hover:bg-btn-primary-hover disabled:opacity-60"
            :disabled="pendingSourceId === source.id && pendingAction === 'trigger'"
            @click="handleTrigger(source.id)"
          >
            {{ pendingSourceId === source.id && pendingAction === "trigger" ? "入队中..." : "立即运行" }}
          </button>
          <button
            class="rounded-xl border border-slate-400/15 bg-white/80 px-3 py-2 text-[0.86rem] font-semibold text-slate-700 transition-colors hover:bg-white disabled:opacity-60"
            :disabled="pendingSourceId === source.id && pendingAction === 'pause'"
            @click="handleTogglePaused(source.id, true)"
          >
            {{ pendingSourceId === source.id && pendingAction === "pause" ? "更新中..." : "暂停" }}
          </button>
          <button
            class="rounded-xl border border-slate-400/15 bg-white/80 px-3 py-2 text-[0.86rem] font-semibold text-slate-700 transition-colors hover:bg-white disabled:opacity-60"
            :disabled="pendingSourceId === source.id && pendingAction === 'resume'"
            @click="handleTogglePaused(source.id, false)"
          >
            {{ pendingSourceId === source.id && pendingAction === "resume" ? "更新中..." : "恢复" }}
          </button>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { triggerSourceRun, updateSourcePaused } from "../../../../../lib/api";
import {
  formatSmartDateTimeLabel,
  pillToneClass,
  runStatusLabel,
  sourceStatusLabel,
} from "../../../../../lib/presentation";
import { type WorkspaceId } from "../../../../../lib/workspaces";
import WorkspacePageHeader from "../../../components/WorkspacePageHeader.vue";
import { useWorkspaceData } from "../../../shared/useWorkspaceData";

const route = useRoute();
const router = useRouter();
const workspaceId = computed(() => String(route.params.workspaceId ?? "") as WorkspaceId);
const { workspace, dataset, referenceNow, load } = useWorkspaceData(workspaceId);

const query = ref("");
const statusFilter = ref("all");
const runFilter = ref("all");
const pausedFilter = ref("all");
const pendingSourceId = ref("");
const pendingAction = ref("");

const filteredSources = computed(() => dataset.value.sources.filter((source) => {
  const text = `${source.name} ${source.adapterKey} ${source.themeName}`.toLowerCase();

  if (query.value && !text.includes(query.value.toLowerCase())) {
    return false;
  }

  if (statusFilter.value !== "all" && source.status !== statusFilter.value) {
    return false;
  }

  if (runFilter.value !== "all" && (source.latestRunStatus ?? "pending") !== runFilter.value) {
    return false;
  }

  if (pausedFilter.value === "paused" && !source.isPaused) {
    return false;
  }

  if (pausedFilter.value === "active" && source.isPaused) {
    return false;
  }

  return true;
}).sort((left, right) => {
  if (left.status !== right.status) {
    return left.status === "warning" ? -1 : 1;
  }

  return new Date(right.latestRunAt ?? right.latestSuccessAt ?? 0).getTime() - new Date(left.latestRunAt ?? left.latestSuccessAt ?? 0).getTime();
}));

const metrics = computed(() => [
  { label: "来源总数", value: dataset.value.sources.length, description: "当前工作区的全部数据来源" },
  { label: "异常来源", value: dataset.value.sources.filter((source) => source.status === "warning").length, description: "优先修复，避免工作区判断失真" },
  { label: "已暂停", value: dataset.value.sources.filter((source) => source.isPaused).length, description: "处于暂停状态，不会继续自动刷新" },
  { label: "运行失败", value: dataset.value.sources.filter((source) => source.latestRunStatus === "failed").length, description: "最近一轮运行失败，需要回看日志和配置" },
]);

function resetFilters() {
  query.value = "";
  statusFilter.value = "all";
  runFilter.value = "all";
  pausedFilter.value = "all";
}

async function handleTrigger(sourceId: string) {
  pendingSourceId.value = sourceId;
  pendingAction.value = "trigger";

  try {
    await triggerSourceRun(sourceId);
    await load();
  } finally {
    pendingSourceId.value = "";
    pendingAction.value = "";
  }
}

async function handleTogglePaused(sourceId: string, isPaused: boolean) {
  pendingSourceId.value = sourceId;
  pendingAction.value = isPaused ? "pause" : "resume";

  try {
    await updateSourcePaused(sourceId, isPaused);
    await load();
  } finally {
    pendingSourceId.value = "";
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
