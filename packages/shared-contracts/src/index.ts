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
  | "neutral";

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
  status?: EventStatus | null;
  isRead?: boolean;
  isBookmarked?: boolean;
  bookmarkedAt?: string | null;
  latestStatusChangedAt?: string | null;
  eventType?: string;
  occurredAt: string;
  summary: string;
  infoType?: InfoType | null;
  context?: Record<string, unknown> | null;
};

export type EventDetail = EventSummary & {
  sourceName?: string | null;
  evidence: string[];
  explanation: EventExplanation;
  statusHistory?: EventStatusHistoryEntry[];
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
  fromStatus?: EventStatus | null;
  toStatus: EventStatus;
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
