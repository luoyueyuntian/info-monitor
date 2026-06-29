import { describe, expect, it } from "vitest";

import {
  deleteEventFeedback,
  getEventFeedback,
  getFeedbackAggregation,
  upsertEventFeedback,
} from "./event-service.js";

describe("event-feedback", () => {
  const testEventId = "event-surface-low";

  describe("runtime database requirement", () => {
    it("requires DATABASE_URL for feedback reads and writes", async () => {
      await expect(getEventFeedback(testEventId)).rejects.toThrow(/DATABASE_URL/);
      await expect(upsertEventFeedback(testEventId, "useful", "This is helpful")).rejects.toThrow(/DATABASE_URL/);
      await expect(deleteEventFeedback(testEventId)).rejects.toThrow(/DATABASE_URL/);
      await expect(getFeedbackAggregation()).rejects.toThrow(/DATABASE_URL/);
    });
  });
});
