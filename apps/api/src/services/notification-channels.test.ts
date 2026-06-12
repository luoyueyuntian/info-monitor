import { describe, expect, it, vi } from "vitest";

import {
  sendNotification,
  validateChannelConfig,
  type NotificationPayload,
  type ChannelConfig,
} from "./notification-channels.js";

const basePayload: NotificationPayload = {
  id: "notif-001",
  eventId: "event-001",
  channel: "webhook",
  title: "Test Notification",
  summary: "This is a test",
  signal: "30d_low",
};

// ─── validateChannelConfig ───────────────────────────────────────────────────

describe("validateChannelConfig", () => {
  describe("webhook", () => {
    it("accepts valid URL", () => {
      const result = validateChannelConfig("webhook", {
        webhook: { url: "https://example.com/hook" },
      });
      expect(result.valid).toBe(true);
    });

    it("rejects missing URL", () => {
      const result = validateChannelConfig("webhook", {});
      expect(result.valid).toBe(false);
      expect(result.error).toContain("URL");
    });

    it("rejects invalid URL", () => {
      const result = validateChannelConfig("webhook", {
        webhook: { url: "not-a-url" },
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid");
    });

    it("accepts URL with custom headers", () => {
      const result = validateChannelConfig("webhook", {
        webhook: { url: "https://example.com/hook", headers: { Authorization: "Bearer token" } },
      });
      expect(result.valid).toBe(true);
    });
  });

  describe("telegram", () => {
    it("accepts valid config", () => {
      const result = validateChannelConfig("telegram", {
        telegram: { botToken: "123:ABC", chatId: "12345" },
      });
      expect(result.valid).toBe(true);
    });

    it("rejects missing botToken", () => {
      const result = validateChannelConfig("telegram", {
        telegram: { botToken: "", chatId: "12345" },
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("token");
    });

    it("rejects missing chatId", () => {
      const result = validateChannelConfig("telegram", {
        telegram: { botToken: "123:ABC", chatId: "" },
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("chat");
    });

    it("rejects completely empty telegram config", () => {
      const result = validateChannelConfig("telegram", {});
      expect(result.valid).toBe(false);
    });
  });

  describe("in_app", () => {
    it("always validates successfully", () => {
      const result = validateChannelConfig("in_app", {});
      expect(result.valid).toBe(true);
    });
  });

  describe("email", () => {
    it("returns not implemented error", () => {
      const result = validateChannelConfig("email", {});
      expect(result.valid).toBe(false);
      expect(result.error).toContain("not implemented");
    });
  });

  describe("unknown channel", () => {
    it("rejects unknown channel", () => {
      const result = validateChannelConfig("carrier_pigeon" as any, {});
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Unknown");
    });
  });
});

// ─── sendNotification ────────────────────────────────────────────────────────

describe("sendNotification", () => {
  describe("in_app", () => {
    it("returns success immediately", async () => {
      const result = await sendNotification(
        { ...basePayload, channel: "in_app" },
        {},
      );
      expect(result.success).toBe(true);
    });
  });

  describe("email", () => {
    it("returns not implemented error", async () => {
      const result = await sendNotification(
        { ...basePayload, channel: "email" },
        {},
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain("not implemented");
    });
  });

  describe("unknown channel", () => {
    it("returns unknown channel error", async () => {
      const result = await sendNotification(
        { ...basePayload, channel: "carrier_pigeon" as any },
        {},
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown");
    });
  });

  describe("webhook", () => {
    it("returns error when URL is not configured", async () => {
      const result = await sendNotification(
        { ...basePayload, channel: "webhook" },
        {},
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain("not configured");
    });

    it("sends POST request to webhook URL", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(null, { status: 200 }),
      );

      const result = await sendNotification(
        { ...basePayload, channel: "webhook" },
        { webhook: { url: "https://example.com/hook" } },
      );

      expect(result.success).toBe(true);
      expect(fetchSpy).toHaveBeenCalledOnce();

      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toBe("https://example.com/hook");
      expect(options?.method).toBe("POST");
      expect(options?.headers).toHaveProperty("Content-Type", "application/json");

      const body = JSON.parse(options?.body as string);
      expect(body.id).toBe("notif-001");
      expect(body.event_id).toBe("event-001");
      expect(body.title).toBe("Test Notification");

      fetchSpy.mockRestore();
    });

    it("includes custom headers in webhook request", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(null, { status: 200 }),
      );

      await sendNotification(
        { ...basePayload, channel: "webhook" },
        { webhook: { url: "https://example.com/hook", headers: { "X-Custom": "value" } } },
      );

      const [, options] = fetchSpy.mock.calls[0];
      expect(options?.headers).toHaveProperty("X-Custom", "value");

      fetchSpy.mockRestore();
    });

    it("returns error on non-2xx response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(null, { status: 500 }),
      );

      const result = await sendNotification(
        { ...basePayload, channel: "webhook" },
        { webhook: { url: "https://example.com/hook" } },
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("500");

      vi.restoreAllMocks();
    });

    it("returns error on network failure", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("ECONNREFUSED"));

      const result = await sendNotification(
        { ...basePayload, channel: "webhook" },
        { webhook: { url: "https://example.com/hook" } },
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("ECONNREFUSED");

      vi.restoreAllMocks();
    });

    it("includes metadata in webhook payload", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(null, { status: 200 }),
      );

      await sendNotification(
        { ...basePayload, channel: "webhook", metadata: { priority: "high", tags: ["price"] } },
        { webhook: { url: "https://example.com/hook" } },
      );

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.priority).toBe("high");
      expect(body.tags).toEqual(["price"]);

      fetchSpy.mockRestore();
    });
  });

  describe("telegram", () => {
    it("returns error when config is missing", async () => {
      const result = await sendNotification(
        { ...basePayload, channel: "telegram" },
        {},
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain("not configured");
    });

    it("sends formatted message to Telegram API", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, result: { message_id: 42 } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const result = await sendNotification(
        { ...basePayload, channel: "telegram", signal: "bullish" },
        { telegram: { botToken: "123:ABC", chatId: "999" } },
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("42");

      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toContain("api.telegram.org");
      expect(url).toContain("123:ABC");

      const body = JSON.parse(options?.body as string);
      expect(body.chat_id).toBe("999");
      expect(body.parse_mode).toBe("Markdown");
      expect(body.text).toContain("🟢"); // bullish emoji

      fetchSpy.mockRestore();
    });

    it("uses correct emoji for each signal", async () => {
      const signals = [
        { signal: "30d_low", emoji: "📉" },
        { signal: "bullish", emoji: "🟢" },
        { signal: "bearish", emoji: "🔴" },
        { signal: "new_announcement", emoji: "📢" },
        { signal: "content_update", emoji: "📝" },
        { signal: "neutral", emoji: "⚪" },
        { signal: "unknown_signal", emoji: "ℹ️" },
      ];

      for (const { signal, emoji } of signals) {
        const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
          new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );

        await sendNotification(
          { ...basePayload, channel: "telegram", signal },
          { telegram: { botToken: "123:ABC", chatId: "999" } },
        );

        const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
        expect(body.text).toContain(emoji);

        fetchSpy.mockRestore();
      }
    });

    it("returns error on Telegram API failure", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: false, description: "Bad Request" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const result = await sendNotification(
        { ...basePayload, channel: "telegram" },
        { telegram: { botToken: "123:ABC", chatId: "999" } },
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Bad Request");

      vi.restoreAllMocks();
    });

    it("escapes markdown special characters", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      await sendNotification(
        {
          ...basePayload,
          channel: "telegram",
          title: "Price *drop* alert!",
          summary: "Price fell [10%] - check (now)",
        },
        { telegram: { botToken: "123:ABC", chatId: "999" } },
      );

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      // MarkdownV1 special chars should be escaped with backslash
      expect(body.text).toContain("\\*");   // * is special in V1
      expect(body.text).toContain("\\[");   // [ is special in V1
      expect(body.text).toContain("(now)"); // ( is NOT special in V1, should not be escaped

      fetchSpy.mockRestore();
    });
  });
});
