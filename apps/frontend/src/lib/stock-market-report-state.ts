import { readonly, ref } from "vue";

import {
  fetchStockMarketCloseReport,
  fetchStockMarketCloseReportHistory,
  fetchStockMarketCloseReportSnapshotByDate,
  saveStockMarketCloseReport,
  type StockMarketCloseReport,
  type StockMarketCloseReportSnapshot,
} from "./api";

const report = ref<StockMarketCloseReport | null>(null);
const history = ref<StockMarketCloseReportSnapshot[]>([]);
const selectedSnapshot = ref<StockMarketCloseReportSnapshot | null>(null);
const loading = ref(false);

let refreshPromise: Promise<void> | null = null;
let currentHistoryLimit = 5;

async function doRefresh(options?: { historyLimit?: number; saveToday?: boolean }) {
  const historyLimit = options?.historyLimit ?? currentHistoryLimit;
  currentHistoryLimit = Math.max(currentHistoryLimit, historyLimit);

  loading.value = true;
  try {
    if (options?.saveToday) {
      try {
        const saved = await saveStockMarketCloseReport();
        report.value = saved.report;
      } catch {
        // Best effort only; fall back to fetch below.
      }
    }

    const [nextReport, nextHistory] = await Promise.all([
      fetchStockMarketCloseReport(),
      fetchStockMarketCloseReportHistory(currentHistoryLimit),
    ]);

    report.value = nextReport;
    history.value = nextHistory;

    if (selectedSnapshot.value) {
      selectedSnapshot.value = nextHistory.find((item) => item.date === selectedSnapshot.value?.date) ?? selectedSnapshot.value;
    }
  } finally {
    loading.value = false;
  }
}

export async function refreshStockMarketReportState(options?: { historyLimit?: number; saveToday?: boolean }) {
  if (!refreshPromise) {
    refreshPromise = doRefresh(options).finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export async function selectStockMarketReportDate(date: string | null | undefined) {
  if (!date) {
    selectedSnapshot.value = null;
    return null;
  }

  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" });
  if (date === today) {
    selectedSnapshot.value = null;
    return null;
  }

  const cached = history.value.find((item) => item.date === date);
  if (cached) {
    selectedSnapshot.value = cached;
    return cached;
  }

  const snapshot = await fetchStockMarketCloseReportSnapshotByDate(date);
  selectedSnapshot.value = snapshot;
  return snapshot;
}

export function clearSelectedStockMarketReportDate() {
  selectedSnapshot.value = null;
}

export function useStockMarketReportState() {
  return {
    report: readonly(report),
    history: readonly(history),
    selectedSnapshot: readonly(selectedSnapshot),
    loading: readonly(loading),
  };
}
