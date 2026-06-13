import { describe, expect, it, beforeEach } from "vitest";

import {
  getEventFeedback,
  upsertEventFeedback,
  deleteEventFeedback,
  getFeedbackAggregation,
} from "./event-service.js";
import { mockEventFeedback, mockEvents } from "../lib/mock-store.js";

describe("event-feedback (mock mode)", () => {
  const testEventId = "event-surface-low";

  beforeEach(() => {
    // Clear the feedback store before each test
    mockEventFeedback.length = 0;
  });

  describe("getEventFeedback", () => {
    it("returns null when no feedback exists", async () => {
      const feedback = await getEventFeedback(testEventId);

      expect(feedback).toBeNull();
    });
  });

  describe("upsertEventFeedback", () => {
    it("creates new feedback", async () => {
      const result = await upsertEventFeedback(testEventId, "useful", "This is helpful");

      expect(result).not.toBeNull();
      expect(result?.eventId).toBe(testEventId);
      expect(result?.feedback).toBe("useful");
      expect(result?.note).toBe("This is helpful");
      expect(result?.createdAt).not.toBeNull();
      expect(result?.updatedAt).not.toBeNull();
    });

    it("persists feedback across reads", async () => {
      await upsertEventFeedback(testEventId, "noise", "Not relevant");

      const feedback = await getEventFeedback(testEventId);

      expect(feedback).not.toBeNull();
      expect(feedback?.feedback).toBe("noise");
      expect(feedback?.note).toBe("Not relevant");
    });

    it("updates existing feedback", async () => {
      await upsertEventFeedback(testEventId, "useful");

      const updated = await upsertEventFeedback(testEventId, "watch", "Need to track");

      expect(updated?.feedback).toBe("watch");
      expect(updated?.note).toBe("Need to track");

      const feedback = await getEventFeedback(testEventId);
      expect(feedback?.feedback).toBe("watch");
      expect(feedback?.note).toBe("Need to track");
    });

    it("creates feedback even for non-existent event in mock mode", async () => {
      // In mock mode, event existence is not validated
      const result = await upsertEventFeedback("non-existent-event", "useful");

      expect(result).not.toBeNull();
      expect(result?.feedback).toBe("useful");
    });
  });

  describe("deleteEventFeedback", () => {
    it("deletes existing feedback", async () => {
      await upsertEventFeedback(testEventId, "useful");

      const deleted = await deleteEventFeedback(testEventId);

      expect(deleted).toBe(true);

      const feedback = await getEventFeedback(testEventId);
      expect(feedback).toBeNull();
    });

    it("returns true even when no feedback exists (idempotent delete)", async () => {
      const deleted = await deleteEventFeedback(testEventId);

      expect(deleted).toBe(true);
    });
  });

  describe("getFeedbackAggregation", () => {
    it("returns empty aggregation when no feedback exists", async () => {
      const aggregation = await getFeedbackAggregation();

      expect(aggregation.totalFeedback).toBe(0);
      expect(aggregation.recentFeedback).toBe(0);
      expect(aggregation.bySignal).toHaveLength(0);
      expect(aggregation.byEventType).toHaveLength(0);
      expect(aggregation.byTheme).toHaveLength(0);
    });

    it("aggregates feedback by signal type", async () => {
      // Create feedback for events with different signals
      await upsertEventFeedback("event-surface-low", "useful");
      await upsertEventFeedback("event-pbc-withdrawal", "noise");

      const aggregation = await getFeedbackAggregation();

      expect(aggregation.totalFeedback).toBe(2);
      expect(aggregation.bySignal.length).toBeGreaterThanOrEqual(2);

      const lowSignal = aggregation.bySignal.find((item) => item.key === "30d_low");
      expect(lowSignal).toBeDefined();
      expect(lowSignal?.useful).toBe(1);

      const withdrawalSignal = aggregation.bySignal.find((item) => item.key === "liquidity_withdrawal");
      expect(withdrawalSignal).toBeDefined();
      expect(withdrawalSignal?.noise).toBe(1);
    });

    it("aggregates feedback by event type", async () => {
      await upsertEventFeedback("event-surface-low", "useful");
      await upsertEventFeedback("event-pbc-withdrawal", "watch");

      const aggregation = await getFeedbackAggregation();

      expect(aggregation.byEventType.length).toBeGreaterThanOrEqual(2);
    });

    it("aggregates feedback by theme", async () => {
      await upsertEventFeedback("event-surface-low", "useful");
      await upsertEventFeedback("event-pbc-withdrawal", "noise");

      const aggregation = await getFeedbackAggregation();

      expect(aggregation.byTheme.length).toBeGreaterThanOrEqual(2);
    });
  });
});
