<template>
  <section class="page">
    <div class="mb-6">
      <h1>历史回测</h1>
      <p class="text-[0.92rem] text-ink-secondary">使用历史数据验证检测规则，查看假设事件</p>
    </div>

    <!-- Config Form -->
    <article class="card mb-6">
      <div class="card-topline">
        <h3>回测配置</h3>
      </div>
      <div class="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label class="mb-1.5 block text-[0.84rem] font-semibold text-ink-label">数据来源 ID</label>
          <input
            v-model="form.sourceId"
            type="text"
            placeholder="e.g., source-eastmoney-moutai-kline"
            class="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-[0.88rem] outline-none focus:border-[#6b4f1f]/30"
          />
        </div>
        <div />
        <div>
          <label class="mb-1.5 block text-[0.84rem] font-semibold text-ink-label">开始日期</label>
          <input
            v-model="form.startDate"
            type="date"
            class="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-[0.88rem] outline-none focus:border-[#6b4f1f]/30"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-[0.84rem] font-semibold text-ink-label">结束日期</label>
          <input
            v-model="form.endDate"
            type="date"
            class="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-[0.88rem] outline-none focus:border-[#6b4f1f]/30"
          />
        </div>
      </div>
      <div class="mt-4">
        <button
          class="rounded-xl bg-btn-primary px-5 py-2.5 text-[0.88rem] font-semibold text-ink-emphasis transition-colors hover:bg-btn-primary-hover disabled:opacity-50"
          :disabled="!canSubmit || loading"
          @click="runBacktest"
        >
          {{ loading ? "运行中..." : "运行回测" }}
        </button>
      </div>
    </article>

    <!-- Results -->
    <div v-if="error" class="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[0.88rem] text-red-700">
      {{ error }}
    </div>

    <div v-if="result" class="grid gap-4">
      <!-- Summary -->
      <article class="card">
        <div class="card-topline">
          <h3>回测结果</h3>
          <span class="text-[0.88rem] text-ink-secondary">
            {{ result.startDate }} ~ {{ result.endDate }}
          </span>
        </div>
        <div class="mt-4 grid gap-3 sm:grid-cols-3">
          <div class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
            <div class="text-[0.82rem] uppercase tracking-[0.08em] text-ink-label">总记录数</div>
            <div class="mt-2 text-[1.5rem] font-semibold text-ink-heading">{{ result.totalRecords }}</div>
          </div>
          <div class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
            <div class="text-[0.82rem] uppercase tracking-[0.08em] text-ink-label">假设事件</div>
            <div class="mt-2 text-[1.5rem] font-semibold text-ink-heading">{{ result.hypotheticalEvents.length }}</div>
          </div>
          <div class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
            <div class="text-[0.82rem] uppercase tracking-[0.08em] text-ink-label">信号类型</div>
            <div class="mt-2 text-[1.5rem] font-semibold text-ink-heading">{{ Object.keys(result.signalDistribution).length }}</div>
          </div>
        </div>
      </article>

      <!-- Signal Distribution -->
      <article v-if="Object.keys(result.signalDistribution).length" class="card">
        <div class="card-topline">
          <h3>信号分布</h3>
        </div>
        <div class="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="(count, signal) in result.signalDistribution"
            :key="signal"
            class="flex items-center justify-between rounded-xl border border-slate-400/15 bg-white/70 px-3.5 py-2.5"
          >
            <span class="text-[0.88rem] font-medium text-ink-heading">{{ signal }}</span>
            <span class="rounded-full bg-slate-100 px-2.5 py-0.5 text-[0.82rem] font-semibold text-ink-secondary">{{ count }}</span>
          </div>
        </div>
      </article>

      <!-- Events Timeline -->
      <article v-if="result.hypotheticalEvents.length" class="card">
        <div class="card-topline">
          <h3>假设事件时间线</h3>
          <span class="text-[0.88rem] text-ink-secondary">{{ result.hypotheticalEvents.length }} 个事件</span>
        </div>
        <div class="mt-3 grid gap-3">
          <div
            v-for="(event, index) in result.hypotheticalEvents.slice(0, 50)"
            :key="index"
            class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5"
          >
            <div class="flex flex-wrap items-center gap-2">
              <span class="rounded-full bg-blue-50 px-2.5 py-0.5 text-[0.76rem] font-semibold text-blue-700">
                {{ event.event_type }}
              </span>
              <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[0.76rem] text-ink-secondary">
                {{ event.signal }}
              </span>
              <span class="text-[0.82rem] text-ink-muted">{{ formatDateTime(event.occurred_at) }}</span>
            </div>
            <div class="mt-2 text-[0.92rem] font-semibold text-ink-heading">{{ event.title }}</div>
            <div class="mt-1 text-[0.88rem] text-ink-body">{{ event.summary }}</div>
            <div v-if="event.evidence.length" class="mt-2">
              <div
                v-for="ev in event.evidence.slice(0, 3)"
                :key="ev"
                class="text-[0.82rem] text-ink-muted"
              >
                {{ ev }}
              </div>
            </div>
          </div>
          <div
            v-if="result.hypotheticalEvents.length > 50"
            class="text-center text-[0.84rem] text-ink-muted"
          >
            显示前 50 个事件，共 {{ result.hypotheticalEvents.length }} 个
          </div>
        </div>
      </article>

      <!-- Empty state -->
      <article v-else class="card">
        <div class="rounded-2xl bg-slate-50/90 p-6 text-center text-ink-secondary">
          在选定的时间范围内没有生成假设事件
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

import { type BacktestResult, triggerBacktest } from "../../lib/api";

const form = ref({
  sourceId: "",
  startDate: "",
  endDate: "",
});

const loading = ref(false);
const error = ref("");
const result = ref<BacktestResult | null>(null);

const canSubmit = computed(() =>
  form.value.sourceId.trim() && form.value.startDate && form.value.endDate,
);

async function runBacktest() {
  if (!canSubmit.value) return;

  loading.value = true;
  error.value = "";
  result.value = null;

  try {
    result.value = await triggerBacktest(
      form.value.sourceId.trim(),
      form.value.startDate,
      form.value.endDate,
    );
  } catch (e) {
    error.value = e instanceof Error ? e.message : "回测失败";
  } finally {
    loading.value = false;
  }
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
  } catch {
    return iso;
  }
}
</script>
