import {
  DEFAULT_EVENT_TYPES,
  DEMO_EVENT_IDS,
  DEMO_EVENT_STATUS_HISTORY_IDS,
  DEMO_NOTIFICATION_IDS,
  DEMO_SOURCE_IDS,
  DEMO_THEME_IDS,
} from "@info-monitor/shared-contracts";
import type {
  EventStatusHistoryEntry,
  EventSummary as SharedEventSummary,
  NotificationItem,
  SourceStatus as SharedSourceStatus,
  ThemeSummary as SharedThemeSummary,
} from "@info-monitor/shared-contracts";

// Extend shared types with fixture-specific fields
type ThemeSummary = SharedThemeSummary & {
  latestRunAt: string; // Override to be required in fixtures
  metadata?: Record<string, unknown>;
};

type EventSummary = SharedEventSummary & {
  evidence: string[]; // Add evidence field for fixtures
};

type SourceStatus = SharedSourceStatus;

type EventStatusHistory = EventStatusHistoryEntry & {
  fromStatus: string | null; // Override to allow null
};

type DemoThemeFixture = {
  theme: ThemeSummary;
  events: EventSummary[];
  sources: SourceStatus[];
};

const surfaceTheme: DemoThemeFixture = {
  theme: {
    id: DEMO_THEME_IDS.SURFACE_PRO_8,
    name: "Surface Pro 8 16G + 512G Price",
    type: "price",
    status: "active",
    latestRunAt: "2026-06-01T09:30:00Z",
    latestEventAt: "2026-06-01T09:31:00Z",
    sourceCount: 2,
    metadata: {},
  },
  events: [
    {
      id: DEMO_EVENT_IDS.SURFACE_LOW,
      themeId: DEMO_THEME_IDS.SURFACE_PRO_8,
      themeName: "Surface Pro 8 16G + 512G Price",
      title: "30-day low detected across marketplaces",
      signal: "30d_low",
      status: "open",
      isRead: false,
      isBookmarked: true,
      bookmarkedAt: "2026-06-01T10:00:00Z",
      eventType: DEFAULT_EVENT_TYPES.price,
      occurredAt: "2026-06-01T09:31:00Z",
      summary: "A new cross-platform low price was detected for the same configuration.",
      infoType: "price",
      context: {
        price: 3999,
        currency: "CNY",
        spec: "16G+512G",
      },
      evidence: [
        "Xianyu result set normalized successfully.",
        "Price compared against prior 30-day window.",
        "Threshold rule emitted a new low event.",
      ],
    },
  ],
  sources: [
    {
      id: DEMO_SOURCE_IDS.XIANYU_SURFACE,
      themeId: DEMO_THEME_IDS.SURFACE_PRO_8,
      themeName: "Surface Pro 8 16G + 512G Price",
      themeType: "price",
      latestEventSignal: "30d_low",
      name: "Xianyu Search Results",
      status: "healthy",
      sourceType: "page_list",
      adapterKey: "demo_price_feed",
      isPaused: false,
      onboardingStatus: "active",
      latestRunStatus: "completed",
      latestRunAt: "2026-06-01T09:30:00Z",
      latestSuccessAt: "2026-06-01T09:30:00Z",
      latestFailureAt: null,
      lastErrorMessage: null,
    },
    {
      id: DEMO_SOURCE_IDS.ZHUANZHUAN_SURFACE,
      themeId: DEMO_THEME_IDS.SURFACE_PRO_8,
      themeName: "Surface Pro 8 16G + 512G Price",
      themeType: "price",
      latestEventSignal: "30d_low",
      name: "Zhuanzhuan Search Results",
      status: "healthy",
      sourceType: "page_list",
      adapterKey: "demo_price_feed",
      isPaused: false,
      onboardingStatus: "active",
      latestRunStatus: "completed",
      latestRunAt: "2026-06-01T09:24:00Z",
      latestSuccessAt: "2026-06-01T09:24:00Z",
      latestFailureAt: null,
      lastErrorMessage: null,
    },
  ],
};

const pbcTheme: DemoThemeFixture = {
  theme: {
    id: DEMO_THEME_IDS.PBC_OPEN_MARKET,
    name: "PBOC Open Market Operations",
    type: "financial_event",
    status: "active",
    latestRunAt: "2026-06-01T06:12:00Z",
    latestEventAt: "2026-06-01T06:10:00Z",
    sourceCount: 2,
    metadata: {},
  },
  events: [
    {
      id: DEMO_EVENT_IDS.PBC_WITHDRAWAL,
      themeId: DEMO_THEME_IDS.PBC_OPEN_MARKET,
      themeName: "PBOC Open Market Operations",
      title: "Liquidity withdrawal signal recorded",
      signal: "liquidity_withdrawal",
      status: "open",
      isRead: false,
      isBookmarked: false,
      bookmarkedAt: null,
      eventType: DEFAULT_EVENT_TYPES.financial_event,
      occurredAt: "2026-06-01T06:10:00Z",
      summary: "A new open market operation was classified as a liquidity withdrawal signal.",
      infoType: "financial_event",
      context: {
        direction_label: "liquidity_withdrawal",
        announcement_no: "[2026]第91号",
        operation_type: "逆回购",
        amount_billion_cny: 420,
        term_days: 7,
        rate_percent: 1.4,
      },
      evidence: [
        "Latest PBOC operation list fetched successfully.",
        "Structured financial event snapshot generated from the announcement.",
        "Direction tag assigned as liquidity withdrawal by current rules.",
      ],
    },
    {
      id: DEMO_EVENT_IDS.PBC_INJECTION,
      themeId: DEMO_THEME_IDS.PBC_OPEN_MARKET,
      themeName: "PBOC Open Market Operations",
      title: "Potential bullish macro event recorded",
      signal: "liquidity_injection",
      status: "tracking",
      isRead: true,
      isBookmarked: false,
      bookmarkedAt: null,
      eventType: DEFAULT_EVENT_TYPES.financial_event,
      occurredAt: "2026-05-31T03:00:00Z",
      summary: "A macro release was classified as a potentially bullish event.",
      infoType: "financial_event",
      context: {
        direction_label: "liquidity_injection",
        announcement_no: "[2026]第88号",
        operation_type: "逆回购",
        amount_billion_cny: 980,
        term_days: 7,
        rate_percent: 1.4,
      },
      evidence: [
        "Official release captured from a monitored source.",
        "Financial event normalizer produced a structured snapshot.",
        "Direction tag assigned by the current rule set.",
      ],
    },
  ],
  sources: [
    {
      id: DEMO_SOURCE_IDS.PBC_OPEN_MARKET,
      themeId: DEMO_THEME_IDS.PBC_OPEN_MARKET,
      themeName: "PBOC Open Market Operations",
      themeType: "financial_event",
      latestEventSignal: "liquidity_withdrawal",
      name: "PBOC Open Market Announcements",
      status: "warning",
      sourceType: "page_list",
      adapterKey: "pbc_open_market_announcements",
      isPaused: false,
      onboardingStatus: "active",
      latestRunStatus: "failed",
      latestRunAt: "2026-06-01T06:00:00Z",
      latestSuccessAt: "2026-05-31T23:00:00Z",
      latestFailureAt: "2026-06-01T06:00:00Z",
      lastErrorMessage: "Parsing failed on latest page fetch.",
    },
    {
      id: DEMO_SOURCE_IDS.PBC_OPEN_MARKET_HISTORY,
      themeId: DEMO_THEME_IDS.PBC_OPEN_MARKET,
      themeName: "PBOC Open Market Operations",
      themeType: "financial_event",
      latestEventSignal: "liquidity_withdrawal",
      name: "PBOC Open Market History",
      status: "healthy",
      sourceType: "page_list",
      adapterKey: "pbc_open_market_announcements",
      isPaused: false,
      onboardingStatus: "active",
      latestRunStatus: "completed",
      latestRunAt: "2026-06-01T06:12:00Z",
      latestSuccessAt: "2026-06-01T06:12:00Z",
      latestFailureAt: null,
      lastErrorMessage: null,
    },
  ],
};

const cpiTheme: DemoThemeFixture = {
  theme: {
    id: DEMO_THEME_IDS.STATS_CPI_RELEASES,
    name: "NBS CPI Releases",
    type: "news_announcement",
    status: "active",
    latestRunAt: "2026-06-01T08:05:00Z",
    latestEventAt: "2026-06-01T08:02:00Z",
    sourceCount: 1,
    metadata: {},
  },
  events: [
    {
      id: DEMO_EVENT_IDS.CPI_RELEASE,
      themeId: DEMO_THEME_IDS.STATS_CPI_RELEASES,
      themeName: "NBS CPI Releases",
      title: "NBS published latest CPI release",
      signal: "new_announcement",
      status: "open",
      isRead: false,
      isBookmarked: false,
      bookmarkedAt: null,
      eventType: DEFAULT_EVENT_TYPES.news_announcement,
      occurredAt: "2026-06-01T08:02:00Z",
      summary: "A new CPI release was published on the National Bureau of Statistics site.",
      infoType: "news_announcement",
      context: {
        release_topic_label: "CPI",
        publisher: "国家统计局",
        category: "macro_release",
        description: "Latest CPI bulletin and attached statistical interpretation.",
      },
      evidence: [
        "NBS release list fetched successfully.",
        "Latest CPI bulletin normalized into a release record.",
        "Announcement event emitted from the newest release item.",
      ],
    },
  ],
  sources: [
    {
      id: DEMO_SOURCE_IDS.STATS_CPI_RELEASE,
      themeId: DEMO_THEME_IDS.STATS_CPI_RELEASES,
      themeName: "NBS CPI Releases",
      themeType: "news_announcement",
      latestEventSignal: "new_announcement",
      name: "NBS CPI Release List",
      status: "healthy",
      sourceType: "page_list",
      adapterKey: "stats_data_release_list",
      isPaused: false,
      onboardingStatus: "active",
      latestRunStatus: "completed",
      latestRunAt: "2026-06-01T08:05:00Z",
      latestSuccessAt: "2026-06-01T08:05:00Z",
      latestFailureAt: null,
      lastErrorMessage: null,
    },
  ],
};

const figmaTheme: DemoThemeFixture = {
  theme: {
    id: DEMO_THEME_IDS.FIGMA_UPDATES,
    name: "Figma Product Updates",
    type: "content_update",
    status: "active",
    latestRunAt: "2026-06-01T07:30:00Z",
    latestEventAt: "2026-06-01T07:35:00Z",
    sourceCount: 1,
    metadata: {},
  },
  events: [
    {
      id: DEMO_EVENT_IDS.FIGMA_RELEASE,
      themeId: DEMO_THEME_IDS.FIGMA_UPDATES,
      themeName: "Figma Product Updates",
      title: "Figma released a new dev mode update",
      signal: "content_update",
      status: "open",
      isRead: false,
      isBookmarked: true,
      bookmarkedAt: "2026-06-01T08:30:00Z",
      eventType: DEFAULT_EVENT_TYPES.content_update,
      occurredAt: "2026-06-01T07:35:00Z",
      summary: "A new product update was detected on the Figma release notes page.",
      infoType: "content_update",
      context: {
        object_name: "Figma",
        update_type: "feature_release",
        url: "https://www.figma.com/release-notes/",
        summary: "New dev mode improvements announced in the latest release notes.",
      },
      evidence: [
        "Release notes list page fetched successfully.",
        "Latest update card normalized into content_update format.",
        "New release event emitted for latest content update.",
      ],
    },
  ],
  sources: [
    {
      id: DEMO_SOURCE_IDS.FIGMA_RELEASE_NOTES,
      themeId: DEMO_THEME_IDS.FIGMA_UPDATES,
      themeName: "Figma Product Updates",
      themeType: "content_update",
      latestEventSignal: "content_update",
      name: "Figma Release Notes",
      status: "healthy",
      sourceType: "page_list",
      adapterKey: "generic_content_update_list",
      isPaused: false,
      onboardingStatus: "active",
      latestRunStatus: "completed",
      latestRunAt: "2026-06-01T07:30:00Z",
      latestSuccessAt: "2026-06-01T07:30:00Z",
      latestFailureAt: null,
      lastErrorMessage: null,
    },
  ],
};

const eastmoneyTheme: DemoThemeFixture = {
  theme: {
    id: DEMO_THEME_IDS.EASTMONEY_MOUTAI,
    name: "贵州茅台每日价格",
    type: "price",
    status: "active",
    latestRunAt: "2026-05-31T15:00:00Z",
    latestEventAt: null,
    sourceCount: 1,
    metadata: {},
  },
  events: [],
  sources: [
    {
      id: DEMO_SOURCE_IDS.EASTMONEY_MOUTAI_KLINE,
      themeId: DEMO_THEME_IDS.EASTMONEY_MOUTAI,
      themeName: "贵州茅台每日价格",
      themeType: "price",
      latestEventSignal: null,
      name: "东方财富 K 线: 600519",
      status: "healthy",
      sourceType: "api",
      adapterKey: "eastmoney_stock_kline",
      isPaused: false,
      onboardingStatus: "active",
      latestRunStatus: "completed",
      latestRunAt: "2026-05-31T15:00:00Z",
      latestSuccessAt: "2026-05-31T15:00:00Z",
      latestFailureAt: null,
      lastErrorMessage: null,
    },
  ],
};

const pbcNewsTheme: DemoThemeFixture = {
  theme: {
    id: DEMO_THEME_IDS.PBC_NEWS,
    name: "央行新闻发布",
    type: "news_announcement",
    status: "active",
    latestRunAt: "2026-06-01T07:40:00Z",
    latestEventAt: "2026-06-01T07:38:00Z",
    sourceCount: 1,
    metadata: {},
  },
  events: [
    {
      id: DEMO_EVENT_IDS.PBC_NEWS_LATEST,
      themeId: DEMO_THEME_IDS.PBC_NEWS,
      themeName: "央行新闻发布",
      title: "PBOC published latest policy report",
      signal: "new_announcement",
      status: "open",
      isRead: false,
      isBookmarked: false,
      bookmarkedAt: null,
      eventType: DEFAULT_EVENT_TYPES.news_announcement,
      occurredAt: "2026-06-01T07:38:00Z",
      summary: "A new monetary policy report was published on the PBOC news list.",
      infoType: "news_announcement",
      context: {
        release_topic_label: "货币政策执行报告",
        publisher: "中国人民银行",
        category: "news_announcement",
        description: "Latest monetary policy report and supporting interpretation.",
      },
      evidence: [
        "PBOC news list fetched successfully.",
        "Latest report normalized into a release record.",
        "Announcement event emitted from the newest release item.",
      ],
    },
  ],
  sources: [
    {
      id: DEMO_SOURCE_IDS.PBC_NEWS_LIST,
      themeId: DEMO_THEME_IDS.PBC_NEWS,
      themeName: "央行新闻发布",
      themeType: "news_announcement",
      latestEventSignal: "new_announcement",
      name: "央行新闻发布列表",
      status: "healthy",
      sourceType: "page_list",
      adapterKey: "pbc_news_list",
      isPaused: false,
      onboardingStatus: "active",
      latestRunStatus: "completed",
      latestRunAt: "2026-06-01T07:40:00Z",
      latestSuccessAt: "2026-06-01T07:40:00Z",
      latestFailureAt: null,
      lastErrorMessage: null,
    },
  ],
};

export const mockFixtures: DemoThemeFixture[] = [surfaceTheme, pbcTheme, cpiTheme, figmaTheme, eastmoneyTheme, pbcNewsTheme];

export const mockThemes = mockFixtures.map((fixture) => fixture.theme);
export const mockEvents = mockFixtures.flatMap((fixture) => fixture.events);
export const mockSources = mockFixtures.flatMap((fixture) => fixture.sources);
export const mockEventStatusHistory: EventStatusHistory[] = [
  {
    id: DEMO_EVENT_STATUS_HISTORY_IDS.PBC_INJECTION,
    eventId: DEMO_EVENT_IDS.PBC_INJECTION,
    fromStatus: "open",
    toStatus: "tracking",
    changedAt: "2026-05-31T09:00:00Z",
  },
  {
    id: DEMO_EVENT_STATUS_HISTORY_IDS.PBC_WITHDRAWAL,
    eventId: DEMO_EVENT_IDS.PBC_WITHDRAWAL,
    fromStatus: null,
    toStatus: "open",
    changedAt: "2026-06-01T06:10:00Z",
  },
];

/**
 * Notifications use flat structure matching shared-contracts NotificationItem.
 * Previously used nested `payload` object, now unified to top-level fields.
 */
export const mockNotifications: NotificationItem[] = [
  {
    id: DEMO_NOTIFICATION_IDS.SURFACE_LOW,
    eventId: DEMO_EVENT_IDS.SURFACE_LOW,
    channel: "in_app",
    status: "pending",
    title: "30-day low detected across marketplaces",
    summary: "Detected a new 30-day low price for Surface Pro 8 16G + 512G.",
    signal: "30d_low",
    sentAt: null,
    createdAt: "2026-06-01T09:31:00Z",
  },
  {
    id: DEMO_NOTIFICATION_IDS.PBC_INJECTION,
    eventId: DEMO_EVENT_IDS.PBC_INJECTION,
    channel: "in_app",
    status: "sent",
    title: "Liquidity injection: reverse repo operation detected",
    summary: "A liquidity injection operation was detected for PBOC 7-day reverse repo. This typically indicates looser short-term monetary conditions.",
    signal: "liquidity_injection",
    sentAt: "2026-06-01T06:05:00Z",
    createdAt: "2026-06-01T06:05:00Z",
  },
  {
    id: DEMO_NOTIFICATION_IDS.PBC_WITHDRAWAL,
    eventId: DEMO_EVENT_IDS.PBC_WITHDRAWAL,
    channel: "in_app",
    status: "pending",
    title: "Liquidity withdrawal: outright repo operation detected",
    summary: "A liquidity withdrawal operation was detected for PBOC 14-day outright repo. This typically indicates tighter short-term monetary conditions.",
    signal: "liquidity_withdrawal",
    sentAt: null,
    createdAt: "2026-06-01T06:10:00Z",
  },
];

export type MockEventFeedbackRecord = {
  id: string;
  eventId: string;
  feedback: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export const mockEventFeedback: MockEventFeedbackRecord[] = [];
