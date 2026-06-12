/**
 * Channel configuration and rate limit management routes.
 */

import type { FastifyInstance } from "fastify";

import {
  validateChannelConfig,
  type ChannelConfig,
} from "../services/notification-channels.js";
import {
  peekRateLimit,
  setChannelRateLimit,
  getChannelRateLimit,
  type RateLimitConfig,
} from "../services/rate-limiter.js";

export async function registerChannelConfigRoutes(app: FastifyInstance) {
  // ─── Validate channel configuration ──────────────────────────────────────
  app.post<{
    Body: { channel: string; config: ChannelConfig };
  }>("/api/channels/validate", async (request, reply) => {
    const body = request.body as { channel?: string; config?: ChannelConfig };

    if (!body?.channel) {
      reply.code(400);
      return { message: "channel is required" };
    }

    if (!body.config) {
      reply.code(400);
      return { message: "config is required" };
    }

    const result = validateChannelConfig(body.channel as any, body.config);
    return result;
  });

  // ─── Get rate limit status for a channel ─────────────────────────────────
  app.get<{
    Params: { channel: string };
  }>("/api/channels/:channel/rate-limit", async (request, reply) => {
    const { channel } = request.params;

    const config = getChannelRateLimit(channel);
    const status = peekRateLimit(channel);

    return {
      channel,
      config,
      remaining: status.remaining,
      resetAt: new Date(status.resetAt).toISOString(),
    };
  });

  // ─── Update rate limit for a channel ─────────────────────────────────────
  app.put<{
    Params: { channel: string };
    Body: { maxRequests: number; windowMs: number };
  }>("/api/channels/:channel/rate-limit", async (request, reply) => {
    const { channel } = request.params;
    const body = request.body as { maxRequests?: number; windowMs?: number };

    if (typeof body?.maxRequests !== "number" || typeof body?.windowMs !== "number") {
      reply.code(400);
      return { message: "maxRequests and windowMs are required numbers" };
    }

    if (!Number.isFinite(body.maxRequests) || body.maxRequests <= 0) {
      reply.code(400);
      return { message: "maxRequests must be a finite positive number" };
    }

    if (body.windowMs <= 0) {
      reply.code(400);
      return { message: "windowMs must be positive" };
    }

    const config: RateLimitConfig = {
      maxRequests: body.maxRequests,
      windowMs: body.windowMs,
    };

    setChannelRateLimit(channel, config);

    return {
      channel,
      config,
      message: "Rate limit updated",
    };
  });

  // ─── List supported channels ─────────────────────────────────────────────
  app.get("/api/channels", async () => {
    return {
      channels: [
        {
          key: "in_app",
          name: "In-App",
          description: "In-app notifications stored in the database",
          configurable: false,
        },
        {
          key: "webhook",
          name: "Webhook",
          description: "HTTP POST to a configurable URL",
          configurable: true,
          requiredConfig: ["url"],
          optionalConfig: ["headers"],
        },
        {
          key: "telegram",
          name: "Telegram",
          description: "Telegram Bot API messages",
          configurable: true,
          requiredConfig: ["botToken", "chatId"],
        },
        {
          key: "email",
          name: "Email",
          description: "Email notifications (not yet implemented)",
          configurable: false,
          status: "not_implemented",
        },
      ],
    };
  });
}
