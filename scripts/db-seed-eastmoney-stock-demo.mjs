import dotenv from "dotenv";
import pg from "pg";

import {
  upsertNormalizedRecord,
  upsertRawSnapshot,
  upsertSource,
  upsertSourceRun,
  upsertTheme,
} from "./lib/db-seed-helpers.mjs";
import {
  DEMO_RECORD_IDS,
  DEMO_SNAPSHOT_IDS,
  DEMO_SOURCE_IDS,
  DEMO_THEME_IDS,
  DEMO_RUN_IDS,
} from "./lib/demo-scene-ids.mjs";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: databaseUrl });

const themeId = DEMO_THEME_IDS.EASTMONEY_MOUTAI;
const sourceId = DEMO_SOURCE_IDS.EASTMONEY_MOUTAI_KLINE;
const runId = DEMO_RUN_IDS.EASTMONEY_MOUTAI_SEED;
const snapshotId = DEMO_SNAPSHOT_IDS.EASTMONEY_MOUTAI_SEED;
const recordId = DEMO_RECORD_IDS.EASTMONEY_MOUTAI_SEED;

// ── K-line seed data (45 trading days, oldest → newest) ────────────────────
// This mirrors what eastmoney_stock_kline adapter would return for secid=1.600519
const klineData = [
  { date: "2026-04-28", open: 1652.00, close: 1668.50, high: 1675.80, low: 1645.20, vol: 25843, amount: 4285632.00, amp: 1.85 },
  { date: "2026-04-29", open: 1670.00, close: 1682.30, high: 1688.90, low: 1662.10, vol: 27412, amount: 4582310.00, amp: 1.60 },
  { date: "2026-04-30", open: 1685.00, close: 1678.20, high: 1692.50, low: 1670.80, vol: 24567, amount: 4112350.00, amp: 1.29 },
  { date: "2026-05-05", open: 1680.00, close: 1695.40, high: 1702.30, low: 1675.60, vol: 29834, amount: 5042180.00, amp: 1.59 },
  { date: "2026-05-06", open: 1698.00, close: 1710.80, high: 1718.20, low: 1690.50, vol: 31205, amount: 5321450.00, amp: 1.64 },
  { date: "2026-05-07", open: 1712.00, close: 1705.60, high: 1720.40, low: 1698.30, vol: 28763, amount: 4898520.00, amp: 1.29 },
  { date: "2026-05-08", open: 1708.00, close: 1722.40, high: 1728.90, low: 1702.10, vol: 30124, amount: 5182630.00, amp: 1.57 },
  { date: "2026-05-09", open: 1725.00, close: 1718.30, high: 1732.60, low: 1710.50, vol: 27856, amount: 4782340.00, amp: 1.29 },
  { date: "2026-05-12", open: 1720.00, close: 1735.20, high: 1742.80, low: 1715.40, vol: 32541, amount: 5632180.00, amp: 1.59 },
  { date: "2026-05-13", open: 1738.00, close: 1728.60, high: 1745.50, low: 1720.30, vol: 29432, amount: 5082350.00, amp: 1.46 },
  { date: "2026-05-14", open: 1730.00, close: 1742.80, high: 1750.20, low: 1725.60, vol: 31876, amount: 5542630.00, amp: 1.42 },
  { date: "2026-05-15", open: 1745.00, close: 1738.40, high: 1752.30, low: 1730.80, vol: 28645, amount: 4968520.00, amp: 1.24 },
  { date: "2026-05-16", open: 1740.00, close: 1752.60, high: 1760.40, low: 1735.20, vol: 33218, amount: 5812340.00, amp: 1.44 },
  { date: "2026-05-19", open: 1755.00, close: 1745.80, high: 1762.30, low: 1738.50, vol: 30567, amount: 5328450.00, amp: 1.35 },
  { date: "2026-05-20", open: 1748.00, close: 1758.40, high: 1765.20, low: 1742.60, vol: 31432, amount: 5512180.00, amp: 1.29 },
  { date: "2026-05-21", open: 1760.00, close: 1752.20, high: 1768.40, low: 1745.80, vol: 29765, amount: 5202630.00, amp: 1.29 },
  { date: "2026-05-22", open: 1755.00, close: 1765.30, high: 1772.60, low: 1750.40, vol: 32876, amount: 5782340.00, amp: 1.26 },
  { date: "2026-05-23", open: 1768.00, close: 1758.60, high: 1775.40, low: 1752.30, vol: 30124, amount: 5292450.00, amp: 1.31 },
  { date: "2026-05-26", open: 1760.00, close: 1772.80, high: 1780.50, low: 1755.60, vol: 33541, amount: 5932180.00, amp: 1.41 },
  { date: "2026-05-27", open: 1775.00, close: 1768.40, high: 1782.30, low: 1760.80, vol: 31232, amount: 5512630.00, amp: 1.21 },
  { date: "2026-05-28", open: 1770.00, close: 1782.60, high: 1790.20, low: 1765.40, vol: 34218, amount: 6102340.00, amp: 1.40 },
  { date: "2026-05-29", open: 1785.00, close: 1775.80, high: 1792.30, low: 1768.50, vol: 31876, amount: 5658520.00, amp: 1.34 },
  { date: "2026-05-30", open: 1778.00, close: 1788.40, high: 1795.60, low: 1772.20, vol: 33432, amount: 5972180.00, amp: 1.31 },
  { date: "2026-06-02", open: 1790.00, close: 1782.20, high: 1798.40, low: 1775.80, vol: 30567, amount: 5442630.00, amp: 1.26 },
  { date: "2026-06-03", open: 1785.00, close: 1795.60, high: 1802.30, low: 1780.40, vol: 34876, amount: 6252340.00, amp: 1.22 },
  { date: "2026-06-04", open: 1798.00, close: 1788.40, high: 1805.20, low: 1782.60, vol: 32432, amount: 5802180.00, amp: 1.26 },
  { date: "2026-06-05", open: 1790.00, close: 1802.80, high: 1810.50, low: 1785.30, vol: 35124, amount: 6332630.00, amp: 1.40 },
  { date: "2026-06-06", open: 1805.00, close: 1795.60, high: 1812.30, low: 1790.40, vol: 32765, amount: 5882340.00, amp: 1.22 },
  { date: "2026-06-09", open: 1798.00, close: 1808.40, high: 1815.60, low: 1792.20, vol: 34218, amount: 6182180.00, amp: 1.30 },
  { date: "2026-06-10", open: 1810.00, close: 1802.20, high: 1818.40, low: 1795.80, vol: 31567, amount: 5682630.00, amp: 1.26 },
  { date: "2026-06-11", open: 1805.00, close: 1815.60, high: 1822.30, low: 1800.40, vol: 35432, amount: 6422340.00, amp: 1.21 },
  { date: "2026-06-12", open: 1818.00, close: 1808.40, high: 1825.20, low: 1802.60, vol: 33124, amount: 5982180.00, amp: 1.25 },
  { date: "2026-06-13", open: 1810.00, close: 1822.80, high: 1830.50, low: 1805.30, vol: 36541, amount: 6682630.00, amp: 1.39 },
  { date: "2026-06-16", open: 1825.00, close: 1815.60, high: 1832.30, low: 1810.40, vol: 33765, amount: 6122340.00, amp: 1.21 },
  { date: "2026-06-17", open: 1818.00, close: 1828.40, high: 1835.60, low: 1812.20, vol: 35218, amount: 6452180.00, amp: 1.29 },
  { date: "2026-06-18", open: 1830.00, close: 1822.20, high: 1838.40, low: 1815.80, vol: 32432, amount: 5932630.00, amp: 1.24 },
  { date: "2026-06-19", open: 1825.00, close: 1835.60, high: 1842.30, low: 1820.40, vol: 36876, amount: 6782340.00, amp: 1.20 },
  { date: "2026-06-20", open: 1838.00, close: 1828.40, high: 1845.20, low: 1822.60, vol: 34124, amount: 6252180.00, amp: 1.24 },
  { date: "2026-06-23", open: 1830.00, close: 1842.80, high: 1850.50, low: 1825.30, vol: 37541, amount: 6922630.00, amp: 1.37 },
  { date: "2026-06-24", open: 1845.00, close: 1835.60, high: 1852.30, low: 1830.40, vol: 34765, amount: 6382340.00, amp: 1.19 },
  { date: "2026-06-25", open: 1838.00, close: 1848.40, high: 1855.60, low: 1832.20, vol: 36218, amount: 6722180.00, amp: 1.27 },
  { date: "2026-06-26", open: 1850.00, close: 1842.20, high: 1858.40, low: 1835.80, vol: 33432, amount: 6162630.00, amp: 1.22 },
  { date: "2026-06-27", open: 1845.00, close: 1855.60, high: 1862.30, low: 1840.40, vol: 37876, amount: 7032340.00, amp: 1.18 },
  { date: "2026-06-30", open: 1858.00, close: 1848.40, high: 1865.20, low: 1842.60, vol: 35124, amount: 6522180.00, amp: 1.22 },
  { date: "2026-07-01", open: 1850.00, close: 1862.80, high: 1870.50, low: 1845.30, vol: 38541, amount: 7182630.00, amp: 1.36 },
];

// ── Compute indicators from seed kline data ────────────────────────────────
function computeIndicators(data) {
  const closes = data.map((d) => d.close);
  const highs = data.map((d) => d.high);
  const lows = data.map((d) => d.low);
  const n = closes.length;

  // SMA
  function sma(arr, period) {
    if (arr.length < period) return null;
    return arr.slice(-period).reduce((a, b) => a + b, 0) / period;
  }

  // EMA
  function ema(arr, period) {
    if (arr.length < period) return null;
    const k = 2 / (period + 1);
    let val = arr.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < arr.length; i++) {
      val = arr[i] * k + val * (1 - k);
    }
    return val;
  }

  // RSI
  function rsi(arr, period) {
    if (arr.length < period + 1) return null;
    const deltas = arr.slice(1).map((v, i) => v - arr[i]);
    const recent = deltas.slice(-period);
    const gains = recent.filter((d) => d > 0).reduce((a, b) => a + b, 0) / period;
    const losses = recent.filter((d) => d < 0).reduce((a, b) => a + Math.abs(b), 0) / period;
    if (losses === 0) return 100;
    return 100 - 100 / (1 + gains / losses);
  }

  // KDJ
  function kdj(highs, lows, closes, n = 9) {
    if (closes.length < n) return { k: 50, d: 50, j: 50 };
    const h = highs.slice(-n);
    const l = lows.slice(-n);
    const c = closes[closes.length - 1];
    const hh = Math.max(...h);
    const ll = Math.min(...l);
    const rsv = hh === ll ? 50 : ((c - ll) / (hh - ll)) * 100;
    // Use EMA-style smoothing over recent RSV values
    let k = 50;
    const lookback = Math.min(closes.length, 9);
    for (let i = closes.length - lookback; i < closes.length; i++) {
      const windowH = highs.slice(Math.max(0, i - 8), i + 1);
      const windowL = lows.slice(Math.max(0, i - 8), i + 1);
      const windowHH = Math.max(...windowH);
      const windowLL = Math.min(...windowL);
      const r = windowHH === windowLL ? 50 : ((closes[i] - windowLL) / (windowHH - windowLL)) * 100;
      k = (2 / 3) * k + (1 / 3) * r;
    }
    const d = (2 / 3) * 50 + (1 / 3) * k;
    const j = 3 * k - 2 * d;
    return { k, d, j };
  }

  const latestPrice = closes[n - 1];
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const dif = ema12 != null && ema26 != null ? ema12 - ema26 : null;
  const dea = dif != null ? dif * 0.85 : null;  // Approximation
  const hist = dif != null && dea != null ? (dif - dea) * 2 : null;

  const ma5 = sma(closes, 5);
  const ma10 = sma(closes, 10);
  const ma20 = sma(closes, 20);
  const ma60 = n >= 60 ? sma(closes, 60) : null;

  const mid20 = sma(closes, 20);
  let bollUpper = null, bollLower = null, bollPosition = "unknown";
  if (n >= 20) {
    const variance = closes.slice(-20).reduce((s, v) => s + (v - mid20) ** 2, 0) / 20;
    const std = Math.sqrt(variance);
    bollUpper = mid20 + 2 * std;
    bollLower = mid20 - 2 * std;
    bollPosition = latestPrice > bollUpper ? "above_upper" : latestPrice > mid20 ? "above_middle" : latestPrice > bollLower ? "below_middle" : "below_lower";
  }

  const kdjResult = kdj(highs, lows, closes);
  const kdjSignal = kdjResult.j > 100 ? "overbought" : kdjResult.j < 0 ? "oversold" : "neutral";

  const rsiValue = rsi(closes, 14);
  const maTrend = ma5 != null && ma10 != null && ma20 != null
    ? (ma5 > ma10 && ma10 > ma20 ? "bullish_alignment" : ma5 < ma10 && ma10 < ma20 ? "bearish_alignment" : "mixed")
    : "unknown";

  return {
    rsi_14: rsiValue != null ? Math.round(rsiValue * 10) / 10 : null,
    macd: dif != null ? {
      dif: Math.round(dif * 1000) / 1000,
      dea: Math.round((dea ?? 0) * 1000) / 1000,
      hist: Math.round((hist ?? 0) * 1000) / 1000,
      signal: dif > (dea ?? 0) ? "bullish" : "bearish",
    } : null,
    kdj: {
      k: Math.round(kdjResult.k * 10) / 10,
      d: Math.round(kdjResult.d * 10) / 10,
      j: Math.round(kdjResult.j * 10) / 10,
      signal: kdjSignal,
    },
    boll: bollUpper != null ? {
      upper: Math.round(bollUpper * 100) / 100,
      middle: Math.round((mid20 ?? 0) * 100) / 100,
      lower: Math.round((bollLower ?? 0) * 100) / 100,
      position: bollPosition,
      current_price: latestPrice,
    } : null,
    ma: {
      ma5: ma5 != null ? Math.round(ma5 * 100) / 100 : null,
      ma10: ma10 != null ? Math.round(ma10 * 100) / 100 : null,
      ma20: ma20 != null ? Math.round(ma20 * 100) / 100 : null,
      ma60: ma60 != null ? Math.round(ma60 * 100) / 100 : null,
      trend: maTrend,
    },
  };
}

const indicators = computeIndicators(klineData);
const latest = klineData[klineData.length - 1];

console.log("Computed indicators for seed data:", JSON.stringify(indicators, null, 2));

try {
  await client.connect();
  await client.query("begin");

  await upsertTheme(client, {
    id: themeId,
    name: "Kweichow Moutai Daily Price",
    themeType: "price",
    infoType: "price",
    description: "Real-source daily price theme backed by Eastmoney kline data",
  });

  await upsertSource(client, {
    id: sourceId,
    themeId,
    name: "Eastmoney Kline: 600519",
    sourceType: "api",
    adapterKey: "eastmoney_stock_kline",
    status: "active",
    config: {
      secid: "1.600519",
      days: 45,
      schedule_interval_seconds: 86400,
      emit_events_on_latest_only: true,
    },
    latestSuccessAt: "2026-07-01T15:00:00Z",
    latestFailureAt: null,
  });

  await upsertSourceRun(client, {
    id: runId,
    themeId,
    sourceId,
    triggerType: "seed",
    status: "completed",
    startedAt: "2026-07-01T15:00:00Z",
    finishedAt: "2026-07-01T15:00:00Z",
  });

  // Store full kline history as raw snapshot payload
  const rawPayload = klineData.map((d) => ({
    title: "Kweichow Moutai daily close",
    occurred_at: `${d.date}T15:00:00+08:00`,
    price: d.close,
    currency: "CNY",
    symbol: "1.600519",
    url: "https://quote.eastmoney.com/1.600519.html",
    open: d.open,
    high: d.high,
    low: d.low,
    volume: d.vol,
    amount: d.amount,
    amplitude: d.amp,
    display_name: "贵州茅台",
  }));

  await upsertRawSnapshot(client, {
    id: snapshotId,
    sourceRunId: runId,
    themeId,
    sourceId,
    fetchedAt: "2026-07-01T15:00:00Z",
    payloadJson: rawPayload,
  });

  // Store the latest record with computed indicators
  await upsertNormalizedRecord(client, {
    id: recordId,
    sourceRunId: runId,
    themeId,
    sourceId,
    infoType: "price",
    occurredAt: `${latest.date}T15:00:00+08:00`,
    title: "Kweichow Moutai daily close",
    fingerprint: `eastmoney_moutai_daily_close_${latest.date.replace(/-/g, "")}`,
    logicalKey: `price:1.600519:${latest.date}`,
    content: {
      price: latest.close,
      currency: "CNY",
      symbol: "1.600519",
      spec: "1.600519",
      display_name: "贵州茅台",
      url: "https://quote.eastmoney.com/1.600519.html",
      open: latest.open,
      high: latest.high,
      low: latest.low,
      volume: latest.vol,
      amount: latest.amount,
      amplitude: latest.amp,
      trust_score: 85,
      trust_factors: ["有成交量数据", "有来源链接可供核实"],
      risk_level: "likely_valid",
      indicators,
    },
  });

  await client.query("commit");
  console.log("Eastmoney stock demo seeded with 45-day kline data and computed indicators.");
} catch (error) {
  await client.query("rollback").catch(() => undefined);
  console.error("Failed to seed Eastmoney stock demo.");
  console.error(error);
  processExitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
