<template>
  <article class="card">
    <div class="card-topline">
      <h3>Feedback Diagnostics</h3>
      <span class="text-xs text-gray-500">{{ aggregation.totalFeedback }} total feedback</span>
    </div>

    <p class="mb-3.5 text-[#6e665a]">
      Aggregated feedback insights to help tune event rules and reduce noise.
    </p>

    <div v-if="aggregation.totalFeedback === 0" class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5 text-center text-gray-500">
      No feedback data yet. Start marking events as useful, noise, or watch to see aggregation insights.
    </div>

    <div v-else class="grid gap-4">
      <!-- Signal Type Aggregation -->
      <div v-if="aggregation.bySignal?.length > 0" class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
        <strong class="text-sm">By Signal Type</strong>
        <div class="mt-2.5 grid gap-2">
          <div
            v-for="item in aggregation.bySignal.slice(0, 5)"
            :key="`signal-${item.key}`"
            class="flex items-center justify-between rounded-xl border border-slate-400/15 bg-white/70 px-3 py-2.5"
          >
            <div>
              <div class="font-semibold text-sm">{{ item.label }}</div>
              <div class="text-xs text-gray-500">{{ item.total }} feedback items</div>
            </div>
            <div class="flex gap-2">
              <span v-if="item.useful > 0" class="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                {{ item.useful }} useful
              </span>
              <span v-if="item.noise > 0" class="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                {{ item.noise }} noise
              </span>
              <span v-if="item.watch > 0" class="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700">
                {{ item.watch }} watch
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Event Type Aggregation -->
      <div v-if="aggregation.byEventType?.length > 0" class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
        <strong class="text-sm">By Event Type</strong>
        <div class="mt-2.5 grid gap-2">
          <div
            v-for="item in aggregation.byEventType.slice(0, 5)"
            :key="`event-type-${item.key}`"
            class="flex items-center justify-between rounded-xl border border-slate-400/15 bg-white/70 px-3 py-2.5"
          >
            <div>
              <div class="font-semibold text-sm">{{ item.label }}</div>
              <div class="text-xs text-gray-500">{{ item.total }} feedback items</div>
            </div>
            <div class="flex gap-2">
              <span v-if="item.useful > 0" class="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                {{ item.useful }} useful
              </span>
              <span v-if="item.noise > 0" class="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                {{ item.noise }} noise
              </span>
              <span v-if="item.watch > 0" class="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700">
                {{ item.watch }} watch
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Theme Aggregation -->
      <div v-if="aggregation.byTheme?.length > 0" class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
        <strong class="text-sm">By Theme</strong>
        <div class="mt-2.5 grid gap-2">
          <div
            v-for="item in aggregation.byTheme.slice(0, 5)"
            :key="`theme-${item.key}`"
            class="flex items-center justify-between rounded-xl border border-slate-400/15 bg-white/70 px-3 py-2.5"
          >
            <div>
              <div class="font-semibold text-sm">{{ item.label }}</div>
              <div class="text-xs text-gray-500">{{ item.total }} feedback items</div>
            </div>
            <div class="flex gap-2">
              <span v-if="item.useful > 0" class="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                {{ item.useful }} useful
              </span>
              <span v-if="item.noise > 0" class="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                {{ item.noise }} noise
              </span>
              <span v-if="item.watch > 0" class="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700">
                {{ item.watch }} watch
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Rule Tuning Suggestions -->
      <div v-if="suggestions.length > 0" class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
        <strong class="text-sm">Rule Tuning Suggestions</strong>
        <div class="mt-2.5 grid gap-2">
          <div
            v-for="suggestion in suggestions"
            :key="suggestion.signal"
            class="rounded-xl border border-slate-400/15 bg-white/70 px-3 py-2.5 text-sm"
          >
            <div class="font-semibold">{{ suggestion.signal }}</div>
            <div class="text-gray-600">{{ suggestion.recommendation }}</div>
          </div>
        </div>
      </div>

      <!-- Summary -->
      <div class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
        <strong class="text-sm">Summary</strong>
        <div class="mt-2 text-sm text-gray-600">
          <div>Recent 24h: {{ aggregation.recentFeedback }} feedback items</div>
          <div>Total: {{ aggregation.totalFeedback }} feedback items</div>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { FeedbackAggregation } from "../../../lib/api";

const props = defineProps<{
  aggregation: FeedbackAggregation;
}>();

const suggestions = computed(() => {
  const items: Array<{ signal: string; recommendation: string }> = [];
  for (const item of props.aggregation.bySignal ?? []) {
    if (item.noise > item.useful && item.noise >= 2) {
      items.push({ signal: item.label, recommendation: `Consider lowering attention — ${item.noise} noise vs ${item.useful} useful` });
    } else if (item.useful > item.noise && item.useful >= 2) {
      items.push({ signal: item.label, recommendation: `Consider raising attention — ${item.useful} useful vs ${item.noise} noise` });
    }
  }
  for (const item of props.aggregation.byTheme ?? []) {
    if (item.watch > 0) {
      items.push({ signal: item.label, recommendation: `Has ${item.watch} watch items — continue observation` });
    }
  }
  return items;
});
</script>
