<template>
  <div v-if="workspace" class="page">
    <section class="mb-5 rounded-[28px] border border-slate-400/15 bg-[linear-gradient(135deg,#13283a_0%,#244c56_50%,#3f6c55_100%)] px-6 py-6 text-white shadow-[0_22px_50px_rgba(15,23,42,0.22)]">
      <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div class="grid gap-3">
          <div class="inline-flex w-fit items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-white/82">
            竞品画像墙
          </div>
          <div>
            <div class="text-[0.84rem] uppercase tracking-[0.12em] text-white/58">{{ workspace.shortLabel }}</div>
            <h2 class="m-0 text-[2rem] font-semibold tracking-[-0.03em] text-white">把单次变化沉淀成长期观察对象</h2>
          </div>
          <p class="m-0 max-w-[58rem] text-[0.98rem] leading-7 text-white/72">
            从高频变化、来源验证和持续跟踪三条路径组织竞品主题，方便你把零散动作沉淀成稳定观察资产。
          </p>
        </div>

        <div class="grid gap-3 sm:grid-cols-3">
          <div class="rounded-2xl border border-white/12 bg-white/10 px-4 py-3">
            <div class="text-[0.76rem] uppercase tracking-[0.1em] text-white/58">高频变化</div>
            <div class="mt-2 text-[1.15rem] font-semibold text-white">{{ highFrequencyCards.length }}</div>
          </div>
          <div class="rounded-2xl border border-white/12 bg-white/10 px-4 py-3">
            <div class="text-[0.76rem] uppercase tracking-[0.1em] text-white/58">待验证来源</div>
            <div class="mt-2 text-[1.15rem] font-semibold text-white">{{ sourceValidationCards.length }}</div>
          </div>
          <div class="rounded-2xl border border-white/12 bg-white/10 px-4 py-3">
            <div class="text-[0.76rem] uppercase tracking-[0.1em] text-white/58">持续跟踪</div>
            <div class="mt-2 text-[1.15rem] font-semibold text-white">{{ trackingCards.length }}</div>
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

    <section class="grid gap-4 xl:grid-cols-3">
      <article class="card">
        <div class="card-topline">
          <h3>高频变化对象</h3>
          <span class="text-[0.88rem] text-ink-secondary">{{ highFrequencyCards.length }} 个</span>
        </div>
        <div class="grid gap-3">
          <RouterLink
            v-for="card in highFrequencyCards"
            :key="card.theme.id"
            :to="`/workspace/${workspace.id}/topics/${card.theme.id}`"
            class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-4 transition-colors hover:bg-white"
          >
            <TopicCardBody :card="card" :reference-now="referenceNow" />
          </RouterLink>
          <div v-if="!highFrequencyCards.length" class="rounded-2xl bg-slate-50/90 px-4 py-4 text-ink-body">
            当前还没有形成高频变化对象。
          </div>
        </div>
      </article>

      <article class="card">
        <div class="card-topline">
          <h3>待验证来源对象</h3>
          <span class="text-[0.88rem] text-ink-secondary">{{ sourceValidationCards.length }} 个</span>
        </div>
        <div class="grid gap-3">
          <RouterLink
            v-for="card in sourceValidationCards"
            :key="card.theme.id"
            :to="`/workspace/${workspace.id}/topics/${card.theme.id}`"
            class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-4 transition-colors hover:bg-white"
          >
            <TopicCardBody :card="card" :reference-now="referenceNow" />
          </RouterLink>
          <div v-if="!sourceValidationCards.length" class="rounded-2xl bg-slate-50/90 px-4 py-4 text-ink-body">
            当前没有需要先验证来源的对象。
          </div>
        </div>
      </article>

      <article class="card">
        <div class="card-topline">
          <h3>持续跟踪对象</h3>
          <span class="text-[0.88rem] text-ink-secondary">{{ trackingCards.length }} 个</span>
        </div>
        <div class="grid gap-3">
          <RouterLink
            v-for="card in trackingCards"
            :key="card.theme.id"
            :to="`/workspace/${workspace.id}/topics/${card.theme.id}`"
            class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-4 transition-colors hover:bg-white"
          >
            <TopicCardBody :card="card" :reference-now="referenceNow" />
          </RouterLink>
          <div v-if="!trackingCards.length" class="rounded-2xl bg-slate-50/90 px-4 py-4 text-ink-body">
            当前没有进入持续跟踪的对象。
          </div>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, watch, type PropType } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  formatSmartDateTimeLabel,
  pillToneClass,
  sourceHealthLabel,
  themeTypeLabel,
} from "../../../../../lib/presentation";
import { type WorkspaceId } from "../../../../../lib/workspaces";
import {
  buildCompetitorTopicCards,
  type CompetitorTopicCard,
} from "../../../../../workspaces/competitor-watch/intelligence";
import { useWorkspaceData } from "../../../shared/useWorkspaceData";

const TopicCardBody = defineComponent({
  name: "TopicCardBody",
  props: {
    card: {
      type: Object as PropType<CompetitorTopicCard>,
      required: true,
    },
    referenceNow: {
      type: Date,
      required: true,
    },
  },
  setup(props) {
    return () => h("div", { class: "grid gap-3" }, [
      h("div", { class: "flex flex-wrap items-center gap-2" }, [
        h("span", { class: pillToneClass(props.card.theme.sourceHealth === "warning" ? "negative" : "positive") }, themeTypeLabel(props.card.theme.type)),
        h("span", { class: pillToneClass(props.card.theme.sourceHealth) }, sourceHealthLabel(props.card.theme.sourceHealth)),
      ]),
      h("div", { class: "font-semibold text-ink-heading" }, props.card.objectName),
      h("div", { class: "text-[0.9rem] leading-6 text-ink-body" }, props.card.recommendation),
      h("div", { class: "text-[0.86rem] text-ink-secondary" }, `最近动作：${formatSmartDateTimeLabel(props.card.latestOccurredAt, props.referenceNow)}`),
    ]);
  },
});

const route = useRoute();
const router = useRouter();
const workspaceId = computed(() => String(route.params.workspaceId ?? "") as WorkspaceId);
const { workspace, dataset, referenceNow, load } = useWorkspaceData(workspaceId);

const cards = computed(() => buildCompetitorTopicCards(dataset.value, referenceNow.value));

const highFrequencyCards = computed(() =>
  [...cards.value]
    .filter((card) => card.latestOccurredAt)
    .sort((left, right) => right.openCount - left.openCount || right.sourceCount - left.sourceCount)
    .slice(0, 4),
);

const sourceValidationCards = computed(() => cards.value.filter((card) => card.theme.sourceHealth === "warning"));
const trackingCards = computed(() => cards.value.filter((card) => card.trackingCount > 0 && card.theme.sourceHealth !== "warning"));

const metrics = computed(() => [
  { label: "全部对象", value: cards.value.length, description: "当前竞品工作区已纳入的长期观察对象总量" },
  { label: "待判断对象", value: cards.value.filter((card) => card.openCount > 0).length, description: "仍有待判断动作需要先完成分诊的对象数" },
  { label: "待验证来源", value: sourceValidationCards.value.length, description: "需要先确认来源可信度的对象数" },
  { label: "持续跟踪", value: trackingCards.value.length, description: "已经进入低频复盘节奏的对象数" },
]);

watch(workspace, (value) => {
  if (!value) {
    void router.replace("/");
  }
}, { immediate: true });

onMounted(() => void load());
</script>
