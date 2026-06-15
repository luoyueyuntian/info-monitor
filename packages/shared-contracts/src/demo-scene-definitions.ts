/**
 * Demo Scene Definitions
 *
 * 统一的 demo 场景定义，供前端 fallback、API mock、DB 种子三处共享。
 * 所有 ID 使用 kebab-case 命名，格式为 `{type}-{kebab-case-name}`。
 *
 * 新增 demo 场景时，只需在此文件中添加定义，然后在各处引用即可。
 */

import type {
  EventSignal,
  EventStatus,
  InfoType,
  NotificationChannel,
  NotificationStatus,
  SourceHealth,
} from "./index.js";

// ─── Naming Convention ────────────────────────────────────────────────────────

/**
 * ID 命名约定：
 * - Theme:        theme-{kebab-case-name}
 * - Source:       source-{kebab-case-name}
 * - Event:        event-{kebab-case-name}
 * - Record:       record-{kebab-case-name}
 * - Run:          run-{kebab-case-name}
 * - Snapshot:     snapshot-{kebab-case-name}
 * - Change:       change-{kebab-case-name}
 * - Notification: notification-{kebab-case-name}
 */

// ─── Theme IDs ────────────────────────────────────────────────────────────────

export const DEMO_THEME_IDS = {
  SURFACE_PRO_8: "theme-surface-pro-8",
  PBC_OPEN_MARKET: "theme-pbc-open-market",
  STATS_CPI_RELEASES: "theme-stats-cpi-releases",
  FIGMA_UPDATES: "theme-figma-updates",
  EASTMONEY_MOUTAI: "theme-eastmoney-moutai",
  PBC_NEWS: "theme-pbc-news",
  CN_HK_MARKET_OVERVIEW: "theme-cn-hk-market-overview",
} as const;

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
} as const;

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
} as const;

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
} as const;

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
} as const;

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
} as const;

// ─── Change IDs ───────────────────────────────────────────────────────────────

export const DEMO_CHANGE_IDS = {
  // PBOC Open Market
  PBC_INJECTION: "change-pbc-injection",
  PBC_WITHDRAWAL: "change-pbc-withdrawal",
} as const;

// ─── Notification IDs ─────────────────────────────────────────────────────────

export const DEMO_NOTIFICATION_IDS = {
  SURFACE_LOW: "notification-surface-low",
  PBC_INJECTION: "notification-pbc-injection",
  PBC_WITHDRAWAL: "notification-pbc-withdrawal",
} as const;

// ─── Event Status History IDs ─────────────────────────────────────────────────

export const DEMO_EVENT_STATUS_HISTORY_IDS = {
  PBC_INJECTION: "event-status-history-pbc-injection",
  PBC_WITHDRAWAL: "event-status-history-pbc-withdrawal",
} as const;

// ─── Theme Definitions ────────────────────────────────────────────────────────

export interface DemoThemeDefinition {
  id: string;
  name: string;
  type: InfoType;
  status: string;
  description: string;
}

export const DEMO_THEMES: Record<string, DemoThemeDefinition> = {
  SURFACE_PRO_8: {
    id: DEMO_THEME_IDS.SURFACE_PRO_8,
    name: "Surface Pro 8 16G + 512G Price",
    type: "price",
    status: "active",
    description: "Cross-marketplace price monitor for Surface Pro 8 16G+512G",
  },
  PBC_OPEN_MARKET: {
    id: DEMO_THEME_IDS.PBC_OPEN_MARKET,
    name: "PBOC Open Market Operations",
    type: "financial_event",
    status: "active",
    description: "Official open market operation announcements from the PBOC",
  },
  STATS_CPI_RELEASES: {
    id: DEMO_THEME_IDS.STATS_CPI_RELEASES,
    name: "NBS CPI Releases",
    type: "news_announcement",
    status: "active",
    description: "Official CPI release list from the National Bureau of Statistics",
  },
  FIGMA_UPDATES: {
    id: DEMO_THEME_IDS.FIGMA_UPDATES,
    name: "Figma Product Updates",
    type: "content_update",
    status: "active",
    description: "Figma official release notes monitoring",
  },
  EASTMONEY_MOUTAI: {
    id: DEMO_THEME_IDS.EASTMONEY_MOUTAI,
    name: "Kweichow Moutai Daily Price",
    type: "price",
    status: "active",
    description: "Eastmoney daily price theme backed by kline data",
  },
  PBC_NEWS: {
    id: DEMO_THEME_IDS.PBC_NEWS,
    name: "PBOC News Releases",
    type: "news_announcement",
    status: "active",
    description: "Official PBOC news and release list",
  },
  CN_HK_MARKET_OVERVIEW: {
    id: DEMO_THEME_IDS.CN_HK_MARKET_OVERVIEW,
    name: "A股与港股每日市场概览",
    type: "financial_event",
    status: "active",
    description: "Daily market overview for A-shares and Hong Kong equities with northbound/southbound flow snapshots",
  },
};

// ─── Source Definitions ────────────────────────────────────────────────────────

export interface DemoSourceDefinition {
  id: string;
  themeId: string;
  name: string;
  sourceType: string;
  adapterKey: string;
  status: SourceHealth | string;
  isPaused: boolean;
}

export const DEMO_SOURCES: Record<string, DemoSourceDefinition> = {
  XIANYU_SURFACE: {
    id: DEMO_SOURCE_IDS.XIANYU_SURFACE,
    themeId: DEMO_THEME_IDS.SURFACE_PRO_8,
    name: "闲鱼搜索结果",
    sourceType: "api",
    adapterKey: "generic_price_list",
    status: "healthy",
    isPaused: false,
  },
  ZHUANZHUAN_SURFACE: {
    id: DEMO_SOURCE_IDS.ZHUANZHUAN_SURFACE,
    themeId: DEMO_THEME_IDS.SURFACE_PRO_8,
    name: "转转搜索结果",
    sourceType: "api",
    adapterKey: "generic_price_list",
    status: "healthy",
    isPaused: false,
  },
  PBC_OPEN_MARKET: {
    id: DEMO_SOURCE_IDS.PBC_OPEN_MARKET,
    themeId: DEMO_THEME_IDS.PBC_OPEN_MARKET,
    name: "PBOC Open Market Announcements",
    sourceType: "page_list",
    adapterKey: "pbc_open_market_announcements",
    status: "warning",
    isPaused: false,
  },
  PBC_OPEN_MARKET_HISTORY: {
    id: DEMO_SOURCE_IDS.PBC_OPEN_MARKET_HISTORY,
    themeId: DEMO_THEME_IDS.PBC_OPEN_MARKET,
    name: "PBOC Open Market History",
    sourceType: "page_list",
    adapterKey: "pbc_open_market_announcements",
    status: "healthy",
    isPaused: false,
  },
  STATS_CPI_RELEASE: {
    id: DEMO_SOURCE_IDS.STATS_CPI_RELEASE,
    themeId: DEMO_THEME_IDS.STATS_CPI_RELEASES,
    name: "NBS CPI Release List",
    sourceType: "page_list",
    adapterKey: "stats_data_release_list",
    status: "healthy",
    isPaused: false,
  },
  FIGMA_RELEASE_NOTES: {
    id: DEMO_SOURCE_IDS.FIGMA_RELEASE_NOTES,
    themeId: DEMO_THEME_IDS.FIGMA_UPDATES,
    name: "Figma Release Notes",
    sourceType: "page_list",
    adapterKey: "generic_content_update_list",
    status: "healthy",
    isPaused: false,
  },
  EASTMONEY_MOUTAI_KLINE: {
    id: DEMO_SOURCE_IDS.EASTMONEY_MOUTAI_KLINE,
    themeId: DEMO_THEME_IDS.EASTMONEY_MOUTAI,
    name: "Eastmoney Kline: 600519",
    sourceType: "api",
    adapterKey: "eastmoney_stock_kline",
    status: "healthy",
    isPaused: false,
  },
  PBC_NEWS_LIST: {
    id: DEMO_SOURCE_IDS.PBC_NEWS_LIST,
    themeId: DEMO_THEME_IDS.PBC_NEWS,
    name: "PBOC News List",
    sourceType: "page_list",
    adapterKey: "pbc_news_list",
    status: "healthy",
    isPaused: false,
  },
  CN_HK_MARKET_OVERVIEW: {
    id: DEMO_SOURCE_IDS.CN_HK_MARKET_OVERVIEW,
    themeId: DEMO_THEME_IDS.CN_HK_MARKET_OVERVIEW,
    name: "Eastmoney China / Hong Kong Market Overview",
    sourceType: "api",
    adapterKey: "eastmoney_market_overview",
    status: "healthy",
    isPaused: false,
  },
};

// ─── Event Type Mapping ───────────────────────────────────────────────────────

/** InfoType -> 默认 eventType 映射 */
export const DEFAULT_EVENT_TYPES: Record<InfoType, string> = {
  price: "price_low",
  financial_event: "new_financial_event",
  news_announcement: "new_release",
  content_update: "content_update",
};
