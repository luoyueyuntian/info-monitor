<template>
  <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
    <div class="mb-3 flex items-center justify-between">
      <h3 class="text-sm font-semibold text-gray-900">Daily Summary</h3>
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-500">{{ summary.date }}</span>
        <button
          class="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
          :disabled="loadingHistory"
          @click="toggleHistory"
        >
          {{ showHistory ? "Hide History" : "History" }}
        </button>
        <button
          class="rounded bg-blue-500 px-2 py-0.5 text-xs font-medium text-white hover:bg-blue-600 disabled:opacity-50"
          :disabled="delivering"
          @click="handleDeliver"
        >
          {{ delivering ? "Sending..." : `Deliver (${dailyConfig?.channel ?? "in_app"})` }}
        </button>
        <span v-if="deliverStatus" class="text-xs" :class="deliverStatus === 'sent' ? 'text-green-600' : 'text-red-500'">
          {{ deliverStatus === 'sent' ? '✓ Sent' : 'Failed' }}
        </span>
      </div>
    </div>

    <!-- Today vs Yesterday Delta -->
    <div v-if="compareData?.delta" class="mb-3 rounded-md border border-blue-100 bg-blue-50 px-3 py-2">
      <div class="text-xs font-semibold text-blue-800">Today vs Yesterday</div>
      <div class="mt-1 flex gap-4 text-xs text-blue-700">
        <span>Events: {{ formatDelta(compareData.delta.totalEvents) }}</span>
        <span>Recent 24h: {{ formatDelta(compareData.delta.recentEvents) }}</span>
        <span>Warnings: {{ formatDelta(compareData.delta.newWarningSources) }}</span>
      </div>
    </div>

    <div v-if="summary.items?.length > 0" class="mb-4 grid grid-cols-2 gap-3">
      <div
        v-for="item in summary.items"
        :key="item.category"
        class="rounded-md border border-gray-100 bg-gray-50 p-3"
      >
        <div class="mb-1 flex items-center justify-between">
          <span class="text-xs font-medium text-gray-600">{{ item.label }}</span>
          <span
            v-if="item.recentCount > 0"
            class="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700"
          >
            +{{ item.recentCount }} today
          </span>
        </div>
        <div class="text-lg font-bold text-gray-900">{{ item.count }}</div>
        <!-- Direction breakdown for financial events -->
        <div v-if="item.directionBreakdown" class="mt-2 flex gap-2 text-xs">
          <span class="text-green-600" :title="`看多: ${item.directionBreakdown.bullish} (24h: ${item.directionBreakdown.recentBullish})`">
            ↑ {{ item.directionBreakdown.bullish }}
          </span>
          <span class="text-red-600" :title="`看空: ${item.directionBreakdown.bearish} (24h: ${item.directionBreakdown.recentBearish})`">
            ↓ {{ item.directionBreakdown.bearish }}
          </span>
          <span class="text-gray-400" :title="`中性: ${item.directionBreakdown.neutral} (24h: ${item.directionBreakdown.recentNeutral})`">
            → {{ item.directionBreakdown.neutral }}
          </span>
        </div>
        <div v-if="item.latestEvent" class="mt-2 truncate text-xs text-gray-500">
          Latest: {{ item.latestEvent.title }}
        </div>
      </div>
    </div>

    <div v-else class="mb-4 rounded-md border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-xs text-gray-400">
      No summary data available yet.
    </div>

    <div v-if="summary.warningSources.length > 0" class="mb-3">
      <h4 class="mb-2 text-xs font-semibold text-red-600">Warning Sources</h4>
      <div class="space-y-1">
        <div
          v-for="source in summary.warningSources"
          :key="source.id"
          class="flex items-center justify-between rounded bg-red-50 px-2 py-1"
        >
          <span class="text-xs text-red-700">{{ source.name }}</span>
          <span class="text-xs text-red-500">{{ source.status }}</span>
        </div>
      </div>
    </div>

    <div class="flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500">
      <span>Total events: {{ summary.totalEvents }}</span>
      <span>Recent 24h: {{ summary.recentEvents }}</span>
    </div>

    <!-- History Section -->
    <div v-if="showHistory" class="mt-3 border-t border-gray-100 pt-3">
      <h4 class="mb-2 text-xs font-semibold text-gray-700">Recent Summaries</h4>
      <div v-if="loadingHistory" class="text-xs text-gray-400">Loading...</div>
      <div v-else-if="history.length === 0" class="text-xs text-gray-400">No history yet. Click "Compare" to save a snapshot.</div>
      <div v-else class="space-y-2">
        <div
          v-for="snapshot in history"
          :key="snapshot.id"
          class="rounded-md border border-gray-100 bg-gray-50 px-3 py-2"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-gray-700">{{ snapshot.date }}</span>
            <span class="text-xs text-gray-400">{{ formatSnapshotTime(snapshot.createdAt) }}</span>
          </div>
          <div class="mt-1 flex gap-3 text-xs text-gray-500">
            <span>{{ snapshot.summary.totalEvents }} total events</span>
            <span>{{ snapshot.summary.recentEvents }} recent</span>
            <span>{{ snapshot.summary.warningSources.length }} warnings</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

import {
  deliverDailySummary,
  fetchDailySummaryCompare,
  fetchDailySummaryConfig,
  fetchDailySummaryHistory,
  loadChannelConfigFromBackend,
  type ChannelConfig,
  type DailySummary,
  type DailySummaryCompare,
  type DailySummaryConfig,
  type DailySummarySnapshot,
} from "../../../lib/api";

defineProps<{
  summary: DailySummary;
}>();

const delivering = ref(false);
const deliverStatus = ref<"sent" | "failed" | "">("");
const dailyConfig = ref<DailySummaryConfig | null>(null);
const channelConfig = ref<ChannelConfig | undefined>(undefined);
const showHistory = ref(false);
const loadingHistory = ref(false);
const history = ref<DailySummarySnapshot[]>([]);
const compareData = ref<DailySummaryCompare | null>(null);

async function toggleHistory() {
  showHistory.value = !showHistory.value;
  if (showHistory.value && history.value.length === 0) {
    loadingHistory.value = true;
    try {
      const [historyResult, compareResult] = await Promise.all([
        fetchDailySummaryHistory(7),
        fetchDailySummaryCompare(),
      ]);
      history.value = historyResult;
      compareData.value = compareResult;
    } catch {
      // Silently fail - history is optional
    } finally {
      loadingHistory.value = false;
    }
  }
}

function formatDelta(value: number): string {
  if (value > 0) return `+${value}`;
  if (value < 0) return `${value}`;
  return "0";
}

function formatSnapshotTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString("zh-CN", {
      timeZone: "Asia/Shanghai",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

async function loadConfig() {
  try {
    dailyConfig.value = await fetchDailySummaryConfig();
  } catch {
    // Use defaults
  }

  // Load channel config from backend first, fall back to localStorage
  const channel = dailyConfig.value?.channel ?? "in_app";
  if (channel !== "in_app") {
    try {
      const backendConfig = await loadChannelConfigFromBackend(channel);
      if (backendConfig) {
        if (!channelConfig.value) {
          channelConfig.value = {};
        }
        if (backendConfig.webhook) channelConfig.value.webhook = backendConfig.webhook;
        if (backendConfig.telegram) channelConfig.value.telegram = backendConfig.telegram;
        return;
      }
    } catch {
      // Backend unavailable, fall through to localStorage
    }

    try {
      const stored = localStorage.getItem("dailySummaryChannelConfig");
      if (stored) {
        channelConfig.value = JSON.parse(stored);
      }
    } catch {
      // Use defaults
    }
  }
}

async function handleDeliver() {
  delivering.value = true;
  deliverStatus.value = "";

  try {
    const channel = dailyConfig.value?.channel ?? "in_app";

    // For external channels, channelConfig would need to be provided by the user
    // through a settings UI. For now, in_app works without config.
    if (channel !== "in_app" && !channelConfig.value) {
      deliverStatus.value = "failed";
      return;
    }

    const result = await deliverDailySummary(channel, channelConfig.value);
    deliverStatus.value = result.delivered ? "sent" : "failed";
  } catch (e) {
    deliverStatus.value = "failed";
  } finally {
    delivering.value = false;
  }

  // Clear status after 3 seconds
  setTimeout(() => {
    deliverStatus.value = "";
  }, 3000);
}

// Load config on mount
loadConfig();
</script>
