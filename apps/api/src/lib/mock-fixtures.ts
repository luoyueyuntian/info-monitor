type ThemeSummary = {
  id: string;
  name: string;
  type: string;
  status: string;
  latestRunAt: string;
  latestEventAt: string | null;
  sourceCount: number;
};

type EventSummary = {
  id: string;
  themeId: string;
  themeName: string;
  title: string;
  signal: string;
  status?: string;
  isRead?: boolean;
  isBookmarked?: boolean;
  bookmarkedAt?: string | null;
  eventType?: string;
  occurredAt: string;
  summary: string;
  infoType?: string;
  context?: Record<string, unknown>;
  evidence: string[];
};

type SourceStatus = {
  id: string;
  themeId: string;
  themeName: string;
  themeType?: string;
  latestEventSignal?: string | null;
  name: string;
  status: string;
  sourceType?: string;
  adapterKey?: string;
  isPaused?: boolean;
  latestRunStatus?: string | null;
  latestRunAt?: string | null;
  latestSuccessAt: string | null;
  latestFailureAt: string | null;
  lastErrorMessage?: string | null;
};

type EventStatusHistory = {
  id: string;
  eventId: string;
  fromStatus: string | null;
  toStatus: string;
  changedAt: string;
};

type DemoThemeFixture = {
  theme: ThemeSummary;
  events: EventSummary[];
  sources: SourceStatus[];
};

const surfaceTheme: DemoThemeFixture = {
  theme: {
    id: "theme-surface-pro-8",
    name: "Surface Pro 8 16G + 512G Price",
    type: "price",
    status: "active",
    latestRunAt: "2026-06-01T09:30:00Z",
    latestEventAt: "2026-06-01T09:31:00Z",
    sourceCount: 2,
  },
  events: [
    {
      id: "event-surface-low",
      themeId: "theme-surface-pro-8",
      themeName: "Surface Pro 8 16G + 512G Price",
      title: "30-day low detected across marketplaces",
      signal: "30d_low",
      status: "open",
      isRead: false,
      isBookmarked: true,
      bookmarkedAt: "2026-06-01T10:00:00Z",
      eventType: "price_low",
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
      id: "source-xianyu-surface",
      themeId: "theme-surface-pro-8",
      themeName: "Surface Pro 8 16G + 512G Price",
      themeType: "price",
      latestEventSignal: "30d_low",
      name: "Xianyu Search Results",
      status: "healthy",
      sourceType: "page_list",
      adapterKey: "demo_price_feed",
      isPaused: false,
      latestRunStatus: "completed",
      latestRunAt: "2026-06-01T09:30:00Z",
      latestSuccessAt: "2026-06-01T09:30:00Z",
      latestFailureAt: null,
      lastErrorMessage: null,
    },
    {
      id: "source-zhuanzhuan-surface",
      themeId: "theme-surface-pro-8",
      themeName: "Surface Pro 8 16G + 512G Price",
      themeType: "price",
      latestEventSignal: "30d_low",
      name: "Zhuanzhuan Search Results",
      status: "healthy",
      sourceType: "page_list",
      adapterKey: "demo_price_feed",
      isPaused: false,
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
    id: "theme-pbc-open-market",
    name: "PBOC Open Market Operations",
    type: "financial_event",
    status: "active",
    latestRunAt: "2026-06-01T06:12:00Z",
    latestEventAt: "2026-06-01T06:10:00Z",
    sourceCount: 2,
  },
  events: [
    {
      id: "event-pbc-withdrawal",
      themeId: "theme-pbc-open-market",
      themeName: "PBOC Open Market Operations",
      title: "Liquidity withdrawal signal recorded",
      signal: "liquidity_withdrawal",
      status: "open",
      isRead: false,
      isBookmarked: false,
      bookmarkedAt: null,
      eventType: "new_release",
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
      id: "event-pbc-injection",
      themeId: "theme-pbc-open-market",
      themeName: "PBOC Open Market Operations",
      title: "Potential bullish macro event recorded",
      signal: "liquidity_injection",
      status: "tracking",
      isRead: true,
      isBookmarked: false,
      bookmarkedAt: null,
      eventType: "new_release",
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
      id: "source-pbc-policy",
      themeId: "theme-pbc-open-market",
      themeName: "PBOC Open Market Operations",
      themeType: "financial_event",
      latestEventSignal: "liquidity_withdrawal",
      name: "PBOC Policy Page",
      status: "warning",
      sourceType: "page_list",
      adapterKey: "pbc_news_list",
      isPaused: false,
      latestRunStatus: "failed",
      latestRunAt: "2026-06-01T06:00:00Z",
      latestSuccessAt: "2026-05-31T23:00:00Z",
      latestFailureAt: "2026-06-01T06:00:00Z",
      lastErrorMessage: "Parsing failed on latest page fetch.",
    },
    {
      id: "source-pbc-open-market-history",
      themeId: "theme-pbc-open-market",
      themeName: "PBOC Open Market Operations",
      themeType: "financial_event",
      latestEventSignal: "liquidity_withdrawal",
      name: "PBOC Open Market History",
      status: "healthy",
      sourceType: "page_list",
      adapterKey: "pbc_open_market_history",
      isPaused: false,
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
    id: "theme-stats-cpi-releases",
    name: "NBS CPI Releases",
    type: "news_announcement",
    status: "active",
    latestRunAt: "2026-06-01T08:05:00Z",
    latestEventAt: "2026-06-01T08:02:00Z",
    sourceCount: 1,
  },
  events: [
    {
      id: "event-cpi-release",
      themeId: "theme-stats-cpi-releases",
      themeName: "NBS CPI Releases",
      title: "NBS published latest CPI release",
      signal: "new_announcement",
      status: "open",
      isRead: false,
      isBookmarked: false,
      bookmarkedAt: null,
      eventType: "new_release",
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
      id: "source-stats-cpi-release",
      themeId: "theme-stats-cpi-releases",
      themeName: "NBS CPI Releases",
      themeType: "news_announcement",
      latestEventSignal: "new_announcement",
      name: "NBS CPI Release List",
      status: "healthy",
      sourceType: "page_list",
      adapterKey: "stats_data_release_list",
      isPaused: false,
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
    id: "theme-figma-updates",
    name: "Figma Product Updates",
    type: "content_update",
    status: "active",
    latestRunAt: "2026-06-01T07:30:00Z",
    latestEventAt: "2026-06-01T07:35:00Z",
    sourceCount: 1,
  },
  events: [
    {
      id: "event-figma-release",
      themeId: "theme-figma-updates",
      themeName: "Figma Product Updates",
      title: "Figma released a new dev mode update",
      signal: "content_update",
      status: "open",
      isRead: false,
      isBookmarked: true,
      bookmarkedAt: "2026-06-01T08:30:00Z",
      eventType: "new_release",
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
      id: "source-figma-release-notes",
      themeId: "theme-figma-updates",
      themeName: "Figma Product Updates",
      themeType: "content_update",
      latestEventSignal: "content_update",
      name: "Figma Release Notes",
      status: "healthy",
      sourceType: "page_list",
      adapterKey: "generic_content_update_list",
      isPaused: false,
      latestRunStatus: "completed",
      latestRunAt: "2026-06-01T07:30:00Z",
      latestSuccessAt: "2026-06-01T07:30:00Z",
      latestFailureAt: null,
      lastErrorMessage: null,
    },
  ],
};

export const mockFixtures: DemoThemeFixture[] = [surfaceTheme, pbcTheme, cpiTheme, figmaTheme];

export const mockThemes = mockFixtures.map((fixture) => fixture.theme);
export const mockEvents = mockFixtures.flatMap((fixture) => fixture.events);
export const mockSources = mockFixtures.flatMap((fixture) => fixture.sources);
export const mockEventStatusHistory: EventStatusHistory[] = [
  {
    id: "event_status_history_seed_pbc_injection",
    eventId: "event-pbc-injection",
    fromStatus: "open",
    toStatus: "tracking",
    changedAt: "2026-05-31T09:00:00Z",
  },
  {
    id: "event_status_history_seed_pbc_withdrawal",
    eventId: "event-pbc-withdrawal",
    fromStatus: null,
    toStatus: "open",
    changedAt: "2026-06-01T06:10:00Z",
  },
];

type NotificationFixture = {
  id: string;
  eventId: string;
  channel: string;
  status: string;
  payload: Record<string, unknown>;
  sentAt: string | null;
  createdAt: string;
};

export const mockNotifications: NotificationFixture[] = [
  {
    id: "notification-surface-low",
    eventId: "event-surface-low",
    channel: "in_app",
    status: "pending",
    payload: {
      title: "30-day low detected across marketplaces",
      summary: "Detected a new 30-day low price for Surface Pro 8 16G + 512G.",
      signal: "30d_low",
    },
    sentAt: null,
    createdAt: "2026-06-01T09:31:00Z",
  },
  {
    id: "notification-pbc-injection",
    eventId: "event-pbc-injection",
    channel: "in_app",
    status: "sent",
    payload: {
      title: "Bullish signal: reverse repo liquidity injection detected",
      summary: "A liquidity injection operation was detected for PBOC 7-day reverse repo. This typically indicates looser short-term monetary conditions.",
      signal: "bullish",
    },
    sentAt: "2026-06-01T06:05:00Z",
    createdAt: "2026-06-01T06:05:00Z",
  },
  {
    id: "notification-pbc-withdrawal",
    eventId: "event-pbc-withdrawal",
    channel: "in_app",
    status: "pending",
    payload: {
      title: "Bearish signal: outright repo liquidity withdrawal detected",
      summary: "A liquidity withdrawal operation was detected for PBOC 14-day outright repo. This typically indicates tighter short-term monetary conditions.",
      signal: "bearish",
    },
    sentAt: null,
    createdAt: "2026-06-01T06:10:00Z",
  },
];
