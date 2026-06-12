/**
 * Notification theme and template system.
 *
 * Provides unified styling and templates for notifications
 * based on signal type and priority level.
 */

import type { EventSignal, NotificationLevel } from "./index.js";

// ─── Color System ────────────────────────────────────────────────────────────

export type SignalColorScheme = {
  background: string;
  text: string;
  border: string;
  dot: string;
};

export type SignalColors = {
  [K in EventSignal | string]: SignalColorScheme;
};

/**
 * Unified color scheme for different signal types.
 */
export const SIGNAL_COLORS: SignalColors = {
  // Price signals
  "30d_low": {
    background: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },

  // Bullish signals
  bullish: {
    background: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  liquidity_injection: {
    background: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },

  // Bearish signals
  bearish: {
    background: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    dot: "bg-rose-500",
  },
  liquidity_withdrawal: {
    background: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    dot: "bg-rose-500",
  },

  // Announcement signals
  new_announcement: {
    background: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    dot: "bg-blue-500",
  },

  // Content update signals
  content_update: {
    background: "bg-violet-50",
    text: "text-violet-700",
    border: "border-violet-200",
    dot: "bg-violet-500",
  },
  new_financial_event: {
    background: "bg-violet-50",
    text: "text-violet-700",
    border: "border-violet-200",
    dot: "bg-violet-500",
  },

  // Neutral signals
  neutral: {
    background: "bg-slate-50",
    text: "text-slate-600",
    border: "border-slate-200",
    dot: "bg-slate-400",
  },
};

/**
 * Get color scheme for a signal, falling back to neutral.
 */
export function getSignalColors(signal: string): SignalColorScheme {
  return SIGNAL_COLORS[signal] || SIGNAL_COLORS.neutral;
}

// ─── Priority System ─────────────────────────────────────────────────────────

export type SignalPriority = {
  level: NotificationLevel;
  weight: number;
  emoji: string;
};

export type SignalPriorities = {
  [K in EventSignal | string]: SignalPriority;
};

/**
 * Priority configuration for different signal types.
 */
export const SIGNAL_PRIORITIES: SignalPriorities = {
  // High priority
  "30d_low": { level: "high", weight: 10, emoji: "📉" },
  bullish: { level: "high", weight: 9, emoji: "🟢" },
  bearish: { level: "high", weight: 9, emoji: "🔴" },
  liquidity_injection: { level: "high", weight: 8, emoji: "💰" },
  liquidity_withdrawal: { level: "high", weight: 8, emoji: "💸" },

  // Medium priority
  new_announcement: { level: "medium", weight: 5, emoji: "📢" },
  new_financial_event: { level: "medium", weight: 5, emoji: "📊" },

  // Low priority
  content_update: { level: "low", weight: 2, emoji: "📝" },
  neutral: { level: "low", weight: 1, emoji: "⚪" },
};

/** Fallback for unknown signals (distinct from explicit neutral). */
const UNKNOWN_SIGNAL_PRIORITY: SignalPriority = {
  level: "low",
  weight: 0,
  emoji: "ℹ️",
};

/**
 * Get priority for a signal, falling back to unknown signal priority.
 */
export function getSignalPriority(signal: string): SignalPriority {
  return SIGNAL_PRIORITIES[signal] || UNKNOWN_SIGNAL_PRIORITY;
}

/**
 * Check if a signal should trigger a notification based on level filter.
 */
export function shouldNotify(
  signal: string,
  minLevel: NotificationLevel = "low",
): boolean {
  const priority = getSignalPriority(signal);
  const levelWeight: Record<NotificationLevel, number> = {
    high: 3,
    medium: 2,
    low: 1,
  };
  return levelWeight[priority.level] >= levelWeight[minLevel];
}

// ─── Signal Labels ───────────────────────────────────────────────────────────

export type SignalLabels = {
  [K in EventSignal | string]: string;
};

/**
 * Human-readable labels for signal types.
 */
export const SIGNAL_LABELS: SignalLabels = {
  "30d_low": "价格新低",
  bullish: "利好信号",
  bearish: "利空信号",
  liquidity_injection: "流动性投放",
  liquidity_withdrawal: "流动性回笼",
  new_announcement: "新公告",
  content_update: "内容更新",
  new_financial_event: "金融事件",
  neutral: "中性",
};

/**
 * Get label for a signal, falling back to the signal string itself.
 */
export function getSignalLabel(signal: string): string {
  return SIGNAL_LABELS[signal] || signal;
}

// ─── Notification Templates ──────────────────────────────────────────────────

export type NotificationTemplate = {
  title: string;
  summary: string;
};

export type TemplateVariables = {
  [key: string]: string | number | undefined;
};

/**
 * Render a template string with variables.
 * Variables are specified as {{variableName}} in the template.
 */
function renderTemplate(template: string, variables: TemplateVariables): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = variables[key];
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Default notification templates for different signal types.
 */
export const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  "30d_low": {
    title: "30天新低: {{spec}}",
    summary: "检测到 {{spec}} 价格降至 {{price}}，低于近30天最低价 {{previousPrice}}。",
  },
  bullish: {
    title: "利好信号: {{title}}",
    summary: "{{summary}}",
  },
  bearish: {
    title: "利空信号: {{title}}",
    summary: "{{summary}}",
  },
  liquidity_injection: {
    title: "流动性投放: {{operationType}}",
    summary: "检测到 {{operationType}} 操作，金额 {{amount}} 亿元，期限 {{termDays}} 天。",
  },
  liquidity_withdrawal: {
    title: "流动性回笼: {{operationType}}",
    summary: "检测到 {{operationType}} 操作，净回笼流动性。",
  },
  new_announcement: {
    title: "新公告: {{title}}",
    summary: "{{publisher}} 发布了新公告。",
  },
  content_update: {
    title: "内容更新: {{objectName}}",
    summary: "{{objectName}} 发布了 {{updateType}} 类型的更新。",
  },
};

/**
 * Render a notification using a template.
 */
export function renderNotification(
  signal: string,
  variables: TemplateVariables,
): NotificationTemplate {
  const template = NOTIFICATION_TEMPLATES[signal];

  if (!template) {
    return {
      title: String(variables.title || "新通知"),
      summary: String(variables.summary || ""),
    };
  }

  return {
    title: renderTemplate(template.title, variables),
    summary: renderTemplate(template.summary, variables),
  };
}

// ─── Status Colors ───────────────────────────────────────────────────────────

export type StatusColorScheme = {
  background: string;
  text: string;
};

export const NOTIFICATION_STATUS_COLORS: Record<string, StatusColorScheme> = {
  pending: {
    background: "bg-amber-50",
    text: "text-amber-700",
  },
  sent: {
    background: "bg-slate-100",
    text: "text-slate-500",
  },
  failed: {
    background: "bg-rose-50",
    text: "text-rose-700",
  },
};

export const EVENT_STATUS_COLORS: Record<string, StatusColorScheme> = {
  open: {
    background: "bg-blue-50",
    text: "text-blue-700",
  },
  tracking: {
    background: "bg-amber-50",
    text: "text-amber-700",
  },
  ignored: {
    background: "bg-slate-100",
    text: "text-slate-500",
  },
  resolved: {
    background: "bg-emerald-50",
    text: "text-emerald-700",
  },
};

/**
 * Get colors for notification status.
 */
export function getNotificationStatusColors(status: string): StatusColorScheme {
  return NOTIFICATION_STATUS_COLORS[status] || NOTIFICATION_STATUS_COLORS.pending;
}

/**
 * Get colors for event status.
 */
export function getEventStatusColors(status: string): StatusColorScheme {
  return EVENT_STATUS_COLORS[status] || EVENT_STATUS_COLORS.open;
}
