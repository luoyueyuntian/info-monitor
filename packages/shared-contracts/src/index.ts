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
  | "liquidity_withdrawal";

// ─── Event Status ─────────────────────────────────────────────────────────────

/** Lifecycle status of an event in the workbench. */
export type EventStatus = "open" | "tracking" | "ignored" | "resolved";

// ─── Source Status ─────────────────────────────────────────────────────────────

/** Health status of a data source. */
export type SourceHealth = "healthy" | "warning" | "paused";

/** Run status of a source execution. */
export type RunStatus = "pending" | "running" | "completed" | "failed";

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

export type ThemeAnalysis = {
  tone: ImpactTone;
  headline: string;
  summary: string;
  keyPoints: string[];
  risks: string[];
  actions: string[];
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
  timeline: ThemeTimelineEntry[];
  records: ThemeRecord[];
  analysis: ThemeAnalysis;
};

// ─── Source Detail ────────────────────────────────────────────────────────────

export type SourceDetailRun = {
  id: string;
  status: string;
  triggerType: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  errorMessage?: string | null;
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
