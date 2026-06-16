/**
 * Demo Scene IDs (DB Seed Scripts)
 *
 * 统一的 demo 场景 ID 常量，供所有 db-seed-*.mjs 脚本共享。
 * 与 packages/shared-contracts/src/demo-scene-definitions.ts 保持同步。
 *
 * 所有 ID 使用 kebab-case 命名，格式为 `{type}-{kebab-case-name}`。
 */

// ─── Theme IDs ────────────────────────────────────────────────────────────────

export const DEMO_THEME_IDS = {
  SURFACE_PRO_8: "theme-surface-pro-8",
  PBC_OPEN_MARKET: "theme-pbc-open-market",
  STATS_CPI_RELEASES: "theme-stats-cpi-releases",
  FIGMA_UPDATES: "theme-figma-updates",
  EASTMONEY_MOUTAI: "theme-eastmoney-moutai",
  PBC_NEWS: "theme-pbc-news",
  // China / Hong Kong market overview
  CN_HK_MARKET_OVERVIEW: "theme-cn-hk-market-overview",
};

// ─── Source IDs ────────────────────────────────────────────────────────────────

export const DEMO_SOURCE_IDS = {
  // Surface Pro 8
  XIANYU_SURFACE: "source-xianyu-surface",
  ZHUANZHUAN_SURFACE: "source-zhuanzhuan-surface",
  // PBOC Open Market
  PBC_OPEN_MARKET: "source-pbc-open-market",
  PBC_OPEN_MARKET_HISTORY: "source-pbc-open-market-history",
  // NBS CPI
  STATS_CPI_RELEASE: "source-stats-cpi-release",
  // Figma
  FIGMA_RELEASE_NOTES: "source-figma-release-notes",
  // Eastmoney Moutai
  EASTMONEY_MOUTAI_KLINE: "source-eastmoney-moutai-kline",
  // PBOC News
  PBC_NEWS_LIST: "source-pbc-news-list",
  // China / Hong Kong market overview
  CN_HK_MARKET_OVERVIEW: "source-cn-hk-market-overview",
};

// ─── Event IDs ────────────────────────────────────────────────────────────────

export const DEMO_EVENT_IDS = {
  // Surface Pro 8
  SURFACE_LOW: "event-surface-low",
  // PBOC Open Market
  PBC_WITHDRAWAL: "event-pbc-withdrawal",
  PBC_INJECTION: "event-pbc-injection",
  // NBS CPI
  CPI_RELEASE: "event-cpi-release",
  // Figma
  FIGMA_RELEASE: "event-figma-release",
  // PBOC News
  PBC_NEWS_LATEST: "event-pbc-news-latest",
  // NBS Stats Data Release
  STATS_DATA_RELEASE_LATEST: "event-stats-data-release-latest",
  // China / Hong Kong market overview
  CN_HK_MARKET_BULLISH: "event-cn-hk-market-bullish",
};

// ─── Run IDs ──────────────────────────────────────────────────────────────────

export const DEMO_RUN_IDS = {
  // Surface Pro 8
  SURFACE_BASELINE: "run-surface-baseline",
  XIANYU_SURFACE_SEED: "run-xianyu-surface-seed",
  ZHUANZHUAN_SURFACE_SEED: "run-zhuanzhuan-surface-seed",
  // PBOC Open Market
  PBC_NEUTRAL: "run-pbc-neutral",
  PBC_INJECTION: "run-pbc-injection",
  PBC_WITHDRAWAL: "run-pbc-withdrawal",
  // Eastmoney Moutai
  EASTMONEY_MOUTAI_SEED: "run-eastmoney-moutai-seed",
  // PBOC News
  PBC_NEWS_LATEST: "run-pbc-news-latest",
  // NBS Stats Data Release
  STATS_DATA_RELEASE_LATEST: "run-stats-data-release-latest",
  // Figma
  FIGMA_RELEASE_LATEST: "run-figma-release-latest",
  // China / Hong Kong market overview
  CN_HK_MARKET_OVERVIEW_LATEST: "run-cn-hk-market-overview-latest",
};

// ─── Snapshot IDs ─────────────────────────────────────────────────────────────

export const DEMO_SNAPSHOT_IDS = {
  // Surface Pro 8
  SURFACE_BASELINE: "snapshot-surface-baseline",
  // PBOC Open Market
  PBC_NEUTRAL: "snapshot-pbc-neutral",
  PBC_INJECTION: "snapshot-pbc-injection",
  PBC_WITHDRAWAL: "snapshot-pbc-withdrawal",
  // Eastmoney Moutai
  EASTMONEY_MOUTAI_SEED: "snapshot-eastmoney-moutai-seed",
  // PBOC News
  PBC_NEWS_LATEST: "snapshot-pbc-news-latest",
  // NBS Stats Data Release
  STATS_DATA_RELEASE_LATEST: "snapshot-stats-data-release-latest",
  // Figma
  FIGMA_RELEASE_LATEST: "snapshot-figma-release-latest",
  // China / Hong Kong market overview
  CN_HK_MARKET_OVERVIEW_LATEST: "snapshot-cn-hk-market-overview-latest",
};

// ─── Record IDs ───────────────────────────────────────────────────────────────

export const DEMO_RECORD_IDS = {
  // Surface Pro 8
  SURFACE_BASELINE: "record-surface-baseline",
  // PBOC Open Market
  PBC_NEUTRAL: "record-pbc-neutral",
  PBC_INJECTION: "record-pbc-injection",
  PBC_WITHDRAWAL: "record-pbc-withdrawal",
  // Eastmoney Moutai
  EASTMONEY_MOUTAI_SEED: "record-eastmoney-moutai-seed",
  // PBOC News
  PBC_NEWS_LATEST: "record-pbc-news-latest",
  // NBS Stats Data Release
  STATS_DATA_RELEASE_LATEST: "record-stats-data-release-latest",
  // Figma
  FIGMA_RELEASE_LATEST: "record-figma-release-latest",
  // China / Hong Kong market overview
  CN_HK_MARKET_OVERVIEW_LATEST: "record-cn-hk-market-overview-latest",
};

// ─── Change IDs ───────────────────────────────────────────────────────────────

export const DEMO_CHANGE_IDS = {
  // PBOC Open Market
  PBC_INJECTION: "change-pbc-injection",
  PBC_WITHDRAWAL: "change-pbc-withdrawal",
};

// ─── Notification IDs ─────────────────────────────────────────────────────────

export const DEMO_NOTIFICATION_IDS = {
  SURFACE_LOW: "notification-surface-low",
  PBC_INJECTION: "notification-pbc-injection",
  PBC_WITHDRAWAL: "notification-pbc-withdrawal",
};

// ─── Event Status History IDs ─────────────────────────────────────────────────

export const DEMO_EVENT_STATUS_HISTORY_IDS = {
  PBC_INJECTION: "event-status-history-pbc-injection",
  PBC_WITHDRAWAL: "event-status-history-pbc-withdrawal",
};
