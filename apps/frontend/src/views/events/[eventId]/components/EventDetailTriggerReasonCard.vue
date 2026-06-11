<template>
  <section class="rounded-[18px] border border-slate-400/15 bg-white/78 p-[18px] shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
    <h3 class="mb-4 text-[1.05rem] font-semibold text-[#2f2618]">触发原因</h3>

    <div class="flex flex-col gap-4">
      <!-- Rule Info -->
      <div class="flex flex-wrap items-center gap-2">
        <span class="inline-flex items-center rounded-lg bg-blue-50 px-2.5 py-1 text-[0.78rem] font-semibold text-blue-700">
          {{ triggerReason.ruleName }}
        </span>
        <span class="text-[0.82rem] text-[#8a8078]">
          规则标识: {{ triggerReason.ruleKey }}
        </span>
      </div>

      <!-- Evidence -->
      <div v-if="triggerReason.evidence?.length" class="flex flex-col gap-2">
        <h4 class="text-[0.88rem] font-semibold text-[#6b5e49]">判断依据</h4>
        <ul class="flex flex-col gap-1.5 pl-4">
          <li
            v-for="(item, index) in triggerReason.evidence"
            :key="index"
            class="list-disc text-[0.88rem] leading-6 text-[#6f665a]"
          >
            {{ item }}
          </li>
        </ul>
      </div>

      <!-- Change Details -->
      <div v-if="changeDetails" class="flex flex-col gap-2">
        <h4 class="text-[0.88rem] font-semibold text-[#6b5e49]">变化详情</h4>
        <div class="rounded-xl border border-slate-400/15 bg-slate-50/80 p-3">
          <dl class="grid grid-cols-2 gap-2">
            <div v-for="(value, key) in changeDetails" :key="key">
              <dt class="text-[0.78rem] font-semibold text-[#8a8078]">{{ formatLabel(String(key)) }}</dt>
              <dd class="text-[0.88rem] text-[#2f2618]">{{ formatValue(value) }}</dd>
            </div>
          </dl>
        </div>
      </div>

      <!-- Original Record -->
      <div v-if="originalRecord" class="flex flex-col gap-2">
        <h4 class="text-[0.88rem] font-semibold text-[#6b5e49]">原始记录</h4>
        <div class="rounded-xl border border-slate-400/15 bg-slate-50/80 p-3">
          <dl class="grid grid-cols-2 gap-2">
            <div v-for="(value, key) in displayRecord" :key="key">
              <dt class="text-[0.78rem] font-semibold text-[#8a8078]">{{ formatLabel(String(key)) }}</dt>
              <dd class="text-[0.88rem] text-[#2f2618]">{{ formatValue(value) }}</dd>
            </div>
          </dl>
          <button
            v-if="hasMoreFields"
            class="mt-2 text-[0.82rem] font-semibold text-[#6b4f1f] hover:underline"
            @click="showAllFields = !showAllFields"
          >
            {{ showAllFields ? '收起' : '展开全部' }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

interface TriggerReason {
  ruleKey: string;
  ruleName: string;
  evidence: string[];
  changeDetails?: Record<string, unknown>;
  originalRecord?: Record<string, unknown>;
}

const props = defineProps<{
  triggerReason: TriggerReason;
}>();

const showAllFields = ref(false);

const changeDetails = computed(() => {
  if (!props.triggerReason.changeDetails) return null;

  // Filter out empty values
  const entries = Object.entries(props.triggerReason.changeDetails).filter(
    ([, value]) => value !== null && value !== undefined && value !== ""
  );

  return Object.fromEntries(entries);
});

const originalRecord = computed(() => {
  if (!props.triggerReason.originalRecord) return null;

  // Filter out empty values
  const entries = Object.entries(props.triggerReason.originalRecord).filter(
    ([, value]) => value !== null && value !== undefined && value !== ""
  );

  return Object.fromEntries(entries);
});

const displayRecord = computed(() => {
  if (!originalRecord.value) return {};

  const entries = Object.entries(originalRecord.value);

  if (showAllFields.value || entries.length <= 6) {
    return originalRecord.value;
  }

  // Show only first 6 fields
  return Object.fromEntries(entries.slice(0, 6));
});

const hasMoreFields = computed(() => {
  if (!originalRecord.value) return false;
  return Object.keys(originalRecord.value).length > 6;
});

function formatLabel(key: string): string {
  const labelMap: Record<string, string> = {
    price: "价格",
    currency: "币种",
    spec: "规格",
    symbol: "标识",
    url: "链接",
    summary: "摘要",
    direction_label: "方向",
    announcement_no: "公告号",
    operation_type: "操作类型",
    amount_billion_cny: "金额（亿元）",
    term_days: "期限（天）",
    rate_percent: "利率（%）",
    bidding_method: "方式",
    direction_reason: "判断依据",
    release_topic_label: "主题",
    publisher: "发布方",
    category: "类别",
    description: "说明",
    object_name: "对象",
    update_type: "更新类型",
  };

  return labelMap[key] || key;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
</script>
