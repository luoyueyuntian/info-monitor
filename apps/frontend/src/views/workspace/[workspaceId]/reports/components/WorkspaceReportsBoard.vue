<template>
  <div v-if="workspace" class="page">
    <section
      v-if="workspaceId === 'stock-market'"
      class="mb-5 rounded-[28px] border border-slate-400/15 bg-[linear-gradient(135deg,#102034_0%,#18364f_55%,#25506e_100%)] px-6 py-6 text-white shadow-[0_22px_50px_rgba(15,23,42,0.22)]"
    >
      <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div class="grid gap-3">
          <div class="inline-flex w-fit items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-white/82">
            股市专用工作台
          </div>
          <div>
            <div class="text-[0.84rem] uppercase tracking-[0.12em] text-white/58">{{ workspace.shortLabel }}</div>
            <h2 class="m-0 text-[2rem] font-semibold tracking-[-0.03em] text-white">盘后复盘中心</h2>
          </div>
          <p class="m-0 max-w-[58rem] text-[0.98rem] leading-7 text-white/72">
            把收盘概览、催化归并、重点异动对象、公告线索和连续复盘串成一套真正可执行的股市调查工作流。
          </p>
        </div>

        <div class="grid gap-3 sm:grid-cols-3">
          <div class="rounded-2xl border border-white/12 bg-white/10 px-4 py-3">
            <div class="text-[0.76rem] uppercase tracking-[0.1em] text-white/58">最新状态</div>
            <div class="mt-2 text-[1.15rem] font-semibold text-white">{{ stockMarketHistoryAlert.label }}</div>
          </div>
          <div class="rounded-2xl border border-white/12 bg-white/10 px-4 py-3">
            <div class="text-[0.76rem] uppercase tracking-[0.1em] text-white/58">已保存日报</div>
            <div class="mt-2 text-[1.15rem] font-semibold text-white">{{ stockMarketReportHistory.length }}</div>
          </div>
          <div class="rounded-2xl border border-white/12 bg-white/10 px-4 py-3">
            <div class="text-[0.76rem] uppercase tracking-[0.1em] text-white/58">重点异动对象</div>
            <div class="mt-2 text-[1.15rem] font-semibold text-white">{{ effectiveStockMarketReport?.moverCards.length ?? 0 }}</div>
          </div>
        </div>
      </div>
    </section>

    <WorkspacePageHeader
      v-else
      :workspace="workspace"
      title="工作区报告"
      description="日报、周报和复盘摘要都只聚焦当前工作区，避免跨工作区信息互相污染。"
    />

    <section
      class="grid gap-4"
      :class="workspaceId === 'stock-market' ? 'xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.92fr)]' : 'xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.9fr)]'"
    >
      <article class="card">
        <div class="card-topline">
          <h3>今日摘要</h3>
          <span class="text-[0.88rem] text-ink-secondary">{{ formatSmartDateTimeLabel(summary.updatedAt, referenceNow) }}</span>
        </div>
        <div v-if="workspaceId === 'stock-market'" class="mb-4 flex flex-wrap items-end gap-3">
          <label class="grid gap-1">
            <span class="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-ink-label">选择日期</span>
            <input
              v-model="selectedReportDate"
              type="date"
              class="rounded-xl border border-slate-400/15 bg-white px-3 py-2 text-[0.9rem] text-ink"
              @change="void loadSelectedStockMarketReport()"
            />
          </label>
          <div class="text-[0.86rem] text-ink-secondary">
            {{ selectedReportDateStatus }}
          </div>
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
        <article v-if="effectiveStockMarketReport" :ref="setSectionRef('snapshot')" class="card">
          <div class="card-topline">
            <h3>盘后结构</h3>
            <span class="text-[0.88rem] text-ink-secondary">股市工作区专用</span>
          </div>
          <div class="grid gap-3">
            <div class="rounded-2xl bg-slate-50/90 px-4 py-4 text-[0.95rem] leading-7 text-ink-body">
              {{ effectiveStockMarketReport.headline }}：{{ effectiveStockMarketReport.summary }}
            </div>
            <div :ref="setSectionRef('catalysts')" class="rounded-2xl border border-slate-400/15 bg-white/70 px-4 py-4">
              <strong class="block text-ink-heading">催化归并</strong>
              <div class="mt-3 grid gap-3 lg:grid-cols-3">
                <div class="rounded-xl border border-slate-400/15 bg-slate-50/70 px-3 py-3">
                  <div class="mb-2 text-[0.84rem] font-semibold text-rose-700">主催化</div>
                  <div class="grid gap-2">
                    <div v-for="item in effectiveStockMarketReport.catalystSummary.primary" :key="`primary-${item.title}`" class="text-[0.88rem] leading-6 text-ink-body">
                      <component
                        :is="item.targetThemeId ? 'RouterLink' : 'div'"
                        :to="item.targetThemeId ? { path: `/workspace/${workspace.id}/topics/${item.targetThemeId}`, query: buildReportReturnQuery('catalysts') } : undefined"
                        :class="item.targetThemeId ? 'font-semibold text-ink-link hover:underline' : 'font-semibold text-ink-heading'"
                      >
                        {{ item.title }}
                      </component>
                      <div class="text-ink-secondary">{{ item.summary }}</div>
                    </div>
                    <div v-if="!effectiveStockMarketReport.catalystSummary.primary.length" class="text-[0.84rem] text-ink-secondary">暂无足够强的主催化。</div>
                  </div>
                </div>
                <div class="rounded-xl border border-slate-400/15 bg-slate-50/70 px-3 py-3">
                  <div class="mb-2 text-[0.84rem] font-semibold text-amber-700">次级催化</div>
                  <div class="grid gap-2">
                    <div v-for="item in effectiveStockMarketReport.catalystSummary.secondary" :key="`secondary-${item.title}`" class="text-[0.88rem] leading-6 text-ink-body">
                      <component
                        :is="item.targetThemeId ? 'RouterLink' : 'div'"
                        :to="item.targetThemeId ? { path: `/workspace/${workspace.id}/topics/${item.targetThemeId}`, query: buildReportReturnQuery('catalysts') } : undefined"
                        :class="item.targetThemeId ? 'font-semibold text-ink-link hover:underline' : 'font-semibold text-ink-heading'"
                      >
                        {{ item.title }}
                      </component>
                      <div class="text-ink-secondary">{{ item.summary }}</div>
                    </div>
                    <div v-if="!effectiveStockMarketReport.catalystSummary.secondary.length" class="text-[0.84rem] text-ink-secondary">暂无明确的次级催化。</div>
                  </div>
                </div>
                <div class="rounded-xl border border-slate-400/15 bg-slate-50/70 px-3 py-3">
                  <div class="mb-2 text-[0.84rem] font-semibold text-slate-600">背景噪声</div>
                  <div class="grid gap-2">
                    <div v-for="item in effectiveStockMarketReport.catalystSummary.background" :key="`background-${item.title}`" class="text-[0.88rem] leading-6 text-ink-body">
                      <component
                        :is="item.targetThemeId ? 'RouterLink' : 'div'"
                        :to="item.targetThemeId ? { path: `/workspace/${workspace.id}/topics/${item.targetThemeId}`, query: buildReportReturnQuery('catalysts') } : undefined"
                        :class="item.targetThemeId ? 'font-semibold text-ink-link hover:underline' : 'font-semibold text-ink-heading'"
                      >
                        {{ item.title }}
                      </component>
                      <div class="text-ink-secondary">{{ item.summary }}</div>
                    </div>
                    <div v-if="!effectiveStockMarketReport.catalystSummary.background.length" class="text-[0.84rem] text-ink-secondary">当前没有明显背景噪声线索。</div>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="effectiveStockMarketReport.timeline.length" class="rounded-2xl border border-slate-400/15 bg-white/70 px-4 py-4">
              <strong class="block text-ink-heading">时间线复盘</strong>
              <div class="mt-3 grid gap-3">
                <div
                  v-for="item in effectiveStockMarketReport.timeline"
                  :key="`${item.kind}-${item.title}`"
                  class="rounded-xl border border-slate-400/15 bg-slate-50/70 px-3 py-3"
                >
                  <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-2">
                      <span :class="timelineKindClass(item.kind)">
                        {{ timelineKindLabel(item.kind) }}
                      </span>
                      <RouterLink
                        v-if="item.targetThemeId"
                        :to="{ path: `/workspace/${workspace.id}/topics/${item.targetThemeId}`, query: buildReportReturnQuery('evolution') }"
                        class="text-[0.92rem] font-semibold text-ink-link hover:underline"
                      >
                        {{ item.title }}
                      </RouterLink>
                      <strong v-else class="text-[0.92rem] text-ink-heading">{{ item.title }}</strong>
                    </div>
                    <span class="text-[0.82rem] text-ink-secondary">{{ item.at.slice(11, 16) }}</span>
                  </div>
                  <div class="mt-2 text-[0.88rem] leading-6 text-ink-body">{{ item.summary }}</div>
                </div>
              </div>
            </div>
            <div :ref="setSectionRef('sector')" class="rounded-2xl border border-slate-400/15 bg-white/70 px-4 py-4">
              <strong class="block text-ink-heading">板块主线</strong>
              <ul class="mt-3 grid gap-2 pl-5 text-[0.92rem] leading-6 text-ink-body">
                <li v-for="item in effectiveStockMarketReport.sectorFocus" :key="item">{{ item }}</li>
              </ul>
            </div>
            <div class="rounded-2xl border border-slate-400/15 bg-white/70 px-4 py-4">
              <strong class="block text-ink-heading">异动个股</strong>
              <ul class="mt-3 grid gap-2 pl-5 text-[0.92rem] leading-6 text-ink-body">
                <li v-for="item in effectiveStockMarketReport.moverFocus" :key="item">{{ item }}</li>
              </ul>
            </div>
            <div v-if="effectiveStockMarketReport.moverCards.length" :ref="setSectionRef('movers')" class="rounded-2xl border border-slate-400/15 bg-white/70 px-4 py-4">
              <strong class="block text-ink-heading">重点异动对象</strong>
              <div class="mt-3 grid gap-3">
                <div
                  v-for="card in effectiveStockMarketReport.moverCards"
                  :key="`${card.market}-${card.direction}-${card.code}`"
                  class="rounded-xl border border-slate-400/15 bg-slate-50/70 px-3 py-3"
                >
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <div class="font-semibold text-ink-heading">{{ card.label }}</div>
                      <div class="text-[0.8rem] text-ink-secondary">{{ card.code }} · {{ card.market === "hk" ? "港股" : "A股" }}</div>
                    </div>
                    <span :class="card.direction === 'up' ? 'rounded-full bg-emerald-100 px-2.5 py-1 text-[0.78rem] font-semibold text-emerald-700' : 'rounded-full bg-rose-100 px-2.5 py-1 text-[0.78rem] font-semibold text-rose-700'">
                      {{ card.changeText }}
                    </span>
                  </div>

                  <div v-if="card.reasons.length" class="mt-3 grid gap-1">
                    <div v-for="reason in card.reasons" :key="`${card.code}-${reason}`" class="text-[0.88rem] leading-6 text-ink-body">
                      {{ reason }}
                    </div>
                  </div>

                  <div v-if="card.announcementClues.length" class="mt-3 grid gap-2">
                    <div
                      v-for="item in card.announcementClues"
                      :key="`${card.code}-${item.title}`"
                      class="rounded-lg border border-slate-400/15 bg-white/80 px-3 py-2"
                    >
                      <div class="flex items-center gap-2">
                        <span :class="announcementLevelClass(item.level)">
                          {{ announcementLevelLabel(item.level) }}
                        </span>
                        <component
                          :is="item.targetThemeId ? 'RouterLink' : 'span'"
                          :to="item.targetThemeId ? { path: `/workspace/${workspace.id}/topics/${item.targetThemeId}`, query: buildReportReturnQuery('movers') } : undefined"
                          :class="item.targetThemeId ? 'text-[0.86rem] font-semibold text-ink-link hover:underline' : 'text-[0.86rem] font-semibold text-ink-heading'"
                        >
                          {{ item.title }}
                        </component>
                      </div>
                    </div>
                  </div>

                  <div v-if="card.sourceClues.length" class="mt-3 grid gap-1">
                    <div
                      v-for="item in card.sourceClues"
                      :key="`${card.code}-${item.title}`"
                      class="rounded-lg border border-slate-400/15 bg-white/80 px-3 py-2"
                    >
                      <div class="flex items-center gap-2">
                        <span :class="announcementLevelClass(item.level)">
                          {{ announcementLevelLabel(item.level) }}
                        </span>
                        <component
                          :is="item.targetThemeId ? 'RouterLink' : 'span'"
                          :to="item.targetThemeId ? { path: `/workspace/${workspace.id}/topics/${item.targetThemeId}`, query: buildReportReturnQuery('movers') } : undefined"
                          :class="item.targetThemeId ? 'text-[0.84rem] font-semibold text-ink-link hover:underline' : 'text-[0.84rem] font-semibold text-ink-heading'"
                        >
                          {{ item.title }}
                        </component>
                      </div>
                      <div class="mt-1 text-[0.8rem] leading-5 text-ink-secondary">{{ item.summary }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="effectiveStockMarketReport.sourceClues.length" :ref="setSectionRef('source-clues')" class="rounded-2xl border border-slate-400/15 bg-white/70 px-4 py-4">
              <strong class="block text-ink-heading">来源线索</strong>
              <div class="mt-3 grid gap-2">
                <div
                  v-for="item in effectiveStockMarketReport.sourceClues"
                  :key="`${item.level}-${item.title}`"
                  class="rounded-xl border border-slate-400/15 bg-slate-50/70 px-3 py-2.5"
                >
                  <div class="flex items-center gap-2">
                    <span :class="announcementLevelClass(item.level)">
                      {{ announcementLevelLabel(item.level) }}
                    </span>
                    <component
                      :is="item.targetThemeId ? 'RouterLink' : 'strong'"
                      :to="item.targetThemeId ? { path: `/workspace/${workspace.id}/topics/${item.targetThemeId}`, query: buildReportReturnQuery('source-clues') } : undefined"
                      :class="item.targetThemeId ? 'text-[0.92rem] font-semibold text-ink-link hover:underline' : 'text-[0.92rem] text-ink-heading'"
                    >
                      {{ item.title }}
                    </component>
                  </div>
                  <div class="mt-1 text-[0.88rem] leading-6 text-ink-body">{{ item.summary }}</div>
                </div>
              </div>
            </div>
            <div v-if="effectiveStockMarketReport.announcementFocus.length" :ref="setSectionRef('announcements')" class="rounded-2xl border border-slate-400/15 bg-white/70 px-4 py-4">
              <strong class="block text-ink-heading">公告线索</strong>
              <div class="mt-3 grid gap-2">
                <div
                  v-for="item in effectiveStockMarketReport.announcementFocus"
                  :key="`${item.level}-${item.title}`"
                  class="rounded-xl border border-slate-400/15 bg-slate-50/70 px-3 py-2.5"
                >
                  <div class="flex items-center gap-2">
                    <span :class="announcementLevelClass(item.level)">
                      {{ announcementLevelLabel(item.level) }}
                    </span>
                    <component
                      :is="item.targetThemeId ? 'RouterLink' : 'strong'"
                      :to="item.targetThemeId ? { path: `/workspace/${workspace.id}/topics/${item.targetThemeId}`, query: buildReportReturnQuery('announcements') } : undefined"
                      :class="item.targetThemeId ? 'text-[0.92rem] font-semibold text-ink-link hover:underline' : 'text-[0.92rem] text-ink-heading'"
                    >
                      {{ item.title }}
                    </component>
                  </div>
                  <div class="mt-1 text-[0.88rem] leading-6 text-ink-body">{{ item.summary }}</div>
                </div>
              </div>
            </div>
          </div>
        </article>

        <article v-if="stockMarketReportHistory.length" class="card">
          <div class="card-topline">
            <h3>已保存盘后日报</h3>
            <span class="text-[0.88rem] text-ink-secondary">最近 {{ stockMarketReportHistory.length }} 次</span>
          </div>
          <div class="grid gap-3">
            <div
              v-for="snapshot in stockMarketReportHistory"
              :key="snapshot.id"
              class="rounded-2xl border border-slate-400/15 bg-white/70 px-4 py-4"
            >
              <div class="flex items-center justify-between gap-3">
                <strong class="text-ink-heading">{{ snapshot.report.headline }}</strong>
                <span class="text-[0.86rem] text-ink-secondary">{{ snapshot.date }}</span>
              </div>
              <div class="mt-2 text-[0.92rem] leading-6 text-ink-body">{{ snapshot.report.summary }}</div>
              <ul class="mt-3 grid gap-2 pl-5 text-[0.88rem] leading-6 text-ink-body">
                <li v-for="item in snapshot.report.actionItems.slice(0, 2)" :key="`${snapshot.id}-${item}`">{{ item }}</li>
              </ul>
            </div>
          </div>
        </article>

        <article v-if="stockMarketHistoryEvolution.length > 1" :ref="setSectionRef('evolution')" class="card">
          <div class="card-topline">
            <h3>连续复盘</h3>
            <div class="flex items-center gap-2">
              <span :class="historyAlertClass(stockMarketHistoryAlert.level)">
                {{ stockMarketHistoryAlert.label }}
              </span>
              <span class="text-[0.88rem] text-ink-secondary">最近 {{ stockMarketHistoryEvolution.length }} 个交易日</span>
            </div>
          </div>
          <div class="mb-3 rounded-2xl bg-slate-50/90 px-4 py-4 text-[0.95rem] leading-7 text-ink-body">
            {{ stockMarketHistorySummary }}
          </div>
          <div class="mb-3 rounded-2xl border border-slate-400/15 bg-white/70 px-4 py-4 text-[0.92rem] leading-6 text-ink-body">
            <strong class="block text-ink-heading">连续复盘建议</strong>
            <div class="mt-2">{{ stockMarketHistoryAdvice }}</div>
          </div>
          <div class="grid gap-3">
            <div
              v-for="item in stockMarketHistoryEvolution"
              :key="item.date"
              class="rounded-2xl border border-slate-400/15 bg-white/70 px-4 py-4"
            >
              <div class="flex items-center justify-between gap-3">
                <strong class="text-ink-heading">{{ item.date }}</strong>
                <span class="text-[0.82rem] text-ink-secondary">{{ item.headline }}</span>
              </div>
              <div class="mt-2 grid gap-2 text-[0.9rem] leading-6 text-ink-body">
                <div v-if="item.primaryCatalyst">
                  <span class="font-semibold text-rose-700">主催化:</span>
                  {{ item.primaryCatalyst }}
                  <span :class="evolutionPillClass(item.primaryCatalystTrend)">{{ evolutionLabel(item.primaryCatalystTrend) }}</span>
                </div>
                <div v-if="item.leadSector">
                  <span class="font-semibold text-blue-700">主线板块:</span>
                  {{ item.leadSector }}
                  <span :class="evolutionPillClass(item.leadSectorTrend)">{{ evolutionLabel(item.leadSectorTrend) }}</span>
                </div>
                <div v-if="item.focusMover">
                  <span class="font-semibold text-emerald-700">重点异动:</span>
                  {{ item.focusMover }}
                  <span :class="evolutionPillClass(item.focusMoverTrend)">{{ evolutionLabel(item.focusMoverTrend) }}</span>
                </div>
              </div>
            </div>
          </div>
        </article>

        <article class="card">
          <div class="card-topline">
            <h3>周度脉络</h3>
            <span class="text-[0.88rem] text-ink-secondary">按当前样本推导</span>
          </div>
          <div class="text-[0.95rem] leading-7 text-ink-body">{{ weeklyNarrative }}</div>
        </article>

        <article class="card">
          <div class="card-topline">
            <h3>来源与覆盖</h3>
            <span class="text-[0.88rem] text-ink-secondary">工作区可信度概览</span>
          </div>
          <div class="grid gap-3">
            <div class="rounded-2xl bg-slate-50/90 px-4 py-4">
              <div class="text-[0.8rem] uppercase tracking-[0.08em] text-ink-label">来源总数</div>
              <div class="mt-2 text-[1.35rem] font-semibold text-ink-heading">{{ dataset.sources.length }}</div>
            </div>
            <div class="rounded-2xl bg-slate-50/90 px-4 py-4">
              <div class="text-[0.8rem] uppercase tracking-[0.08em] text-ink-label">异常来源</div>
              <div class="mt-2 text-[1.35rem] font-semibold text-ink-heading">{{ summary.warningSources }}</div>
            </div>
            <div class="text-[0.92rem] leading-6 text-ink-body">
              {{ coverageNarrative }}
            </div>
          </div>
        </article>
      </aside>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch, type ComponentPublicInstance } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  fetchThemeDetail,
  type ThemeDetail,
} from "../../../../../lib/api";
import { formatSmartDateTimeLabel } from "../../../../../lib/presentation";
import { buildStockMarketCloseReport } from "../../../../../lib/stock-market-report";
import {
  clearSelectedStockMarketReportDate,
  refreshStockMarketReportState,
  selectStockMarketReportDate,
  useStockMarketReportState,
} from "../../../../../lib/stock-market-report-state";
import { buildWorkspaceSummary, sortWorkspaceEvents, type WorkspaceId } from "../../../../../lib/workspaces";
import WorkspacePageHeader from "../../../components/WorkspacePageHeader.vue";
import { useWorkspaceData } from "../../../shared/useWorkspaceData";

const route = useRoute();
const router = useRouter();
const workspaceId = computed(() => String(route.params.workspaceId ?? "") as WorkspaceId);
const { workspace, dataset, referenceNow, load } = useWorkspaceData(workspaceId);
const stockMarketThemeDetail = ref<ThemeDetail | null>(null);
const {
  report: savedStockMarketReport,
  history: stockMarketReportHistory,
  selectedSnapshot,
} = useStockMarketReportState();
const defaultReportDate = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" });
const selectedReportDate = ref(typeof route.query.date === "string" ? route.query.date : defaultReportDate);
const sectionRefs = ref<Record<string, HTMLElement | null>>({});

const summary = computed(() => buildWorkspaceSummary(dataset.value));
const sortedEvents = computed(() => sortWorkspaceEvents(dataset.value.events));

const stockMarketOverview = computed(() => stockMarketThemeDetail.value?.marketOverview ?? null);
const stockMarketReport = computed(() => buildStockMarketCloseReport(stockMarketThemeDetail.value));
const effectiveStockMarketReport = computed(
  () => selectedSnapshot.value?.report ?? savedStockMarketReport.value ?? stockMarketReport.value,
);

function setSectionRef(sectionId: string) {
  return (element: Element | ComponentPublicInstance | null) => {
    sectionRefs.value[sectionId] = element instanceof HTMLElement ? element : null;
  };
}

function scrollToSection(sectionId: string) {
  const node = sectionRefs.value[sectionId];
  if (!node) {
    return;
  }

  node.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function focusRequestedSection() {
  await nextTick();

  const focus = route.query.focus;
  if (typeof focus === "string" && sectionRefs.value[focus]) {
    scrollToSection(focus);
  }
}

type EvolutionTrend = "continued" | "switched" | "new" | "none";

function inferTrend(currentValue: string, previousValue: string): EvolutionTrend {
  if (!currentValue) {
    return "none";
  }

  if (!previousValue) {
    return "new";
  }

  return currentValue === previousValue ? "continued" : "switched";
}

const stockMarketHistoryEvolution = computed(() => {
  const ordered = [...stockMarketReportHistory.value]
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((snapshot) => {
      const primaryCatalyst = snapshot.report.catalystSummary.primary[0]?.title ?? "";
      const leadSector = snapshot.report.sectorFocus[0] ?? "";
      const focusMover = snapshot.report.moverCards[0]
        ? `${snapshot.report.moverCards[0].label} ${snapshot.report.moverCards[0].changeText}`
        : snapshot.report.moverFocus[0] ?? "";

      return {
        date: snapshot.date,
        headline: snapshot.report.headline,
        primaryCatalyst,
        leadSector,
        focusMover,
      };
    });

  return ordered.map((item, index) => {
    const previous = index > 0 ? ordered[index - 1] : null;
    return {
      ...item,
      primaryCatalystTrend: inferTrend(item.primaryCatalyst, previous?.primaryCatalyst ?? ""),
      leadSectorTrend: inferTrend(item.leadSector, previous?.leadSector ?? ""),
      focusMoverTrend: inferTrend(item.focusMover, previous?.focusMover ?? ""),
    };
  });
});
const stockMarketHistorySummary = computed(() => {
  if (stockMarketHistoryEvolution.value.length < 2) {
    return "当前连续样本不足，还无法总结最近几天的股市主线演变。";
  }

  const latest = stockMarketHistoryEvolution.value[stockMarketHistoryEvolution.value.length - 1];
  const primaryText = latest.primaryCatalyst
    ? `主催化 ${latest.primaryCatalystTrend === "continued" ? "延续为" : latest.primaryCatalystTrend === "switched" ? "切换到" : "新出现为"}「${latest.primaryCatalyst}」`
    : "主催化暂不明确";
  const sectorText = latest.leadSector
    ? `主线板块 ${latest.leadSectorTrend === "continued" ? "仍集中在" : latest.leadSectorTrend === "switched" ? "切换到" : "新聚焦到"}「${latest.leadSector}」`
    : "主线板块暂不明确";
  const moverText = latest.focusMover
    ? `重点异动 ${latest.focusMoverTrend === "continued" ? "继续围绕" : latest.focusMoverTrend === "switched" ? "切换到" : "新出现于"}「${latest.focusMover}」`
    : "重点异动暂不明确";

  return `最近 ${stockMarketHistoryEvolution.value.length} 个交易日里，${primaryText}，${sectorText}，${moverText}。`;
});
const stockMarketHistoryAlert = computed(() => {
  if (stockMarketHistoryEvolution.value.length < 2) {
    return { level: "neutral" as const, label: "样本不足" };
  }

  const latest = stockMarketHistoryEvolution.value[stockMarketHistoryEvolution.value.length - 1];
  const continuedCount = [
    latest.primaryCatalystTrend,
    latest.leadSectorTrend,
    latest.focusMoverTrend,
  ].filter((item) => item === "continued").length;
  const switchedCount = [
    latest.primaryCatalystTrend,
    latest.leadSectorTrend,
    latest.focusMoverTrend,
  ].filter((item) => item === "switched").length;

  if (continuedCount >= 2) {
    return { level: "positive" as const, label: "主线强化" };
  }

  if (switchedCount >= 2) {
    return { level: "warning" as const, label: "主线切换" };
  }

  if (switchedCount >= 1 && continuedCount >= 1) {
    return { level: "negative" as const, label: "高波动分歧" };
  }

  return { level: "neutral" as const, label: "震荡观察" };
});
const stockMarketHistoryAdvice = computed(() => {
  switch (stockMarketHistoryAlert.value.label) {
    case "主线强化":
      return "当前主催化和主线板块仍在延续，适合继续围绕现有强势主线复盘，并重点跟踪是否出现新的接力个股。";
    case "主线切换":
      return "当前市场主线正在切换，建议降低对旧主线的惯性判断，优先核对新主催化和新板块是否真的得到资金承接。";
    case "高波动分歧":
      return "当前既有延续也有切换，说明市场分歧较大。建议先缩小观察范围，优先确认高相关催化和真正能承接的板块。";
    case "震荡观察":
      return "当前没有形成明确的连续强化或切换，适合继续观察下一交易日是否会出现更清晰的主线方向。";
    default:
      return "当前样本还不够，建议继续积累更多交易日的盘后日报再判断趋势。";
  }
});
const selectedReportDateStatus = computed(() => {
  if (workspaceId.value !== "stock-market") {
    return "";
  }

  if (selectedSnapshot.value) {
    return `正在查看 ${selectedReportDate.value} 的已保存盘后日报`;
  }

  return selectedReportDate.value === new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" })
    ? "当前日期会优先显示今天的盘后报告"
    : `当前没有 ${selectedReportDate.value} 的已保存盘后日报`;
});

const stockMarketTheme = computed(() => {
  if (workspaceId.value !== "stock-market") {
    return null;
  }

  return dataset.value.themes.find((theme) => theme.id === "theme-cn-hk-market-overview") ?? null;
});

function buildReportReturnQuery(focus: string) {
  return {
    returnTo: "stock-report",
    reportDate: selectedReportDate.value,
    reportFocus: focus,
  };
}

const dailyNarrative = computed(() => {
  if (workspaceId.value === "stock-market" && stockMarketOverview.value) {
    const highlights = stockMarketOverview.value.crossMarketHighlights.join("，");
    const actionLead = effectiveStockMarketReport.value?.actionItems[0];
    return `今日盘后股市复盘：${stockMarketOverview.value.summary} 当前主结论是「${highlights || stockMarketOverview.value.headline}」。${actionLead ?? "建议先确认 A股 与 港股 是否仍在同一方向上，再决定明天优先追踪哪些板块和异动个股。"}`;
  }

  return `${workspace.value?.label ?? "当前工作区"} 今日共新增 ${summary.value.newMessages} 条消息，出现 ${summary.value.majorEvents} 条重大事件，当前仍有 ${summary.value.openActions} 条待处理动作。你可以先从动作页清理待判断事件，再回到主题页沉淀结论。`;
});

const weeklyNarrative = computed(() => {
  if (workspaceId.value === "stock-market" && stockMarketOverview.value) {
    const snapshots = stockMarketOverview.value.snapshots;
    const aShare = snapshots.find((item) => item.market === "a_share");
    const hk = snapshots.find((item) => item.market === "hk");
    return [
      aShare ? `A股当前判断：${aShare.headline}，资金 ${aShare.fundFlowDirection === "inflow" ? "偏流入" : aShare.fundFlowDirection === "outflow" ? "偏流出" : "基本持平"}。` : null,
      hk ? `港股当前判断：${hk.headline}，资金 ${hk.fundFlowDirection === "inflow" ? "偏流入" : hk.fundFlowDirection === "outflow" ? "偏流出" : "基本持平"}。` : null,
      "最近的股市工作流应优先围绕收盘后的板块资金、个股异动和跨市场分化来做连续复盘。",
    ].filter(Boolean).join(" ");
  }

  if (!dataset.value.events.length) {
    return "当前样本不足，还无法形成稳定的周度节奏判断。";
  }

  return `${workspace.value?.label ?? "当前工作区"} 在当前样本中共有 ${dataset.value.events.length} 条事件、${dataset.value.themes.length} 个主题和 ${dataset.value.sources.length} 个来源。最近的变化集中在 ${sortedEvents.value.slice(0, 2).map((event) => event.themeName).join("、") || "暂无主题"}，适合继续围绕这些主题做下一轮复盘。`;
});

const majorBullets = computed(() => {
  if (workspaceId.value === "stock-market" && stockMarketOverview.value) {
    return effectiveStockMarketReport.value?.keySignals.slice(0, 4) ?? stockMarketOverview.value.snapshots.flatMap((snapshot) => snapshot.highlights.slice(0, 2)).slice(0, 4);
  }

  if (!sortedEvents.value.length) {
    return ["当前没有可供总结的事件。"];
  }

  return sortedEvents.value.slice(0, 3).map((event) => `${event.themeName}：${event.title}`);
});

const actionBullets = computed(() => {
  const bullets = [];

  if (workspaceId.value === "stock-market" && stockMarketOverview.value) {
    bullets.push(...(effectiveStockMarketReport.value?.actionItems ?? []));

    if (summary.value.warningSources > 0) {
      bullets.push(`先修复 ${summary.value.warningSources} 个异常来源，避免盘后结论被坏数据误导。`);
    }

    return bullets.length ? bullets : ["当前股市工作区状态平稳，适合继续围绕盘后主线做复盘。"];
  }

  if (summary.value.openActions > 0) {
    bullets.push(`优先处理 ${summary.value.openActions} 条待判断动作，避免高优先级事件滞留。`);
  }

  if (summary.value.warningSources > 0) {
    bullets.push(`排查 ${summary.value.warningSources} 个异常来源，先保证当前工作区判断可信。`);
  }

  if (dataset.value.themes.some((theme) => theme.status === "paused")) {
    bullets.push("检查已暂停主题是否仍然值得继续监控。");
  }

  if (!bullets.length) {
    bullets.push("当前工作区状态平稳，可以把精力放在趋势复盘和主题笔记上。");
  }

  return bullets;
});

const coverageNarrative = computed(() => {
  if (workspaceId.value === "stock-market" && stockMarketOverview.value) {
    const snapshots = stockMarketOverview.value.snapshots.length;
    if (summary.value.warningSources > 0) {
      return `当前股市工作区已覆盖 ${snapshots} 个市场快照维度，但存在异常来源。建议先修复抓取链路，再使用盘后报告做判断。`;
    }

    return `当前股市工作区已覆盖 ${snapshots} 个市场快照维度，并包含指数、资金流和异动结构，适合直接用于盘后复盘。`;
  }

  if (!dataset.value.sources.length) {
    return "当前工作区还没有接入来源。";
  }

  if (summary.value.warningSources > 0) {
    return "来源覆盖已经建立，但存在异常节点。建议先修复异常来源，再把工作区内的主题判断沉淀为长期结论。";
  }

  return "来源整体稳定，可以把更多精力放在判断、复盘和行动节奏上。";
});

async function loadStockMarketThemeDetail() {
  if (!stockMarketTheme.value) {
    stockMarketThemeDetail.value = null;
    return;
  }

  stockMarketThemeDetail.value = await fetchThemeDetail(stockMarketTheme.value.id);
}

async function persistTodayStockMarketReport() {
  if (workspaceId.value !== "stock-market") {
    return;
  }

  await refreshStockMarketReportState({ historyLimit: 5, saveToday: true });
}

async function loadSelectedStockMarketReport() {
  if (workspaceId.value !== "stock-market") {
    clearSelectedStockMarketReportDate();
    return;
  }

  await selectStockMarketReportDate(selectedReportDate.value);
}

watch(workspace, (value) => {
  if (!value) {
    void router.replace("/");
  }
}, { immediate: true });

watch(
  () => [workspaceId.value, stockMarketTheme.value?.id],
  async () => {
    if (workspaceId.value === "stock-market") {
      await loadStockMarketThemeDetail();
      await refreshStockMarketReportState({ historyLimit: 5 });
      await persistTodayStockMarketReport();
      await loadSelectedStockMarketReport();
      await focusRequestedSection();
      return;
    }

    stockMarketThemeDetail.value = null;
    clearSelectedStockMarketReportDate();
  },
  { immediate: true },
);

watch(
  () => route.query.date,
  async (value) => {
    const nextDate = typeof value === "string" ? value : defaultReportDate;
    if (selectedReportDate.value !== nextDate) {
      selectedReportDate.value = nextDate;
      await loadSelectedStockMarketReport();
      await focusRequestedSection();
    }
  },
);

watch(
  () => route.query.focus,
  async () => {
    await focusRequestedSection();
  },
);

onMounted(() => void load());

function announcementLevelLabel(level: "high" | "medium" | "low") {
  switch (level) {
    case "high": return "高相关";
    case "medium": return "可能相关";
    default: return "背景线索";
  }
}

function announcementLevelClass(level: "high" | "medium" | "low") {
  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-[0.78rem] font-semibold";
  switch (level) {
    case "high": return `${base} bg-rose-100 text-rose-700`;
    case "medium": return `${base} bg-amber-100 text-amber-700`;
    default: return `${base} bg-slate-100 text-slate-600`;
  }
}

function timelineKindLabel(kind: "market_close" | "primary_catalyst" | "secondary_catalyst" | "mover") {
  switch (kind) {
    case "market_close": return "收盘概览";
    case "primary_catalyst": return "主催化";
    case "secondary_catalyst": return "次级催化";
    default: return "重点异动";
  }
}

function timelineKindClass(kind: "market_close" | "primary_catalyst" | "secondary_catalyst" | "mover") {
  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-[0.78rem] font-semibold";
  switch (kind) {
    case "market_close": return `${base} bg-blue-100 text-blue-700`;
    case "primary_catalyst": return `${base} bg-rose-100 text-rose-700`;
    case "secondary_catalyst": return `${base} bg-amber-100 text-amber-700`;
    default: return `${base} bg-emerald-100 text-emerald-700`;
  }
}

function evolutionLabel(trend: EvolutionTrend) {
  switch (trend) {
    case "continued": return "延续";
    case "switched": return "切换";
    case "new": return "新出现";
    default: return "暂无";
  }
}

function evolutionPillClass(trend: EvolutionTrend) {
  const base = "ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[0.76rem] font-semibold";
  switch (trend) {
    case "continued": return `${base} bg-emerald-100 text-emerald-700`;
    case "switched": return `${base} bg-amber-100 text-amber-700`;
    case "new": return `${base} bg-blue-100 text-blue-700`;
    default: return `${base} bg-slate-100 text-slate-500`;
  }
}

function historyAlertClass(level: "positive" | "warning" | "negative" | "neutral") {
  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-[0.78rem] font-semibold";
  switch (level) {
    case "positive": return `${base} bg-emerald-100 text-emerald-700`;
    case "warning": return `${base} bg-amber-100 text-amber-700`;
    case "negative": return `${base} bg-rose-100 text-rose-700`;
    default: return `${base} bg-slate-100 text-slate-600`;
  }
}
</script>
