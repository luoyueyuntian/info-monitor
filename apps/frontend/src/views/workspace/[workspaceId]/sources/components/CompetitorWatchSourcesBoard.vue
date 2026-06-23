<template>
  <div v-if="workspace" class="page">
    <section class="mb-5 rounded-[28px] border border-slate-400/15 bg-[linear-gradient(135deg,#1c2333_0%,#214457_48%,#2f6b62_100%)] px-6 py-6 text-white shadow-[0_22px_50px_rgba(15,23,42,0.2)]">
      <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div class="grid gap-3">
          <div class="inline-flex w-fit items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-white/82">
            竞品来源台
          </div>
          <div>
            <div class="text-[0.84rem] uppercase tracking-[0.12em] text-white/58">{{ workspace.shortLabel }}</div>
            <h2 class="m-0 text-[2rem] font-semibold tracking-[-0.03em] text-white">先判断哪些渠道能信，哪些渠道要复核</h2>
          </div>
          <p class="m-0 max-w-[58rem] text-[0.98rem] leading-7 text-white/72">
            按对象和来源健康度整理竞品渠道，优先排查异常抓取，再决定当前动作结论能不能直接使用。
          </p>
        </div>

        <div class="grid gap-3 sm:grid-cols-3">
          <div class="rounded-2xl border border-white/12 bg-white/10 px-4 py-3">
            <div class="text-[0.76rem] uppercase tracking-[0.1em] text-white/58">来源总数</div>
            <div class="mt-2 text-[1.15rem] font-semibold text-white">{{ dataset.sources.length }}</div>
          </div>
          <div class="rounded-2xl border border-white/12 bg-white/10 px-4 py-3">
            <div class="text-[0.76rem] uppercase tracking-[0.1em] text-white/58">待验证来源</div>
            <div class="mt-2 text-[1.15rem] font-semibold text-white">{{ warningSources.length }}</div>
          </div>
          <div class="rounded-2xl border border-white/12 bg-white/10 px-4 py-3">
            <div class="text-[0.76rem] uppercase tracking-[0.1em] text-white/58">覆盖对象</div>
            <div class="mt-2 text-[1.15rem] font-semibold text-white">{{ coveredObjectCount }}</div>
          </div>
        </div>
      </div>
    </section>

    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <article v-for="metric in metrics" :key="metric.label" class="card">
        <div class="text-[0.82rem] uppercase tracking-[0.08em] text-ink-label">{{ metric.label }}</div>
        <div class="mt-3 text-[1.6rem] font-semibold text-ink-heading">{{ metric.value }}</div>
        <div class="mt-2 text-[0.9rem] leading-6 text-ink-body">{{ metric.description }}</div>
      </article>
    </section>

    <WorkspaceSourceCatalogCard
      :workspace-id="workspaceId"
      :workspace-themes="dataset.themes"
      :workspace-sources="dataset.sources"
      :all-sources="allSources"
      :all-themes="allThemes"
      :load="load"
    />

    <section class="grid gap-4 xl:grid-cols-2">
      <article class="card">
        <div class="card-topline">
          <h3>待验证来源</h3>
          <span class="text-[0.88rem] text-ink-secondary">{{ warningSources.length }} 个</span>
        </div>
        <div v-if="warningSources.length" class="grid gap-3">
          <RouterLink
            v-for="source in warningSources"
            :key="source.id"
            :to="`/workspace/${workspace.id}/sources/${source.id}`"
            class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-4 transition-colors hover:bg-white"
          >
            <div class="flex flex-wrap items-center gap-2">
              <span :class="pillToneClass('negative')">{{ sourceHealthLabel(source.status) }}</span>
              <span :class="pillToneClass(source.latestRunStatus ?? 'pending')">{{ runStatusLabel(source.latestRunStatus) }}</span>
            </div>
            <div class="mt-3 font-semibold text-ink-heading">{{ resolveSourceObjectName(source) }}</div>
            <div class="mt-1 text-[0.88rem] text-ink-secondary">{{ source.name }} · {{ source.themeName }}</div>
            <div class="mt-2 text-[0.92rem] leading-6 text-ink-body">
              最近运行：{{ formatSmartDateTimeLabel(source.latestRunAt, referenceNow) }}
            </div>
          </RouterLink>
        </div>
        <div v-else class="rounded-2xl bg-slate-50/90 px-4 py-4 text-ink-body">
          当前没有需要优先复核的异常来源。
        </div>
      </article>

      <article class="card">
        <div class="card-topline">
          <h3>稳定覆盖来源</h3>
          <span class="text-[0.88rem] text-ink-secondary">{{ healthySources.length }} 个</span>
        </div>
        <div v-if="healthySources.length" class="grid gap-3">
          <RouterLink
            v-for="source in healthySources"
            :key="source.id"
            :to="`/workspace/${workspace.id}/sources/${source.id}`"
            class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-4 transition-colors hover:bg-white"
          >
            <div class="flex flex-wrap items-center gap-2">
              <span :class="pillToneClass('positive')">{{ sourceHealthLabel(source.status) }}</span>
              <span :class="pillToneClass(source.latestRunStatus ?? 'pending')">{{ runStatusLabel(source.latestRunStatus) }}</span>
            </div>
            <div class="mt-3 font-semibold text-ink-heading">{{ resolveSourceObjectName(source) }}</div>
            <div class="mt-1 text-[0.88rem] text-ink-secondary">{{ source.name }} · {{ source.themeName }}</div>
            <div class="mt-2 text-[0.92rem] leading-6 text-ink-body">
              最近运行：{{ formatSmartDateTimeLabel(source.latestRunAt, referenceNow) }}
            </div>
          </RouterLink>
        </div>
        <div v-else class="rounded-2xl bg-slate-50/90 px-4 py-4 text-ink-body">
          当前还没有稳定运行的竞品来源。
        </div>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  formatSmartDateTimeLabel,
  pillToneClass,
  runStatusLabel,
  sourceHealthLabel,
} from "../../../../../lib/presentation";
import type { SourceStatus, ThemeSummary } from "../../../../../lib/api";
import { type WorkspaceId } from "../../../../../lib/workspaces";
import WorkspaceSourceCatalogCard from "./WorkspaceSourceCatalogCard.vue";
import { useWorkspaceData } from "../../../shared/useWorkspaceData";

const route = useRoute();
const router = useRouter();
const workspaceId = computed(() => String(route.params.workspaceId ?? "") as WorkspaceId);
const { workspace, dataset, allSources, allThemes, referenceNow, load } = useWorkspaceData(workspaceId);

const themesById = computed(() => new Map(dataset.value.themes.map((theme) => [theme.id, theme])));

function themeObjectName(theme?: ThemeSummary) {
  return theme?.name ?? "未命名对象";
}

function resolveSourceObjectName(source: SourceStatus) {
  return themeObjectName(themesById.value.get(source.themeId));
}

const warningSources = computed(() =>
  dataset.value.sources
    .filter((source) => source.status === "warning")
    .sort((left, right) => new Date(right.latestRunAt ?? 0).getTime() - new Date(left.latestRunAt ?? 0).getTime()),
);

const healthySources = computed(() =>
  dataset.value.sources
    .filter((source) => source.status !== "warning")
    .sort((left, right) => new Date(right.latestRunAt ?? 0).getTime() - new Date(left.latestRunAt ?? 0).getTime()),
);

const coveredObjectCount = computed(() => new Set(dataset.value.sources.map((source) => resolveSourceObjectName(source))).size);

const metrics = computed(() => [
  { label: "异常来源", value: warningSources.value.length, description: "优先验证后再决定动作结论是否可信" },
  { label: "稳定来源", value: healthySources.value.length, description: "当前可直接支撑竞品动作判断的渠道数" },
  { label: "覆盖对象", value: coveredObjectCount.value, description: "已经有来源持续覆盖的竞品或产品对象数" },
  { label: "最近运行", value: formatSmartDateTimeLabel(dataset.value.sources[0]?.latestRunAt, referenceNow.value), description: "按当前样本看到的最新一次来源运行时间" },
]);

watch(workspace, (value) => {
  if (!value) {
    void router.replace("/");
  }
}, { immediate: true });

onMounted(() => void load());
</script>
