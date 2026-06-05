<template>
  <section class="page">
    <InboxSectionHeader
      :title="sectionMeta.title"
      :description="sectionMeta.description"
      :handle-back="handleBack"
    />

    <InboxSectionSummaryCard
      :total-count="totalCount"
      :recent-count="recentEvents.length"
      :historical-count="historicalEvents.length"
    />

    <InboxSectionStatusToolbar :path="route.path" :normalized-query="normalizedQuery" />

    <InboxSectionEventsCard
      title="新数据"
      description="优先处理最近24小时内新增或更新的高优先级事件。"
      empty-text="这个分区最近24小时没有新的事件。"
      :events="recentEvents"
      :show-meta-pills="true"
      :event-header-tone-class="eventHeaderToneClass"
      :event-details="eventDetails"
    />

    <div v-if="historicalEvents.length" class="relative text-center text-[0.9rem] font-bold text-[#7a6b57]">
      <div class="absolute inset-x-0 top-1/2 border-t border-[rgba(96,74,40,0.18)]"></div>
      <span class="relative bg-[#eceff3] px-3">历史数据</span>
    </div>

    <InboxSectionEventsCard
      v-if="historicalEvents.length"
      title="历史数据"
      description="用于回溯趋势和查看最近信号之前的历史上下文。"
      empty-text=""
      :events="historicalEvents"
      :event-header-tone-class="eventHeaderToneClass"
      :event-details="eventDetails"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import InboxSectionEventsCard from "./InboxSectionEventsCard.vue";
import InboxSectionHeader from "./InboxSectionHeader.vue";
import InboxSectionStatusToolbar from "./InboxSectionStatusToolbar.vue";
import InboxSectionSummaryCard from "./InboxSectionSummaryCard.vue";
import { fetchInboxSectionEvents, type EventSummary } from "../../../../../lib/api";
import {
  eventSignalLabel,
  formatMaybeLabel,
} from "../../../../../lib/presentation";

const route = useRoute();
const router = useRouter();
const events = ref<EventSummary[]>([]);

function handleBack() {
  if (window.history.length > 1) {
    router.back();
    return;
  }

  void router.push("/");
}

function toTimestamp(value?: string | null) {
  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

const sectionMeta = computed(() => {
  const sectionId = String(route.params.sectionId);

  if (sectionId === "price-signals") {
    return {
      title: "价格信号",
      description: "查看价格新低、异常波动等直接影响买入决策的全部记录。",
    };
  }

  if (sectionId === "content-updates") {
    return {
      title: "内容更新",
      description: "查看产品更新、功能发布、活动页和文档更新等全部记录。",
    };
  }

  if (sectionId === "official-releases") {
    return {
      title: "官方发布",
      description: "查看官方公告、新发布和制度类更新的全部记录。",
    };
  }

  if (sectionId === "financial-events") {
    return {
      title: "金融事件",
      description: "查看公开市场操作、结构化政策事件等全部记录。",
    };
  }

  return {
    title: "事件分区",
    description: "查看该收件箱分区下的全部事件。",
  };
});

const eventStatusFilter = computed(() => {
  const status = route.query.status;

  if (typeof status !== "string") {
    return "";
  }

  return ["open", "tracking", "ignored"].includes(status) ? status : "";
});

const normalizedQuery = computed(() => ({
  status: undefined,
}));

const recentEvents = computed(() => {
  const threshold = Date.now() - 24 * 60 * 60 * 1000;
  return events.value
    .filter((event) => toTimestamp(event.occurredAt) >= threshold)
    .filter((event) => !eventStatusFilter.value || (event.status ?? "open") === eventStatusFilter.value);
});

const historicalEvents = computed(() => {
  const threshold = Date.now() - 24 * 60 * 60 * 1000;
  return events.value
    .filter((event) => toTimestamp(event.occurredAt) < threshold)
    .filter((event) => !eventStatusFilter.value || (event.status ?? "open") === eventStatusFilter.value);
});

const totalCount = computed(() => events.value.length);

function eventHeaderToneClass(event: EventSummary) {
  if (event.infoType === "price") {
    return "bg-[rgba(232,216,188,0.92)]";
  }

  if (event.infoType === "news_announcement") {
    return "bg-[rgba(217,231,242,0.92)]";
  }

  if (event.infoType === "content_update") {
    return "bg-[rgba(241,228,204,0.92)]";
  }

  if (event.infoType === "financial_event") {
    return "bg-[rgba(226,221,241,0.92)]";
  }

  return "bg-[rgba(231,228,220,0.92)]";
}

function eventDetails(event: EventSummary) {
  const context = event.context ?? {};

  if (event.infoType === "price") {
    return [
      { label: "价格", value: formatMaybeLabel(context.price) },
      { label: "币种", value: formatMaybeLabel(context.currency) },
      { label: "规格", value: formatMaybeLabel(context.spec) },
    ];
  }

  if (event.infoType === "news_announcement") {
    return [
      { label: "主题", value: formatMaybeLabel(context.release_topic_label) },
      { label: "发布方", value: formatMaybeLabel(context.publisher) },
      { label: "类别", value: formatMaybeLabel(context.category) },
    ];
  }

  if (event.infoType === "content_update") {
    return [
      { label: "对象", value: formatMaybeLabel(context.object_name) },
      { label: "更新类型", value: formatMaybeLabel(context.update_type) },
      { label: "链接", value: formatMaybeLabel(context.url) },
    ];
  }

  if (event.infoType === "financial_event") {
    return [
      { label: "方向", value: eventSignalLabel(String(context.direction_label ?? "")) },
      { label: "公告号", value: formatMaybeLabel(context.announcement_no) },
      { label: "操作类型", value: formatMaybeLabel(context.operation_type) },
      { label: "金额", value: formatMaybeLabel(context.amount_billion_cny) },
      { label: "利率", value: formatMaybeLabel(context.rate_percent) },
    ];
  }

  return [];
}

onMounted(async () => {
  const sectionId = String(route.params.sectionId);
  events.value = await fetchInboxSectionEvents(sectionId);
});
</script>
