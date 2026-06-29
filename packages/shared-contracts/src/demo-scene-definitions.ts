/**
 * Demo Scene Definitions
 *
 * 统一的 demo 场景定义，供前端静态演示数据和 DB 种子共享。
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
  STATS_MACRO_RELEASES: "theme-stats-macro-releases",
  CSRC_ANNOUNCEMENTS: "theme-csrc-announcements",
  NFRA_ANNOUNCEMENTS: "theme-nfra-announcements",
  NDRC_ANNOUNCEMENTS: "theme-ndrc-announcements",
  SSE_ANNOUNCEMENTS: "theme-sse-announcements",
  SZSE_ANNOUNCEMENTS: "theme-szse-announcements",
  HKEX_ANNOUNCEMENTS: "theme-hkex-announcements",
  FIGMA_UPDATES: "theme-figma-updates",
  EASTMONEY_MOUTAI: "theme-eastmoney-moutai",
  PBC_NEWS: "theme-pbc-news",
  CN_HK_MARKET_OVERVIEW: "theme-cn-hk-market-overview",
  // International gold price
  INTERNATIONAL_GOLD: "theme-international-gold",
  // US stock indices (S&P 500)
  US_SP500: "theme-us-sp500",
  // GitHub product releases (Vue.js)
  VUE_RELEASES: "theme-vue-releases",
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
  STATS_MACRO_RELEASE: "source-stats-macro-release",
  // CSRC / NFRA / NDRC
  CSRC_ANNOUNCEMENTS: "source-csrc-announcements",
  NFRA_ANNOUNCEMENTS: "source-nfra-announcements",
  NDRC_ANNOUNCEMENTS: "source-ndrc-announcements",
  // Exchanges
  SSE_ANNOUNCEMENTS: "source-sse-announcements",
  SZSE_ANNOUNCEMENTS: "source-szse-announcements",
  HKEX_ANNOUNCEMENTS: "source-hkex-announcements",
  // Figma
  FIGMA_RELEASE_NOTES: "source-figma-release-notes",
  // Eastmoney Moutai
  EASTMONEY_MOUTAI_KLINE: "source-eastmoney-moutai-kline",
  // PBOC News
  PBC_NEWS_LIST: "source-pbc-news-list",
  // China / Hong Kong market overview
  CN_HK_MARKET_OVERVIEW: "source-cn-hk-market-overview",
  // International gold price (Sina)
  SINA_GOLD: "source-sina-gold",
  // US stock indices (Yahoo Finance)
  YAHOO_SP500: "source-yahoo-sp500",
  // GitHub Vue.js releases
  GITHUB_VUE_RELEASES: "source-github-vue-releases",
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
  STATS_MACRO_RELEASE_LATEST: "event-stats-macro-release-latest",
  // CSRC / NFRA / NDRC
  CSRC_ANNOUNCEMENT_LATEST: "event-csrc-announcement-latest",
  NFRA_ANNOUNCEMENT_LATEST: "event-nfra-announcement-latest",
  NDRC_ANNOUNCEMENT_LATEST: "event-ndrc-announcement-latest",
  // Exchanges
  SSE_ANNOUNCEMENT_LATEST: "event-sse-announcement-latest",
  SZSE_ANNOUNCEMENT_LATEST: "event-szse-announcement-latest",
  HKEX_ANNOUNCEMENT_LATEST: "event-hkex-announcement-latest",
  // Figma
  FIGMA_RELEASE: "event-figma-release",
  // PBOC News
  PBC_NEWS_LATEST: "event-pbc-news-latest",
  // NBS Stats Data Release
  STATS_DATA_RELEASE_LATEST: "event-stats-data-release-latest",
  // China / Hong Kong market overview
  CN_HK_MARKET_BULLISH: "event-cn-hk-market-bullish",
  // International gold
  GOLD_PRICE_DROP: "event-gold-price-drop",
  // S&P 500
  SP500_MILESTONE: "event-sp500-milestone",
  // Vue.js
  VUE_RELEASE: "event-vue-release",
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
  STATS_MACRO_RELEASE_LATEST: "run-stats-macro-release-latest",
  CSRC_ANNOUNCEMENT_LATEST: "run-csrc-announcement-latest",
  NFRA_ANNOUNCEMENT_LATEST: "run-nfra-announcement-latest",
  NDRC_ANNOUNCEMENT_LATEST: "run-ndrc-announcement-latest",
  SSE_ANNOUNCEMENT_LATEST: "run-sse-announcement-latest",
  SZSE_ANNOUNCEMENT_LATEST: "run-szse-announcement-latest",
  HKEX_ANNOUNCEMENT_LATEST: "run-hkex-announcement-latest",
  // Figma
  FIGMA_RELEASE_LATEST: "run-figma-release-latest",
  // China / Hong Kong market overview
  CN_HK_MARKET_OVERVIEW_LATEST: "run-cn-hk-market-overview-latest",
  // International gold
  SINA_GOLD_SEED: "run-sina-gold-seed",
  // US stock indices
  YAHOO_SP500_SEED: "run-yahoo-sp500-seed",
  // Vue.js
  GITHUB_VUE_SEED: "run-github-vue-seed",
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
  STATS_MACRO_RELEASE_LATEST: "snapshot-stats-macro-release-latest",
  CSRC_ANNOUNCEMENT_LATEST: "snapshot-csrc-announcement-latest",
  NFRA_ANNOUNCEMENT_LATEST: "snapshot-nfra-announcement-latest",
  NDRC_ANNOUNCEMENT_LATEST: "snapshot-ndrc-announcement-latest",
  SSE_ANNOUNCEMENT_LATEST: "snapshot-sse-announcement-latest",
  SZSE_ANNOUNCEMENT_LATEST: "snapshot-szse-announcement-latest",
  HKEX_ANNOUNCEMENT_LATEST: "snapshot-hkex-announcement-latest",
  // Figma
  FIGMA_RELEASE_LATEST: "snapshot-figma-release-latest",
  // China / Hong Kong market overview
  CN_HK_MARKET_OVERVIEW_LATEST: "snapshot-cn-hk-market-overview-latest",
  // International gold
  SINA_GOLD_SEED: "snapshot-sina-gold-seed",
  // US stock indices
  YAHOO_SP500_SEED: "snapshot-yahoo-sp500-seed",
  // Vue.js
  GITHUB_VUE_SEED: "snapshot-github-vue-seed",
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
  STATS_MACRO_RELEASE_LATEST: "record-stats-macro-release-latest",
  CSRC_ANNOUNCEMENT_LATEST: "record-csrc-announcement-latest",
  NFRA_ANNOUNCEMENT_LATEST: "record-nfra-announcement-latest",
  NDRC_ANNOUNCEMENT_LATEST: "record-ndrc-announcement-latest",
  SSE_ANNOUNCEMENT_LATEST: "record-sse-announcement-latest",
  SZSE_ANNOUNCEMENT_LATEST: "record-szse-announcement-latest",
  HKEX_ANNOUNCEMENT_LATEST: "record-hkex-announcement-latest",
  // Figma
  FIGMA_RELEASE_LATEST: "record-figma-release-latest",
  // China / Hong Kong market overview
  CN_HK_MARKET_OVERVIEW_LATEST: "record-cn-hk-market-overview-latest",
  // International gold
  SINA_GOLD_SEED: "record-sina-gold-seed",
  // US stock indices
  YAHOO_SP500_SEED: "record-yahoo-sp500-seed",
  // Vue.js
  GITHUB_VUE_SEED: "record-github-vue-seed",
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
  STATS_MACRO_RELEASES: {
    id: DEMO_THEME_IDS.STATS_MACRO_RELEASES,
    name: "NBS Macro Releases",
    type: "news_announcement",
    status: "active",
    description: "Official macro release list from the National Bureau of Statistics",
  },
  CSRC_ANNOUNCEMENTS: {
    id: DEMO_THEME_IDS.CSRC_ANNOUNCEMENTS,
    name: "CSRC Announcements",
    type: "financial_event",
    status: "active",
    description: "Official CSRC announcement list for market supervision and securities regulation",
  },
  NFRA_ANNOUNCEMENTS: {
    id: DEMO_THEME_IDS.NFRA_ANNOUNCEMENTS,
    name: "NFRA Announcements",
    type: "financial_event",
    status: "active",
    description: "Official NFRA announcement list for banking and insurance supervision",
  },
  NDRC_ANNOUNCEMENTS: {
    id: DEMO_THEME_IDS.NDRC_ANNOUNCEMENTS,
    name: "NDRC Price Guidance",
    type: "financial_event",
    status: "active",
    description: "Official NDRC price and policy guidance announcements",
  },
  SSE_ANNOUNCEMENTS: {
    id: DEMO_THEME_IDS.SSE_ANNOUNCEMENTS,
    name: "SSE Announcements",
    type: "news_announcement",
    status: "active",
    description: "Official listed-company announcement feed from the Shanghai Stock Exchange",
  },
  SZSE_ANNOUNCEMENTS: {
    id: DEMO_THEME_IDS.SZSE_ANNOUNCEMENTS,
    name: "SZSE Announcements",
    type: "news_announcement",
    status: "active",
    description: "Official listed-company announcement feed from the Shenzhen Stock Exchange",
  },
  HKEX_ANNOUNCEMENTS: {
    id: DEMO_THEME_IDS.HKEX_ANNOUNCEMENTS,
    name: "HKEX Announcements",
    type: "news_announcement",
    status: "active",
    description: "Official listed-company announcement feed from HKEXnews",
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
  INTERNATIONAL_GOLD: {
    id: DEMO_THEME_IDS.INTERNATIONAL_GOLD,
    name: "International Gold Price",
    type: "price",
    status: "active",
    description: "Real-time international gold (XAU/USD) price tracking via Sina Finance",
  },
  US_SP500: {
    id: DEMO_THEME_IDS.US_SP500,
    name: "S&P 500 Index",
    type: "price",
    status: "active",
    description: "Daily S&P 500 index price via Yahoo Finance",
  },
  VUE_RELEASES: {
    id: DEMO_THEME_IDS.VUE_RELEASES,
    name: "Vue.js Releases",
    type: "content_update",
    status: "active",
    description: "Monitor Vue.js framework releases via GitHub",
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
  STATS_MACRO_RELEASE: {
    id: DEMO_SOURCE_IDS.STATS_MACRO_RELEASE,
    themeId: DEMO_THEME_IDS.STATS_MACRO_RELEASES,
    name: "NBS Macro Release List",
    sourceType: "page_list",
    adapterKey: "stats_data_release_list",
    status: "healthy",
    isPaused: false,
  },
  CSRC_ANNOUNCEMENTS: {
    id: DEMO_SOURCE_IDS.CSRC_ANNOUNCEMENTS,
    themeId: DEMO_THEME_IDS.CSRC_ANNOUNCEMENTS,
    name: "CSRC Announcement List",
    sourceType: "page_list",
    adapterKey: "csrc_announcements",
    status: "healthy",
    isPaused: false,
  },
  NFRA_ANNOUNCEMENTS: {
    id: DEMO_SOURCE_IDS.NFRA_ANNOUNCEMENTS,
    themeId: DEMO_THEME_IDS.NFRA_ANNOUNCEMENTS,
    name: "NFRA Announcement List",
    sourceType: "page_list",
    adapterKey: "cbirc_announcements",
    status: "healthy",
    isPaused: false,
  },
  NDRC_ANNOUNCEMENTS: {
    id: DEMO_SOURCE_IDS.NDRC_ANNOUNCEMENTS,
    themeId: DEMO_THEME_IDS.NDRC_ANNOUNCEMENTS,
    name: "NDRC Announcement List",
    sourceType: "page_list",
    adapterKey: "ndrc_announcements",
    status: "warning",
    isPaused: false,
  },
  SSE_ANNOUNCEMENTS: {
    id: DEMO_SOURCE_IDS.SSE_ANNOUNCEMENTS,
    themeId: DEMO_THEME_IDS.SSE_ANNOUNCEMENTS,
    name: "SSE Announcement Feed",
    sourceType: "api",
    adapterKey: "sse_announcements",
    status: "healthy",
    isPaused: false,
  },
  SZSE_ANNOUNCEMENTS: {
    id: DEMO_SOURCE_IDS.SZSE_ANNOUNCEMENTS,
    themeId: DEMO_THEME_IDS.SZSE_ANNOUNCEMENTS,
    name: "SZSE Announcement Feed",
    sourceType: "api",
    adapterKey: "szse_announcements",
    status: "healthy",
    isPaused: false,
  },
  HKEX_ANNOUNCEMENTS: {
    id: DEMO_SOURCE_IDS.HKEX_ANNOUNCEMENTS,
    themeId: DEMO_THEME_IDS.HKEX_ANNOUNCEMENTS,
    name: "HKEXnews Announcement Feed",
    sourceType: "api",
    adapterKey: "hkex_announcements",
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
  SINA_GOLD: {
    id: DEMO_SOURCE_IDS.SINA_GOLD,
    themeId: DEMO_THEME_IDS.INTERNATIONAL_GOLD,
    name: "Sina Finance Gold Quote",
    sourceType: "api",
    adapterKey: "sina_gold_price",
    status: "healthy",
    isPaused: false,
  },
  YAHOO_SP500: {
    id: DEMO_SOURCE_IDS.YAHOO_SP500,
    themeId: DEMO_THEME_IDS.US_SP500,
    name: "Yahoo Finance S&P 500",
    sourceType: "api",
    adapterKey: "yahoo_finance_price",
    status: "healthy",
    isPaused: false,
  },
  GITHUB_VUE_RELEASES: {
    id: DEMO_SOURCE_IDS.GITHUB_VUE_RELEASES,
    themeId: DEMO_THEME_IDS.VUE_RELEASES,
    name: "GitHub Vue.js Releases",
    sourceType: "api",
    adapterKey: "github_releases",
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
