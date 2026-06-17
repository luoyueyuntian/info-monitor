/**
 * @info-monitor/shared-contracts
 *
 * Shared type definitions between the Vue frontend, Node API, and Python services.
 * These types define the core domain model and API contracts.
 */

// ─── Info Types ───────────────────────────────────────────────────────────────

/** The four supported information types for normalization. */
export type InfoType = "price" | "content_update" | "news_announcement" | "financial_event";

// ─── Event Signals ────────────────────────────────────────────────────────────

/** Recognized event signal types emitted by the worker. */
export type EventSignal =
  | "30d_low"
  | "bullish"
  | "bearish"
  | "new_announcement"
  | "content_update"
  | "new_financial_event"
  | "neutral"
  | "liquidity_injection"
  | "liquidity_withdrawal"
  | "overbought"
  | "oversold"
  | "golden_cross"
  | "death_cross"
  | "bullish_alignment"
  | "bearish_alignment";

// ─── Event Status ─────────────────────────────────────────────────────────────

/** Lifecycle status of an event in the workbench. */
export type EventStatus = "open" | "tracking" | "ignored" | "resolved";

// ─── Source Status ─────────────────────────────────────────────────────────────

/** Health status of a data source. */
export type SourceHealth = "healthy" | "warning" | "paused";

/** Run status of a source execution. */
export type RunStatus = "pending" | "running" | "completed" | "failed";

/** Onboarding status of a source — tracks setup lifecycle. */
export type SourceOnboardingStatus = "draft" | "ready_to_test" | "active";

// ─── Notification ─────────────────────────────────────────────────────────────

/** Notification delivery channel. */
export type NotificationChannel = "in_app" | "email" | "webhook" | "telegram";

/** Notification delivery status. */
export type NotificationStatus = "pending" | "sent" | "failed";

// ─── Impact ───────────────────────────────────────────────────────────────────

/** Impact tone for events and themes. */
export type ImpactTone = "positive" | "negative" | "neutral";

// ─── Theme ────────────────────────────────────────────────────────────────────

export type ThemeSummary = {
  id: string;
  name: string;
  type: string;
  status: string;
  latestRunAt: string | null;
  latestEventAt: string | null;
  sourceCount: number;
  latestSuccessAt?: string | null;
  latestFailureAt?: string | null;
  sourceHealth?: SourceHealth | string;
  latestEventTitle?: string | null;
  latestEventSignal?: EventSignal | null;
  latestInsight?: string | null;
  latestBookmarkedAt?: string | null;
  reviewStatus?: string | null;
  reviewTags?: string[];
  nextReviewDate?: string | null;
  openEventCount?: number;
  trackingEventCount?: number;
  ignoredEventCount?: number;
  unreadEventCount?: number;
  bookmarkedEventCount?: number;
};

// ─── Event ────────────────────────────────────────────────────────────────────

export type EventSummary = {
  id: string;
  themeId: string;
  themeName: string;
  title: string;
  signal: EventSignal | string;
  status?: EventStatus | string | null;
  isRead?: boolean;
  isBookmarked?: boolean;
  bookmarkedAt?: string | null;
  latestStatusChangedAt?: string | null;
  eventType?: string;
  occurredAt: string;
  summary: string;
  infoType?: InfoType | string | null;
  context?: Record<string, unknown> | null;
};

export type TriggerReason = {
  ruleKey: string;
  ruleName: string;
  evidence: string[];
  changeDetails?: Record<string, unknown>;
  originalRecord?: Record<string, unknown>;
};

export type EventDetail = EventSummary & {
  sourceName?: string | null;
  evidence: string[];
  explanation: EventExplanation;
  statusHistory?: EventStatusHistoryEntry[];
  triggerReason?: TriggerReason;
};

export type EventExplanation = {
  headline: string;
  impact: string;
  whyItMatters: string[];
  actions: string[];
};

export type EventStatusHistoryEntry = {
  id: string;
  eventId: string;
  fromStatus?: EventStatus | string | null;
  toStatus: EventStatus | string;
  changedAt: string;
};

// ─── Source ────────────────────────────────────────────────────────────────────

export type SourceStatus = {
  id: string;
  themeId: string;
  themeName: string;
  themeType?: string;
  latestEventSignal?: EventSignal | null;
  name: string;
  status: SourceHealth | string;
  sourceType?: string;
  adapterKey?: string;
  isPaused?: boolean;
  onboardingStatus?: SourceOnboardingStatus;
  latestRunStatus?: RunStatus | null;
  latestRunAt?: string | null;
  latestSuccessAt: string | null;
  latestFailureAt: string | null;
  lastErrorMessage?: string | null;
};

// ─── Notification ─────────────────────────────────────────────────────────────

export type NotificationItem = {
  id: string;
  eventId: string;
  channel: NotificationChannel | string;
  status: NotificationStatus | string;
  title: string;
  summary: string;
  signal: EventSignal | string;
  sentAt: string | null;
  createdAt: string;
};

// ─── Inbox Sections ───────────────────────────────────────────────────────────

export const INBOX_SECTION_IDS = [
  "price-signals",
  "content-updates",
  "official-releases",
  "financial-events",
] as const;

export type InboxSectionId = (typeof INBOX_SECTION_IDS)[number];

// ─── Dashboard ────────────────────────────────────────────────────────────────

export type DashboardSummary = {
  activeThemes: number;
  openEvents: number;
  trackingEvents: number;
  unreadEvents: number;
  bookmarkedEvents: number;
  recentEvents: number;
  warningSources: number;
  pendingSources: number;
};

export type InboxSectionCounts = Record<
  InboxSectionId,
  { total: number; recent: number }
>;

// ─── Technical Indicators ─────────────────────────────────────────────────────

export type MACDIndicator = {
  dif?: number | null;
  dea?: number | null;
  hist?: number | null;
  signal?: string | null;
};

export type KDJIndicator = {
  k?: number | null;
  d?: number | null;
  j?: number | null;
  signal?: string | null;
};

export type BOLLIndicator = {
  upper?: number | null;
  middle?: number | null;
  lower?: number | null;
  position?: string | null;
  currentPrice?: number | null;
};

export type MAIndicator = {
  ma5?: number | null;
  ma10?: number | null;
  ma20?: number | null;
  ma60?: number | null;
  trend?: string | null;
};

export type TechnicalIndicators = {
  rsi14?: number | null;
  macd?: MACDIndicator | null;
  kdj?: KDJIndicator | null;
  boll?: BOLLIndicator | null;
  ma?: MAIndicator | null;
};

// ─── Theme Detail ─────────────────────────────────────────────────────────────

export type ThemeRecord = {
  id: string;
  sourceId?: string | null;
  sourceName?: string | null;
  title: string;
  occurredAt: string;
  infoType: string;
  content: Record<string, unknown>;
};

export type ThemeStance = "bullish" | "bearish" | "watch" | "neutral";

export type ThemeAnalysis = {
  tone: ImpactTone;
  stance: ThemeStance;
  headline: string;
  summary: string;
  keyPoints: string[];
  risks: string[];
  actions: string[];
  signalAccumulation: {
    bullish: number;
    bearish: number;
    neutral: number;
    recentBullish: number;
    recentBearish: number;
  };
  supportingSources: string[];
  conflictingSources: string[];
  recentChange: {
    headline: string;
    summary: string;
    highlights: string[];
  };
  trend: {
    headline: string;
    summary: string;
    highlights: string[];
  };
  // Task 7: Multi-event accumulation
  recentStreak?: {
    direction: "bullish" | "bearish" | "mixed" | "none";
    count: number;
  };
  hasConflictingSignals?: boolean;
  // Task 8: Price-specific judgment
  priceJudgment?: {
    level: "worth_buying" | "worth_waiting" | "worth_attention" | "watching";
    label: string;
    trustHint: string | null;
    reason?: string;
    trustScore?: number | null;
    riskLevel?: "likely_valid" | "suspicious" | "high_risk" | null;
  };
};

export type ThemeTimelineEntry = {
  id: string;
  kind: "run" | "change" | "event" | string;
  at: string;
  title: string;
  summary: string;
  meta?: Record<string, unknown>;
};

export type ThemeBreakdown = {
  title: string;
  description: string;
  items: Array<{ label: string; count: number }>;
};

export type ThemeMarketOverviewIndex = {
  code: string;
  label: string;
  latest: number | null;
  changePercent: number | null;
};

export type ThemeMarketSectorFlow = {
  code: string;
  label: string;
  changePercent: number | null;
  netInflowBillion: number | null;
  leadingStockName: string | null;
  leadingStockCode: string | null;
};

export type ThemeMarketMover = {
  code: string;
  label: string;
  latest: number | null;
  changePercent: number | null;
  turnoverBillion: number | null;
  reasons?: string[];
};

export type ThemeMarketOverviewSnapshot = {
  market: "a_share" | "hk";
  marketLabel: string;
  occurredAt: string;
  tone: ImpactTone;
  directionLabel: string;
  headline: string;
  summary: string;
  benchmarkName: string | null;
  benchmarkChangePercent: number | null;
  fundFlowDirection: "inflow" | "outflow" | "flat";
  fundFlowNetBillion: number | null;
  fundFlowTurnoverBillion: number | null;
  fundFlowCurrency: string | null;
  indices: ThemeMarketOverviewIndex[];
  sectorFlows?: ThemeMarketSectorFlow[];
  topMovers?: ThemeMarketMover[];
  topDecliners?: ThemeMarketMover[];
  highlights: string[];
};

export type ThemeMarketOverview = {
  headline: string;
  summary: string;
  crossMarketHighlights: string[];
  snapshots: ThemeMarketOverviewSnapshot[];
};

export type ThemeDetail = {
  theme: {
    id: string;
    name: string;
    type: string;
    infoType?: string;
    description?: string;
    status: string;
    createdAt?: string;
    latestInsight?: string | null;
  };
  sources: Array<{
    id: string;
    name: string;
    status: string;
    sourceType?: string;
    adapterKey?: string;
    config?: Record<string, unknown>;
    isPaused?: boolean;
    latestSuccessAt: string | null;
    latestFailureAt: string | null;
    latestRunStatus?: string | null;
    latestRunAt?: string | null;
  }>;
  events: Array<{
    id: string;
    title: string;
    signal: string;
    status?: string | null;
    isRead?: boolean;
    isBookmarked?: boolean;
    occurredAt: string;
    summary: string;
  }>;
  history: Array<{ at: string; label: string }>;
  breakdown: ThemeBreakdown | null;
  marketOverview?: ThemeMarketOverview | null;
  timeline: ThemeTimelineEntry[];
  records: ThemeRecord[];
  analysis: ThemeAnalysis;
};

// ─── Source Detail ────────────────────────────────────────────────────────────

export type SourceDetailRun = {
  id: string;
  status: string;
  triggerType: string;
  configVersion?: number | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  errorMessage?: string | null;
  snapshotCount?: number;
  recordCount?: number;
  changeCount?: number;
  eventCount?: number;
};

export type SourceDetailEvent = {
  id: string;
  title: string;
  signal: string;
  status?: string | null;
  isRead?: boolean;
  isBookmarked?: boolean;
  occurredAt: string;
  summary: string;
};

export type SourceDetailRecord = {
  id: string;
  title: string;
  occurredAt: string;
  infoType: string;
  content: Record<string, unknown>;
};

export type SourceDetailChange = {
  id: string;
  changeType: string;
  summary: string;
  detectedAt: string;
  details?: Record<string, unknown>;
};

export type SourceDetailSnapshot = {
  id: string;
  sourceRunId: string;
  fetchedAt: string | null;
  storagePath?: string | null;
  payloadPreview: string;
  triggerType?: string;
};

export type SourceAnalysis = {
  tone: "healthy" | "pending" | "warning";
  toneLabel: string;
  headline: string;
  summary: string;
  keyPoints: string[];
  risks: string[];
  actions: string[];
};

export type SourceDetail = {
  source: SourceStatus & {
    config?: Record<string, unknown>;
  };
  runs: SourceDetailRun[];
  events: SourceDetailEvent[];
  records: SourceDetailRecord[];
  changes: SourceDetailChange[];
  snapshots: SourceDetailSnapshot[];
  analysis: SourceAnalysis;
};

// ─── Theme Summary Insight ────────────────────────────────────────────────────

export type ThemeSummaryInsight = {
  headline: string;
  summary: string;
};

// ─── Notification Preferences ─────────────────────────────────────────────────

export type NotificationPreference = {
  id: string;
  userId: string;
  themeId?: string | null;
  sourceId?: string | null;
  signal?: string | null;
  channel: NotificationChannel | string;
  isEnabled: boolean;
  isMuted: boolean;
  priorityOnly: boolean;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  maxPerHour?: number | null;
  createdAt: string;
  updatedAt: string;
};

export type NotificationPreferenceInput = {
  themeId?: string | null;
  sourceId?: string | null;
  signal?: string | null;
  channel?: NotificationChannel | string;
  isEnabled?: boolean;
  isMuted?: boolean;
  priorityOnly?: boolean;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  maxPerHour?: number | null;
};

// ─── Rule Configuration ───────────────────────────────────────────────────────

export type NotificationLevel = "high" | "medium" | "low";

export type PriceRuleConfig = {
  thresholdPercent?: number;
  dedupWindowDays?: number;
  onlyLatest?: boolean;
  notificationLevel?: NotificationLevel;
  minPriceChange?: number;
};

export type FinancialDirectionRuleConfig = {
  classifyNeutral?: boolean;
  notificationLevel?: NotificationLevel;
  bullishSignals?: string[];
  bearishSignals?: string[];
};

export type ContentUpdateRuleConfig = {
  notificationLevel?: NotificationLevel;
  ignoreTypes?: string[];
  requireKeyword?: string | null;
};

export type NewsAnnouncementRuleConfig = {
  notificationLevel?: NotificationLevel;
  keywords?: string[];
  ignorePublishers?: string[];
};

export type RuleConfig = PriceRuleConfig | FinancialDirectionRuleConfig | ContentUpdateRuleConfig | NewsAnnouncementRuleConfig;

export type RuleConfiguration = {
  id: string;
  ruleKey: string;
  themeId?: string | null;
  config: RuleConfig;
  isEnabled: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
};

export type RuleConfigurationInput = {
  ruleKey: string;
  themeId?: string | null;
  config?: RuleConfig;
  isEnabled?: boolean;
  priority?: number;
};

// Re-export validation utilities
export {
  isThemeSummary,
  isEventSummary,
  isEventDetail,
  isSourceStatus,
  isNotificationItem,
  isEventSignal,
  isEventStatus,
  isSourceHealth,
  isRunStatus,
  isSourceOnboardingStatus,
  isNotificationChannel,
  isNotificationStatus,
  isNotificationLevel,
  isInboxSectionId,
  validate,
  validateOrThrow,
  ValidationError,
} from "./validation.js";

export type { ValidationResult } from "./validation.js";

// Re-export notification theme utilities
export {
  SIGNAL_COLORS,
  SIGNAL_PRIORITIES,
  SIGNAL_LABELS,
  NOTIFICATION_TEMPLATES,
  NOTIFICATION_STATUS_COLORS,
  EVENT_STATUS_COLORS,
  getSignalColors,
  getSignalPriority,
  getSignalLabel,
  shouldNotify,
  renderNotification,
  getNotificationStatusColors,
  getEventStatusColors,
} from "./notification-theme.js";

export type {
  SignalColorScheme,
  SignalPriority,
  NotificationTemplate,
  TemplateVariables,
  StatusColorScheme,
} from "./notification-theme.js";

// Re-export demo scene definitions
export {
  DEMO_THEME_IDS,
  DEMO_SOURCE_IDS,
  DEMO_EVENT_IDS,
  DEMO_RUN_IDS,
  DEMO_SNAPSHOT_IDS,
  DEMO_RECORD_IDS,
  DEMO_CHANGE_IDS,
  DEMO_NOTIFICATION_IDS,
  DEMO_EVENT_STATUS_HISTORY_IDS,
  DEMO_THEMES,
  DEMO_SOURCES,
  DEFAULT_EVENT_TYPES,
} from "./demo-scene-definitions.js";

export type {
  DemoThemeDefinition,
  DemoSourceDefinition,
} from "./demo-scene-definitions.js";

// ─── Feedback Aggregation ───────────────────────────────────────────────────

export type FeedbackAggregationItem = {
  key: string;
  label: string;
  useful: number;
  noise: number;
  watch: number;
  total: number;
};

export type FeedbackAggregation = {
  bySignal: FeedbackAggregationItem[];
  byEventType: FeedbackAggregationItem[];
  byTheme: FeedbackAggregationItem[];
  totalFeedback: number;
  recentFeedback: number;
};

// ─── Daily Summary ──────────────────────────────────────────────────────────

export type DailySummaryItem = {
  category: string;
  label: string;
  count: number;
  recentCount: number;
  latestEvent: {
    id: string;
    title: string;
    signal: string;
    occurredAt: string;
    themeId: string;
    themeName: string;
  } | null;
  directionBreakdown?: {
    bullish: number;
    bearish: number;
    neutral: number;
    recentBullish: number;
    recentBearish: number;
    recentNeutral: number;
  };
};

export type DailySummary = {
  generatedAt: string;
  date: string;
  items: DailySummaryItem[];
  warningSources: Array<{
    id: string;
    name: string;
    themeName: string;
    status: string;
    lastErrorMessage: string | null;
  }>;
  totalEvents: number;
  recentEvents: number;
};

export type StockMarketCloseReport = {
  date: string;
  headline: string;
  summary: string;
  keySignals: string[];
  timeline: Array<{
    at: string;
    title: string;
    summary: string;
    kind: "market_close" | "primary_catalyst" | "secondary_catalyst" | "mover";
    targetThemeId?: string | null;
  }>;
  catalystSummary: {
    primary: Array<{ title: string; summary: string; targetThemeId?: string | null }>;
    secondary: Array<{ title: string; summary: string; targetThemeId?: string | null }>;
    background: Array<{ title: string; summary: string; targetThemeId?: string | null }>;
  };
  sectorFocus: string[];
  moverFocus: string[];
  announcementFocus: Array<{
    level: "high" | "medium" | "low";
    title: string;
    summary: string;
    targetThemeId?: string | null;
  }>;
  sourceClues: Array<{
    level: "high" | "medium" | "low";
    title: string;
    summary: string;
    targetThemeId?: string | null;
  }>;
  moverCards: Array<{
    market: "a_share" | "hk";
    direction: "up" | "down";
    label: string;
    code: string;
    changeText: string;
    reasons: string[];
    announcementClues: Array<{
      level: "high" | "medium" | "low";
      title: string;
      targetThemeId?: string | null;
    }>;
    sourceClues: Array<{
      level: "high" | "medium" | "low";
      title: string;
      summary: string;
      targetThemeId?: string | null;
    }>;
  }>;
  actionItems: string[];
};

export type StockMarketCloseReportSnapshot = {
  id: string;
  workspaceId: string;
  date: string;
  report: StockMarketCloseReport;
  createdAt: string;
};
