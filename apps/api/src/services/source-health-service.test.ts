import { describe, expect, it, vi } from "vitest";

// Force mock mode
vi.mock("../db/client.js", () => ({
  getDatabase: () => null,
}));

import { getSourceHealthStats, getOperationalMetrics } from "./source-health-service.js";

describe("source-health-service (mock mode)", () => {
  describe("getSourceHealthStats", () => {
    it("returns complete health stats structure", async () => {
      const stats = await getSourceHealthStats();

      expect(stats).toHaveProperty("totalSources");
      expect(stats).toHaveProperty("healthySources");
      expect(stats).toHaveProperty("warningSources");
      expect(stats).toHaveProperty("pausedSources");
      expect(stats).toHaveProperty("healthRate");
      expect(stats).toHaveProperty("recentRuns");
      expect(stats).toHaveProperty("averageRunDuration");
      expect(stats).toHaveProperty("recentErrors");
      expect(stats).toHaveProperty("sourceDetails");
    });

    it("has correct source counts matching mock data", async () => {
      const stats = await getSourceHealthStats();

      expect(stats.totalSources).toBeGreaterThanOrEqual(6); // 6 mock sources
      expect(stats.healthySources).toBeGreaterThanOrEqual(0);
      expect(stats.warningSources).toBeGreaterThanOrEqual(0);
      expect(stats.pausedSources).toBeGreaterThanOrEqual(0);
      expect(stats.healthySources + stats.warningSources + stats.pausedSources).toBeLessThanOrEqual(stats.totalSources);
    });

    it("calculates health rate correctly", async () => {
      const stats = await getSourceHealthStats();

      if (stats.totalSources > 0) {
        // healthRate is now based on average health score (0-1)
        expect(stats.healthRate).toBeGreaterThanOrEqual(0);
        expect(stats.healthRate).toBeLessThanOrEqual(1);
        // With mock data, should have reasonable health rate
        expect(stats.healthRate).toBeGreaterThan(0.5);
      } else {
        expect(stats.healthRate).toBe(0);
      }
    });

    it("has valid recent run stats", async () => {
      const stats = await getSourceHealthStats();

      expect(stats.recentRuns.total).toBeGreaterThanOrEqual(0);
      expect(stats.recentRuns.successful).toBeGreaterThanOrEqual(0);
      expect(stats.recentRuns.failed).toBeGreaterThanOrEqual(0);
      expect(stats.recentRuns.successful + stats.recentRuns.failed).toBeLessThanOrEqual(stats.recentRuns.total);

      if (stats.recentRuns.total > 0) {
        expect(stats.recentRuns.successRate).toBeGreaterThanOrEqual(0);
        expect(stats.recentRuns.successRate).toBeLessThanOrEqual(1);
      }
    });

    it("returns average run duration in mock mode", async () => {
      const stats = await getSourceHealthStats();

      expect(stats.averageRunDuration).toBe(1500);
    });

    it("returns recent errors array", async () => {
      const stats = await getSourceHealthStats();

      expect(Array.isArray(stats.recentErrors)).toBe(true);
      expect(stats.recentErrors.length).toBeGreaterThanOrEqual(1);

      for (const error of stats.recentErrors) {
        expect(error).toHaveProperty("sourceId");
        expect(error).toHaveProperty("sourceName");
        expect(error).toHaveProperty("errorMessage");
        expect(error).toHaveProperty("occurredAt");
        expect(typeof error.errorMessage).toBe("string");
        expect(error.errorMessage.length).toBeGreaterThan(0);
      }
    });

    it("returns source details for every source", async () => {
      const stats = await getSourceHealthStats();

      expect(stats.sourceDetails.length).toBe(stats.totalSources);

      for (const detail of stats.sourceDetails) {
        expect(detail).toHaveProperty("id");
        expect(detail).toHaveProperty("name");
        expect(detail).toHaveProperty("themeName");
        expect(detail).toHaveProperty("status");
        expect(detail).toHaveProperty("isPaused");
        expect(detail).toHaveProperty("latestRunStatus");
        expect(detail).toHaveProperty("runCount24h");
        expect(detail).toHaveProperty("successCount24h");
        expect(detail).toHaveProperty("failureCount24h");
        expect(typeof detail.runCount24h).toBe("number");
        expect(typeof detail.successCount24h).toBe("number");
        expect(typeof detail.failureCount24h).toBe("number");
      }
    });

    it("source details have consistent run counts", async () => {
      const stats = await getSourceHealthStats();

      for (const detail of stats.sourceDetails) {
        expect(detail.successCount24h + detail.failureCount24h).toBeLessThanOrEqual(detail.runCount24h);
      }
    });

    it("healthy sources have more successes than failures in mock", async () => {
      const stats = await getSourceHealthStats();

      const healthyDetails = stats.sourceDetails.filter((d) => d.status === "healthy");
      for (const detail of healthyDetails) {
        expect(detail.successCount24h).toBe(3);
        expect(detail.failureCount24h).toBe(0);
      }
    });

    it("warning sources have failures in mock", async () => {
      const stats = await getSourceHealthStats();

      const warningDetails = stats.sourceDetails.filter((d) => d.status === "warning");
      for (const detail of warningDetails) {
        expect(detail.failureCount24h).toBe(2);
      }
    });
  });

  describe("getOperationalMetrics", () => {
    it("returns complete metrics structure", async () => {
      const metrics = await getOperationalMetrics();

      expect(metrics).toHaveProperty("runDurationTrend");
      expect(metrics).toHaveProperty("failureRateTrend");
      expect(metrics).toHaveProperty("backlog");
      expect(metrics).toHaveProperty("recentExceptions");
      expect(metrics).toHaveProperty("hourlyDistribution");
    });

    it("runDurationTrend has 7 days of data", async () => {
      const metrics = await getOperationalMetrics();

      expect(metrics.runDurationTrend).toHaveLength(7);
      for (const entry of metrics.runDurationTrend) {
        expect(entry).toHaveProperty("date");
        expect(entry).toHaveProperty("value");
        expect(typeof entry.date).toBe("string");
        expect(typeof entry.value).toBe("number");
        // Date should be YYYY-MM-DD format
        expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it("runDurationTrend dates are consecutive", async () => {
      const metrics = await getOperationalMetrics();

      for (let i = 1; i < metrics.runDurationTrend.length; i++) {
        const prev = new Date(metrics.runDurationTrend[i - 1].date);
        const curr = new Date(metrics.runDurationTrend[i].date);
        const diffDays = (curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000);
        expect(diffDays).toBe(1);
      }
    });

    it("failureRateTrend has 7 days of data with values in [0, 1]", async () => {
      const metrics = await getOperationalMetrics();

      expect(metrics.failureRateTrend).toHaveLength(7);
      for (const entry of metrics.failureRateTrend) {
        expect(entry).toHaveProperty("date");
        expect(entry).toHaveProperty("value");
        expect(entry.value).toBeGreaterThanOrEqual(0);
        expect(entry.value).toBeLessThanOrEqual(1);
      }
    });

    it("backlog has correct structure", async () => {
      const metrics = await getOperationalMetrics();

      expect(metrics.backlog).toHaveProperty("pendingRuns");
      expect(metrics.backlog).toHaveProperty("runningRuns");
      expect(metrics.backlog).toHaveProperty("oldestPendingAge");
      expect(typeof metrics.backlog.pendingRuns).toBe("number");
      expect(typeof metrics.backlog.runningRuns).toBe("number");
      expect(metrics.backlog.pendingRuns).toBeGreaterThanOrEqual(0);
      expect(metrics.backlog.runningRuns).toBeGreaterThanOrEqual(0);
    });

    it("backlog oldestPendingAge is a valid ISO duration or null", async () => {
      const metrics = await getOperationalMetrics();

      const age = metrics.backlog.oldestPendingAge;
      if (age !== null) {
        // Should be ISO 8601 duration format like PT15M
        expect(age).toMatch(/^PT/);
      }
    });

    it("recentExceptions has correct structure", async () => {
      const metrics = await getOperationalMetrics();

      expect(Array.isArray(metrics.recentExceptions)).toBe(true);
      for (const exc of metrics.recentExceptions) {
        expect(exc).toHaveProperty("errorMessage");
        expect(exc).toHaveProperty("count");
        expect(exc).toHaveProperty("lastOccurredAt");
        expect(exc).toHaveProperty("sourceIds");
        expect(typeof exc.errorMessage).toBe("string");
        expect(typeof exc.count).toBe("number");
        expect(exc.count).toBeGreaterThan(0);
        expect(Array.isArray(exc.sourceIds)).toBe(true);
        expect(exc.sourceIds.length).toBeGreaterThan(0);
      }
    });

    it("recentExceptions are sorted by count descending", async () => {
      const metrics = await getOperationalMetrics();

      for (let i = 1; i < metrics.recentExceptions.length; i++) {
        expect(metrics.recentExceptions[i - 1].count).toBeGreaterThanOrEqual(
          metrics.recentExceptions[i].count,
        );
      }
    });

    it("recentExceptions are limited to 10", async () => {
      const metrics = await getOperationalMetrics();

      expect(metrics.recentExceptions.length).toBeLessThanOrEqual(10);
    });

    it("hourlyDistribution has 24 entries (0-23)", async () => {
      const metrics = await getOperationalMetrics();

      expect(metrics.hourlyDistribution).toHaveLength(24);
      for (let hour = 0; hour < 24; hour++) {
        const entry = metrics.hourlyDistribution[hour];
        expect(entry.hour).toBe(hour);
        expect(entry).toHaveProperty("total");
        expect(entry).toHaveProperty("successful");
        expect(entry).toHaveProperty("failed");
        expect(entry.total).toBeGreaterThanOrEqual(0);
        expect(entry.successful).toBeGreaterThanOrEqual(0);
        expect(entry.failed).toBeGreaterThanOrEqual(0);
        expect(entry.successful + entry.failed).toBeLessThanOrEqual(entry.total);
      }
    });
  });
});
