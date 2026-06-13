<template>
  <article class="card">
    <div class="card-topline">
      <h3>近 {{ days }} 天活动概览</h3>
      <div class="flex items-center gap-2">
        <select
          v-model.number="days"
          class="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
          @change="loadActivity"
        >
          <option :value="7">7 天</option>
          <option :value="14">14 天</option>
          <option :value="30">30 天</option>
        </select>
        <button
          class="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600 hover:bg-slate-200"
          :disabled="loading"
          @click="loadActivity"
        >
          {{ loading ? "加载中…" : "刷新" }}
        </button>
      </div>
    </div>

    <div v-if="loading && !activity" class="text-sm text-ink-body">加载中…</div>

    <div v-if="activity" class="grid gap-4">
      <!-- Totals -->
      <div class="flex flex-wrap gap-4 text-sm">
        <div>
          <span class="text-ink-body">总事件:</span>
          <span class="font-semibold">{{ activity.totals.events }}</span>
        </div>
        <div>
          <span class="text-ink-body">总运行:</span>
          <span class="font-semibold">{{ activity.totals.runs }}</span>
        </div>
        <div>
          <span class="text-ink-body">总变更:</span>
          <span class="font-semibold">{{ activity.totals.changes }}</span>
        </div>
      </div>

      <!-- Daily bar chart -->
      <div class="grid gap-1">
        <div class="flex items-end gap-1" style="height: 100px;">
          <div
            v-for="day in activity.days"
            :key="day.date"
            class="flex-1 flex flex-col items-center justify-end"
            :title="`${day.date}: ${day.eventCount} events`"
          >
            <div
              class="w-full rounded-t transition-all"
              :class="day.eventCount > 0 ? 'bg-amber-400' : 'bg-slate-200'"
              :style="{ height: barHeight(day.eventCount) + 'px', minHeight: day.eventCount > 0 ? '4px' : '2px' }"
            ></div>
          </div>
        </div>
        <div class="flex gap-1 text-[0.65rem] text-ink-body">
          <div v-for="day in activity.days" :key="day.date" class="flex-1 text-center">
            {{ day.date.slice(5) }}
          </div>
        </div>
      </div>

      <!-- Day-over-day comparison -->
      <div v-if="activity.days.length >= 2" class="grid gap-2">
        <h4 class="m-0 text-sm font-semibold">日环比</h4>
        <div class="grid gap-1.5">
          <div
            v-for="(pair, i) in dayPairs"
            :key="i"
            class="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
          >
            <span class="text-ink-body">{{ pair.today.date.slice(5) }} vs {{ pair.yesterday.date.slice(5) }}</span>
            <div class="flex items-center gap-3">
              <span class="text-ink-body">事件:</span>
              <span :class="deltaClass(pair.today.eventCount - pair.yesterday.eventCount)">
                {{ formatDelta(pair.today.eventCount - pair.yesterday.eventCount) }}
              </span>
              <span class="text-ink-body">变更:</span>
              <span :class="deltaClass(pair.today.changeCount - pair.yesterday.changeCount)">
                {{ formatDelta(pair.today.changeCount - pair.yesterday.changeCount) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Signal breakdown per day -->
      <div v-if="hasSignals" class="grid gap-2">
        <h4 class="m-0 text-sm font-semibold">信号分布</h4>
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead>
              <tr class="border-b border-slate-200">
                <th class="py-1 text-left text-ink-body">日期</th>
                <th v-for="signal in allSignals" :key="signal" class="py-1 text-center text-ink-body">
                  {{ signalLabel(signal) }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="day in activity.days" :key="day.date" class="border-b border-slate-100">
                <td class="py-1 text-ink-body">{{ day.date.slice(5) }}</td>
                <td v-for="signal in allSignals" :key="signal" class="py-1 text-center font-semibold">
                  {{ day.signals[signal] ?? 0 }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { fetchThemeDailyActivity, type ThemeDailyActivity } from "../../../../lib/api";
import { eventSignalLabel } from "../../../../lib/presentation";

const props = defineProps<{
  themeId: string;
}>();

const days = ref(7);
const loading = ref(false);
const activity = ref<ThemeDailyActivity | null>(null);

const maxEvents = computed(() => {
  if (!activity.value) return 1;
  return Math.max(1, ...activity.value.days.map((d) => d.eventCount));
});

const dayPairs = computed(() => {
  if (!activity.value || activity.value.days.length < 2) return [];
  const pairs = [];
  const daysList = activity.value.days;
  for (let i = 0; i < daysList.length - 1; i++) {
    pairs.push({ today: daysList[i], yesterday: daysList[i + 1] });
  }
  return pairs;
});

const allSignals = computed(() => {
  if (!activity.value) return [];
  const signals = new Set<string>();
  for (const day of activity.value.days) {
    for (const signal of Object.keys(day.signals)) {
      signals.add(signal);
    }
  }
  return Array.from(signals).sort();
});

const hasSignals = computed(() => allSignals.value.length > 0);

function barHeight(count: number): number {
  if (count === 0) return 2;
  return Math.max(4, Math.round((count / maxEvents.value) * 96));
}

function formatDelta(value: number): string {
  if (value > 0) return `+${value}`;
  if (value < 0) return `${value}`;
  return "0";
}

function deltaClass(value: number): string {
  if (value > 0) return "font-semibold text-green-600";
  if (value < 0) return "font-semibold text-red-600";
  return "text-ink-body";
}

function signalLabel(signal: string): string {
  return eventSignalLabel(signal);
}

async function loadActivity() {
  loading.value = true;
  try {
    activity.value = await fetchThemeDailyActivity(props.themeId, days.value);
  } catch {
    // silently fail
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadActivity();
});
</script>
