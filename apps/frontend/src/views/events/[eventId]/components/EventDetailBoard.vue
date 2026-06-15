<template>
  <section class="page" v-if="detail">
    <EventDetailHeader
      :title="detail.title"
      :summary="detail.summary"
      :handle-back="handleBack"
    />

    <StockMarketInvestigationCard
      v-if="isStockMarketWorkspace"
      title="股市调查快捷区"
      summary="从这里快速切到盘后报告、动作台和关联主题，保持在股市板块内完成调查闭环。"
      :actions="stockMarketInvestigationActions"
    />

    <StockMarketSignalContextCard
      v-if="isStockMarketWorkspace"
      title="股市事件上下文"
      :summary="stockMarketContextSummary"
      :bullets="stockMarketContextBullets"
    />

    <EventDetailSummaryCard :detail="detail" />

    <EventDetailStatusCard
      :status="detail.status ?? 'open'"
      :saving="savingStatus"
      :pending-status="pendingStatus"
      :handle-update-status="handleUpdateStatus"
    />

    <EventDetailMetaActionsCard
      :is-read="Boolean(detail.isRead)"
      :is-bookmarked="Boolean(detail.isBookmarked)"
      :saving="savingMeta"
      :pending-action="pendingMetaAction"
      :handle-update-meta="handleUpdateMeta"
    />

    <EventDetailNoticeCard
      v-if="operationNotice"
      title="操作结果"
      :body="operationNotice.message"
      :actions="operationNotice.actions"
    />

    <EventDetailStatusHistoryCard
      v-if="detail.statusHistory?.length"
      :status-history="detail.statusHistory"
    />

    <EventDetailTriggerReasonCard
      v-if="detail.triggerReason"
      :trigger-reason="detail.triggerReason"
    />

    <EventDetailExplanationCard :explanation="detail.explanation" :review-actions="reviewActions" />

    <EventDetailThemeCard
      :theme-name="detail.themeName"
      :related-theme-summary="relatedThemeSummary"
      :theme-analysis-target="themeAnalysisTarget"
      :theme-queue-target="themeQueueTarget"
      :theme-trend-target="themeTrendTarget"
      :theme-timeline-target="themeTimelineTarget"
    />

    <EventDetailContextCard :rows="detailRows" :record-link="recordLink" />
    <EventDetailEvidenceCard :evidence="detail.evidence" />

    <EventFeedbackCard :event-id="detail.id" />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { RouteLocationRaw } from "vue-router";

import EventDetailContextCard from "./EventDetailContextCard.vue";
import EventDetailEvidenceCard from "./EventDetailEvidenceCard.vue";
import EventDetailExplanationCard from "./EventDetailExplanationCard.vue";
import EventFeedbackCard from "../../../../components/EventFeedbackCard.vue";
import EventDetailHeader from "./EventDetailHeader.vue";
import EventDetailMetaActionsCard from "./EventDetailMetaActionsCard.vue";
import EventDetailNoticeCard from "./EventDetailNoticeCard.vue";
import { buildEventDetailReviewActions } from "./event-detail-review-actions";
import EventDetailStatusHistoryCard from "./EventDetailStatusHistoryCard.vue";
import EventDetailStatusCard from "./EventDetailStatusCard.vue";
import EventDetailSummaryCard from "./EventDetailSummaryCard.vue";
import EventDetailThemeCard from "./EventDetailThemeCard.vue";
import EventDetailTriggerReasonCard from "./EventDetailTriggerReasonCard.vue";
import StockMarketInvestigationCard from "../../../workspace/components/StockMarketInvestigationCard.vue";
import StockMarketSignalContextCard from "../../../workspace/components/StockMarketSignalContextCard.vue";
import { buildSingleEventOperationNotice } from "../../components/event-operation-feedback";
import { fetchEventDetail, type EventDetail, updateEvent, updateEventStatus } from "../../../../lib/api";
import { recordRecentEventOperation } from "../../../../lib/recent-event-operation";
import { buildStockReportReturnQuery } from "../../../../lib/stock-market-report-navigation";
import {
  eventSignalLabel,
  formatMaybeLabel,
} from "../../../../lib/presentation";

const route = useRoute();
const router = useRouter();
const detail = ref<EventDetail | null>(null);
const savingStatus = ref(false);
const pendingStatus = ref("");
const savingMeta = ref(false);
const pendingMetaAction = ref("");
const operationNotice = ref<{
  message: string;
  actions: Array<{ label: string; to: RouteLocationRaw }>;
} | null>(null);
const isStockMarketWorkspace = computed(() => String(route.params.workspaceId ?? "") === "stock-market");
const stockMarketInvestigationActions = computed<Array<{ label: string; to: RouteLocationRaw }>>(() => {
  if (!detail.value || !isStockMarketWorkspace.value) {
    return [];
  }

  const actions: Array<{ label: string; to: RouteLocationRaw }> = [
    { label: "返回动作台", to: `/workspace/stock-market/actions` },
    { label: "查看关联主题", to: `/workspace/stock-market/topics/${detail.value.themeId}` },
  ];

  if (detail.value.context?.event_class === "daily_billboard") {
    actions.unshift({ label: "查看重点异动对象", to: { path: "/workspace/stock-market/reports", query: { focus: "movers", date: typeof route.query.reportDate === "string" ? route.query.reportDate : undefined } } });
    actions.push({ label: "查看来源线索", to: { path: "/workspace/stock-market/reports", query: { focus: "source-clues", date: typeof route.query.reportDate === "string" ? route.query.reportDate : undefined } } });
    return actions;
  }

  if (detail.value.context?.event_class === "market_overview") {
    actions.unshift({ label: "查看收盘概览", to: { path: "/workspace/stock-market/reports", query: { focus: "snapshot", date: typeof route.query.reportDate === "string" ? route.query.reportDate : undefined } } });
    actions.push({ label: "查看板块主线", to: { path: "/workspace/stock-market/reports", query: { focus: "sector", date: typeof route.query.reportDate === "string" ? route.query.reportDate : undefined } } });
    return actions;
  }

  actions.unshift({ label: "查看公告线索", to: { path: "/workspace/stock-market/reports", query: { focus: "announcements", date: typeof route.query.reportDate === "string" ? route.query.reportDate : undefined } } });
  return actions;
});
const stockMarketContextSummary = computed(() => {
  if (!detail.value) {
    return "";
  }

  if (detail.value.context?.event_class === "daily_billboard") {
    return "这条事件属于龙虎榜异动线索，适合结合净额方向、涨跌幅和相关公告一起判断是否只是情绪脉冲，还是更强的主线异动。";
  }

  if (detail.value.context?.event_class === "market_overview") {
    return "这条事件属于盘后市场总览的一部分，适合放回股市盘后报告里和主催化、主线板块、重点异动对象一起看。";
  }

  return "这条事件已经处在股市工作区内，适合优先结合盘后报告、关联主题和来源线索一起调查。";
});
const stockMarketContextBullets = computed(() => {
  if (!detail.value) {
    return [];
  }

  const bullets: string[] = [];
  const context = detail.value.context ?? {};

  if (context.security_name) {
    bullets.push(`相关个股: ${formatMaybeLabel(context.security_name)} (${formatMaybeLabel(context.security_code)})`);
  }

  if (context.change_rate_percent != null) {
    bullets.push(`当日涨跌幅: ${formatMaybeLabel(context.change_rate_percent)}%`);
  }

  if (context.amount_billion_cny != null) {
    bullets.push(`相关净额/金额: ${formatMaybeLabel(context.amount_billion_cny)} 亿元`);
  }

  if (context.market_label) {
    bullets.push(`所属市场: ${formatMaybeLabel(context.market_label)}`);
  }

  if (detail.value.sourceName) {
    bullets.push(`数据来源: ${detail.value.sourceName}`);
  }

  return bullets.slice(0, 4);
});
const stockReportQuery = computed(() => buildStockReportReturnQuery({
  reportDate: typeof route.query.reportDate === "string" ? route.query.reportDate : null,
  reportFocus: typeof route.query.reportFocus === "string" ? route.query.reportFocus : null,
}));

function handleBack() {
  if (isStockMarketWorkspace.value && route.query.returnTo === "stock-report") {
    void router.push({
      path: "/workspace/stock-market/reports",
      query: {
        date: typeof route.query.reportDate === "string" ? route.query.reportDate : undefined,
        focus: typeof route.query.reportFocus === "string" ? route.query.reportFocus : undefined,
      },
    });
    return;
  }

  if (window.history.length > 1) {
    router.back();
    return;
  }

  const workspaceId = route.params.workspaceId;
  void router.push(typeof workspaceId === "string" ? `/workspace/${workspaceId}/actions` : "/");
}

const detailRows = computed(() => {
  if (!detail.value) {
    return [];
  }

  const context = detail.value.context ?? {};

  if (detail.value.infoType === "price") {
    return [
      { label: "价格", value: formatMaybeLabel(context.price) },
      { label: "币种", value: formatMaybeLabel(context.currency) },
      { label: "规格", value: formatMaybeLabel(context.spec) },
      { label: "标识", value: formatMaybeLabel(context.symbol) },
    ];
  }

  if (detail.value.infoType === "news_announcement") {
    return [
      { label: "主题", value: formatMaybeLabel(context.release_topic_label) },
      { label: "发布方", value: formatMaybeLabel(context.publisher) },
      { label: "类别", value: formatMaybeLabel(context.category) },
      { label: "说明", value: formatMaybeLabel(context.description) },
    ];
  }

  if (detail.value.infoType === "content_update") {
    return [
      { label: "对象", value: formatMaybeLabel(context.object_name) },
      { label: "更新类型", value: formatMaybeLabel(context.update_type) },
      { label: "链接", value: formatMaybeLabel(context.url) },
      { label: "摘要", value: formatMaybeLabel(context.summary) },
    ];
  }

  if (detail.value.infoType === "financial_event") {
    return [
      { label: "方向", value: eventSignalLabel(String(context.direction_label ?? "")) },
      { label: "公告号", value: formatMaybeLabel(context.announcement_no) },
      { label: "操作类型", value: formatMaybeLabel(context.operation_type) },
      { label: "金额（亿元）", value: formatMaybeLabel(context.amount_billion_cny) },
      { label: "期限（天）", value: formatMaybeLabel(context.term_days) },
      { label: "利率（%）", value: formatMaybeLabel(context.rate_percent) },
      { label: "方式", value: formatMaybeLabel(context.bidding_method) },
      { label: "判断依据", value: formatMaybeLabel(context.direction_reason) },
    ];
  }

  return [];
});

const recordLink = computed(() => {
  const url = detail.value?.context?.url;
  return typeof url === "string" ? url : null;
});

const themeAnalysisTarget = computed(() => {
  if (!detail.value) {
    return "/";
  }

  const section = (detail.value.status ?? "open") === "open" ? "events" : "analysis";

  return {
    path: `/themes/${detail.value.themeId}`,
    query: { section, ...stockReportQuery.value },
  };
});

const themeQueueTarget = computed(() => {
  if (!detail.value) {
    return null;
  }

  if ((detail.value.status ?? "open") !== "open") {
    return null;
  }

  return {
    path: `/themes/${detail.value.themeId}`,
    query: { section: "events", ...stockReportQuery.value },
  };
});

const themeTrendTarget = computed(() => {
  if (!detail.value) {
    return null;
  }

  if (detail.value.infoType !== "price") {
    return null;
  }

  return {
    path: `/themes/${detail.value.themeId}`,
    query: { section: "trend", ...stockReportQuery.value },
  };
});

const themeTimelineTarget = computed(() => {
  if (!detail.value) {
    return "/";
  }

  return {
    path: `/themes/${detail.value.themeId}`,
    query: { section: "timeline", ...stockReportQuery.value },
  };
});

const relatedThemeSummary = computed(() => {
  if (!detail.value) {
    return "";
  }

  if (detail.value.infoType === "price") {
    return "这条价格事件会直接影响该主题当前的价格判断，适合继续查看趋势和时间线确认是否只是一次性波动。";
  }

  if (detail.value.infoType === "financial_event") {
    return "这条金融事件通常会改变该主题的短期判断，适合继续查看主题分析和时间线，确认方向是否正在强化。";
  }

  return "这条官方发布事件是该主题判断变化的上游输入，适合继续查看主题分析和时间线，确认是否需要升级关注。";
});

const reviewActions = computed(() => {
  if (!detail.value) {
    return [];
  }

  return buildEventDetailReviewActions(detail.value, {
    reportDate: typeof route.query.reportDate === "string" ? route.query.reportDate : null,
    reportFocus: typeof route.query.reportFocus === "string" ? route.query.reportFocus : null,
  });
});

async function handleUpdateStatus(status: string) {
  if (!detail.value) {
    return;
  }

  savingStatus.value = true;
  pendingStatus.value = status;
  operationNotice.value = null;

  try {
    await updateEventStatus(detail.value.id, status);
    detail.value = {
      ...detail.value,
      status,
    };
    recordRecentEventOperation({
      action: status as "open" | "tracking" | "ignored",
      count: 1,
      eventTitle: detail.value.title,
      infoType: detail.value.infoType,
      themeId: detail.value.themeId,
      themeName: detail.value.themeName,
    });
    operationNotice.value = buildSingleEventOperationNotice(detail.value, status as "open" | "tracking" | "ignored");
  } finally {
    savingStatus.value = false;
    pendingStatus.value = "";
  }
}

async function handleUpdateMeta(
  input: {
    isRead?: boolean;
    isBookmarked?: boolean;
  },
  action: string,
) {
  if (!detail.value) {
    return;
  }

  savingMeta.value = true;
  pendingMetaAction.value = action;
  operationNotice.value = null;

  try {
    const updated = await updateEvent(detail.value.id, input);
    detail.value = {
      ...detail.value,
      isRead: updated.isRead,
      isBookmarked: updated.isBookmarked,
      bookmarkedAt: updated.bookmarkedAt,
    };
    recordRecentEventOperation({
      action:
        typeof input.isBookmarked === "boolean"
          ? input.isBookmarked
            ? "bookmark"
            : "unbookmark"
          : input.isRead
            ? "read"
            : "unread",
      count: 1,
      eventTitle: detail.value.title,
      infoType: detail.value.infoType,
      themeId: detail.value.themeId,
      themeName: detail.value.themeName,
    });
    operationNotice.value = buildSingleEventOperationNotice(
      detail.value,
      typeof input.isBookmarked === "boolean"
        ? input.isBookmarked
          ? "bookmark"
          : "unbookmark"
        : input.isRead
          ? "read"
          : "unread",
    );
  } finally {
    savingMeta.value = false;
    pendingMetaAction.value = "";
  }
}

onMounted(async () => {
  const eventId = String(route.params.eventId);
  detail.value = await fetchEventDetail(eventId);
});
</script>
