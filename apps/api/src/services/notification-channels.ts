/**
 * External notification channels.
 *
 * This module implements the actual sending logic for external
 * notification channels like Webhook and Telegram.
 */

import type { NotificationChannel } from "@info-monitor/shared-contracts";

export interface NotificationPayload {
  id: string;
  eventId: string;
  channel: NotificationChannel;
  title: string;
  summary: string;
  signal: string;
  metadata?: Record<string, unknown>;
}

export interface ChannelConfig {
  webhook?: {
    url: string;
    headers?: Record<string, string>;
  };
  telegram?: {
    botToken: string;
    chatId: string;
  };
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ─── Channel Implementations ─────────────────────────────────────────────────

const REQUEST_TIMEOUT_MS = 10_000; // 10 seconds

async function sendWebhook(
  payload: NotificationPayload,
  config: ChannelConfig["webhook"],
): Promise<SendResult> {
  if (!config?.url) {
    return { success: false, error: "Webhook URL not configured" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...config.headers,
      },
      body: JSON.stringify({
        id: payload.id,
        event_id: payload.eventId,
        channel: payload.channel,
        title: payload.title,
        summary: payload.summary,
        signal: payload.signal,
        timestamp: new Date().toISOString(),
        ...payload.metadata,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Webhook returned status ${response.status}`,
      };
    }

    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { success: false, error: `Webhook request timed out after ${REQUEST_TIMEOUT_MS}ms` };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function sendTelegram(
  payload: NotificationPayload,
  config: ChannelConfig["telegram"],
): Promise<SendResult> {
  if (!config?.botToken || !config?.chatId) {
    return { success: false, error: "Telegram bot token or chat ID not configured" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    // Format message for Telegram
    const signalEmoji: Record<string, string> = {
      "30d_low": "📉",
      bullish: "🟢",
      bearish: "🔴",
      new_announcement: "📢",
      content_update: "📝",
      neutral: "⚪",
    };

    const emoji = signalEmoji[payload.signal] || "ℹ️";
    const message = `${emoji} *${escapeMarkdown(payload.title)}*\n\n${escapeMarkdown(payload.summary)}`;

    const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: message,
        parse_mode: "Markdown",
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return {
        success: false,
        error: (body as { description?: string }).description || `Telegram API error ${response.status}`,
      };
    }

    const result = (await response.json()) as { ok: boolean; result?: { message_id: number } };

    return {
      success: true,
      messageId: result.result?.message_id?.toString(),
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { success: false, error: `Telegram request timed out after ${REQUEST_TIMEOUT_MS}ms` };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function escapeMarkdown(text: string): string {
  // Telegram MarkdownV1 only has these special characters: _ * [ `
  // Escape backslash first, then MarkdownV1 specials
  return text.replace(/\\/g, "\\\\").replace(/([_*`\[])/g, "\\$&");
}

// ─── Channel Dispatcher ──────────────────────────────────────────────────────

export async function sendNotification(
  payload: NotificationPayload,
  config: ChannelConfig,
): Promise<SendResult> {
  switch (payload.channel) {
    case "webhook":
      return sendWebhook(payload, config.webhook);

    case "telegram":
      return sendTelegram(payload, config.telegram);

    case "in_app":
      // In-app notifications are stored in the database, not sent externally
      return { success: true };

    case "email":
      // Email would require an email service integration
      return { success: false, error: "Email channel not implemented yet" };

    default:
      return { success: false, error: `Unknown channel: ${payload.channel}` };
  }
}

// ─── Channel Configuration Validation ────────────────────────────────────────

export function validateChannelConfig(
  channel: NotificationChannel,
  config: ChannelConfig,
): { valid: boolean; error?: string } {
  switch (channel) {
    case "webhook":
      if (!config.webhook?.url) {
        return { valid: false, error: "Webhook URL is required" };
      }

      try {
        new URL(config.webhook.url);
      } catch {
        return { valid: false, error: "Invalid webhook URL" };
      }

      return { valid: true };

    case "telegram":
      if (!config.telegram?.botToken) {
        return { valid: false, error: "Telegram bot token is required" };
      }

      if (!config.telegram?.chatId) {
        return { valid: false, error: "Telegram chat ID is required" };
      }

      return { valid: true };

    case "in_app":
      return { valid: true };

    case "email":
      return { valid: false, error: "Email channel not implemented yet" };

    default:
      return { valid: false, error: `Unknown channel: ${channel}` };
  }
}
