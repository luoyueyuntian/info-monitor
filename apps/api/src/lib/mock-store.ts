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

type EventStatusHistory = {
  id: string;
  eventId: string;
  fromStatus: string | null;
  toStatus: string;
  changedAt: string;
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

export const mockThemes: ThemeSummary[] = [
  {
    id: "theme-surface-pro-8",
    name: "Surface Pro 8 16G + 512G Price",
    type: "price",
    status: "active",
    latestRunAt: "2026-06-01T09:30:00Z",
    latestEventAt: "2026-06-01T09:31:00Z",
    sourceCount: 2,
  },
  {
    id: "theme-macro-gdp-cpi",
    name: "Macro Releases: GDP / CPI",
    type: "financial_event",
    status: "active",
    latestRunAt: "2026-06-01T08:00:00Z",
    latestEventAt: null,
    sourceCount: 3,
  },
  {
    id: "theme-figma-updates",
    name: "Figma Product Updates",
    type: "content_update",
    status: "active",
    latestRunAt: "2026-06-01T07:30:00Z",
    latestEventAt: "2026-06-01T07:35:00Z",
    sourceCount: 1,
  },
];

export const mockEvents: EventSummary[] = [
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
  {
    id: "event-rate-cut",
    themeId: "theme-macro-gdp-cpi",
    themeName: "Macro Releases: GDP / CPI",
    title: "Potential bullish macro event recorded",
    signal: "bullish",
    status: "tracking",
    isRead: true,
    isBookmarked: false,
    bookmarkedAt: null,
    eventType: "new_release",
    occurredAt: "2026-05-31T03:00:00Z",
    summary: "A macro release was classified as a potentially bullish event.",
    infoType: "financial_event",
    context: {
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
];

export const mockEventStatusHistory: EventStatusHistory[] = [
  {
    id: "event_status_history_seed_rate_cut",
    eventId: "event-rate-cut",
    fromStatus: "open",
    toStatus: "tracking",
    changedAt: "2026-05-31T09:00:00Z",
  },
];

export const mockSources: SourceStatus[] = [
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
    id: "source-pbc-policy",
    themeId: "theme-macro-gdp-cpi",
    themeName: "Macro Releases: GDP / CPI",
    themeType: "financial_event",
    latestEventSignal: "bullish",
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
];
