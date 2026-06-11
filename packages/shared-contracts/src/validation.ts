/**
 * Runtime validation schemas for shared contracts.
 *
 * These validators ensure that data matches the expected TypeScript types
 * at runtime, preventing shape drift between frontend and backend.
 */

import type {
  EventDetail,
  EventSignal,
  EventStatus,
  EventSummary,
  InboxSectionId,
  NotificationChannel,
  NotificationItem,
  NotificationLevel,
  NotificationStatus,
  RunStatus,
  SourceHealth,
  SourceStatus,
  ThemeSummary,
} from "./index.js";

// ─── Validation Helpers ──────────────────────────────────────────────────────

type Validator<T> = (value: unknown) => value is T;

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isNull(value: unknown): value is null {
  return value === null;
}

function isUndefined(value: unknown): value is undefined {
  return value === undefined;
}

function isNullOrUndefined(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

function isOneOf<T extends string>(...values: T[]): Validator<T> {
  return (value: unknown): value is T => values.includes(value as T);
}

function isOptional<T>(validator: Validator<T>): Validator<T | undefined> {
  return (value: unknown): value is T | undefined =>
    isUndefined(value) || validator(value);
}

function isNullable<T>(validator: Validator<T>): Validator<T | null> {
  return (value: unknown): value is T | null =>
    isNull(value) || validator(value);
}

function isOptionalNullable<T>(validator: Validator<T>): Validator<T | null | undefined> {
  return (value: unknown): value is T | null | undefined =>
    isNullOrUndefined(value) || validator(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isArrayOf<T>(validator: Validator<T>): Validator<T[]> {
  return (value: unknown): value is T[] =>
    isArray(value) && value.every(validator);
}

// ─── Type Validators ─────────────────────────────────────────────────────────

export const isEventSignal: Validator<EventSignal> = isOneOf(
  "30d_low",
  "bullish",
  "bearish",
  "new_announcement",
  "content_update",
  "new_financial_event",
  "neutral",
  "liquidity_injection",
  "liquidity_withdrawal",
);

export const isEventStatus: Validator<EventStatus> = isOneOf(
  "open",
  "tracking",
  "ignored",
  "resolved",
);

export const isSourceHealth: Validator<SourceHealth> = isOneOf(
  "healthy",
  "warning",
  "paused",
);

export const isRunStatus: Validator<RunStatus> = isOneOf(
  "pending",
  "running",
  "completed",
  "failed",
);

export const isNotificationChannel: Validator<NotificationChannel> = isOneOf(
  "in_app",
  "email",
  "webhook",
  "telegram",
);

export const isNotificationStatus: Validator<NotificationStatus> = isOneOf(
  "pending",
  "sent",
  "failed",
);

export const isNotificationLevel: Validator<NotificationLevel> = isOneOf(
  "high",
  "medium",
  "low",
);

export const isInboxSectionId: Validator<InboxSectionId> = isOneOf(
  "price-signals",
  "content-updates",
  "official-releases",
  "financial-events",
);

// ─── Domain Object Validators ────────────────────────────────────────────────

export function isThemeSummary(value: unknown): value is ThemeSummary {
  if (!isRecord(value)) return false;

  return (
    isString(value.id) &&
    isString(value.name) &&
    isString(value.type) &&
    isString(value.status) &&
    isOptionalNullable(isString)(value.latestRunAt) &&
    isOptionalNullable(isString)(value.latestEventAt) &&
    isNumber(value.sourceCount)
  );
}

export function isEventSummary(value: unknown): value is EventSummary {
  if (!isRecord(value)) return false;

  return (
    isString(value.id) &&
    isString(value.themeId) &&
    isString(value.themeName) &&
    isString(value.title) &&
    isString(value.signal) &&
    isOptionalNullable(isString)(value.status) &&
    isOptional(isBoolean)(value.isRead) &&
    isOptional(isBoolean)(value.isBookmarked) &&
    isOptionalNullable(isString)(value.bookmarkedAt) &&
    isOptionalNullable(isString)(value.latestStatusChangedAt) &&
    isOptional(isString)(value.eventType) &&
    isString(value.occurredAt) &&
    isString(value.summary) &&
    isOptionalNullable(isString)(value.infoType) &&
    isOptionalNullable(isRecord)(value.context)
  );
}

export function isEventDetail(value: unknown): value is EventDetail {
  if (!isEventSummary(value)) return false;

  const record = value as Record<string, unknown>;

  return (
    isOptionalNullable(isString)(record.sourceName) &&
    isArrayOf(isString)(record.evidence) &&
    isRecord(record.explanation) &&
    isString(record.explanation.headline) &&
    isString(record.explanation.impact) &&
    isArrayOf(isString)(record.explanation.whyItMatters) &&
    isArrayOf(isString)(record.explanation.actions) &&
    isOptional(isArrayOf(isRecord))(record.statusHistory)
  );
}

export function isSourceStatus(value: unknown): value is SourceStatus {
  if (!isRecord(value)) return false;

  return (
    isString(value.id) &&
    isString(value.themeId) &&
    isString(value.themeName) &&
    isOptional(isString)(value.themeType) &&
    isOptionalNullable(isString)(value.latestEventSignal) &&
    isString(value.name) &&
    isString(value.status) &&
    isOptional(isString)(value.sourceType) &&
    isOptional(isString)(value.adapterKey) &&
    isOptional(isBoolean)(value.isPaused) &&
    isOptionalNullable(isString)(value.latestRunStatus) &&
    isOptionalNullable(isString)(value.latestRunAt) &&
    isNullable(isString)(value.latestSuccessAt) &&
    isNullable(isString)(value.latestFailureAt) &&
    isOptionalNullable(isString)(value.lastErrorMessage)
  );
}

export function isNotificationItem(value: unknown): value is NotificationItem {
  if (!isRecord(value)) return false;

  return (
    isString(value.id) &&
    isString(value.eventId) &&
    isString(value.channel) &&
    isString(value.status) &&
    isString(value.title) &&
    isString(value.summary) &&
    isString(value.signal) &&
    isNullable(isString)(value.sentAt) &&
    isString(value.createdAt)
  );
}

// ─── Validation Error Handling ───────────────────────────────────────────────

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly path: string[],
    public readonly expected: string,
    public readonly received: unknown,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export function validateOrThrow<T>(
  value: unknown,
  validator: Validator<T>,
  name: string,
): T {
  if (validator(value)) {
    return value;
  }

  throw new ValidationError(
    `Invalid ${name}: expected valid ${name} object`,
    [name],
    name,
    value,
  );
}

// ─── Safe Validation ─────────────────────────────────────────────────────────

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export function validate<T>(
  value: unknown,
  validator: Validator<T>,
  name: string,
): ValidationResult<T> {
  if (validator(value)) {
    return { success: true, data: value };
  }

  return {
    success: false,
    error: `Invalid ${name}: shape does not match expected type`,
  };
}
