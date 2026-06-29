import { describe, expect, it } from "vitest";

import { getDailySummary } from "../services/daily-summary-service.js";
import { getWeeklyReviewHistory, getWeeklySummary, getWeeklySummaryCompare } from "../services/weekly-summary-service.js";
import { getThemeDailyActivity } from "../services/theme-service.js";
import { getSourceConfigHistory, getSourceDetail } from "../services/source-service.js";
import { explainSourceHealth, getSourceHealthStats } from "../services/source-health-service.js";
import { DEMO_THEME_IDS } from "@info-monitor/shared-contracts";

describe("summary services runtime database requirement", () => {
  it("requires DATABASE_URL for daily summary access", async () => {
    await expect(getDailySummary()).rejects.toThrow(/DATABASE_URL/);
  });

  it("requires DATABASE_URL for weekly summary access", async () => {
    await expect(getWeeklySummary()).rejects.toThrow(/DATABASE_URL/);
    await expect(getWeeklySummaryCompare()).rejects.toThrow(/DATABASE_URL/);
    await expect(getWeeklyReviewHistory(2)).rejects.toThrow(/DATABASE_URL/);
  });

  it("requires DATABASE_URL for theme activity, source detail, and source history access", async () => {
    await expect(getThemeDailyActivity(DEMO_THEME_IDS.SURFACE_PRO_8, 7)).rejects.toThrow(/DATABASE_URL/);
    await expect(getSourceDetail("source-demo-price-feed")).rejects.toThrow(/DATABASE_URL/);
    await expect(getSourceConfigHistory("source-demo-price-feed")).rejects.toThrow(/DATABASE_URL/);
  });

  it("requires DATABASE_URL for source health stats", async () => {
    await expect(getSourceHealthStats()).rejects.toThrow(/DATABASE_URL/);
  });
});

describe("source health explanation regression", () => {
  it("explainSourceHealth returns recommendation for normalized_zero issue", () => {
    const explanation = explainSourceHealth({
      id: "test-source",
      name: "Test Source",
      status: "healthy",
      latestRunStatus: "completed",
      latestSnapshotCount: 5,
      latestRecordCount: 0,
      latestEventCount: 0,
    });

    const normalizedZeroIssue = explanation.issues.find((i) => i.type === "normalized_zero");
    expect(normalizedZeroIssue).toBeDefined();
    expect(explanation.recommendation).toContain("页面结构");
    expect(explanation.impactLevel).toBe("high");
  });

  it("explainSourceHealth returns recommendation for upstream_unreachable issue", () => {
    const explanation = explainSourceHealth({
      id: "test-source",
      name: "Test Source",
      status: "warning",
      latestRunStatus: "failed",
      lastErrorMessage: "Connection timeout to upstream",
    });

    const unreachableIssue = explanation.issues.find((i) => i.type === "upstream_unreachable");
    expect(unreachableIssue).toBeDefined();
    expect(explanation.recommendation).toContain("URL");
  });

  it("explainSourceHealth returns recommendation for parse_mismatch issue", () => {
    const explanation = explainSourceHealth({
      id: "test-source",
      name: "Test Source",
      status: "warning",
      latestRunStatus: "failed",
      lastErrorMessage: "Parsing failed: unexpected HTML structure",
    });

    const parseIssue = explanation.issues.find((i) => i.type === "parse_mismatch");
    expect(parseIssue).toBeDefined();
    expect(explanation.recommendation).toContain("适配器");
  });

  it("explainSourceHealth returns recommendation for record_drop issue", () => {
    const explanation = explainSourceHealth({
      id: "test-source",
      name: "Test Source",
      status: "healthy",
      latestRunStatus: "completed",
      latestRecordCount: 5,
      recentRecordCounts: [5, 100, 100, 100, 100],
    });

    const recordDropIssue = explanation.issues.find((i) => i.type === "record_drop");
    expect(recordDropIssue).toBeDefined();
    expect(explanation.recommendation).toContain("手动运行");
  });

  it("explainSourceHealth uses previous runs average for drift detection", () => {
    const explanation = explainSourceHealth({
      id: "test-source",
      name: "Test Source",
      status: "healthy",
      latestRunStatus: "completed",
      latestRecordCount: 48,
      recentRecordCounts: [48, 100, 100, 100, 100, 100, 100, 100, 100, 100],
    });

    const recordDropIssue = explanation.issues.find((i) => i.type === "record_drop");
    expect(recordDropIssue).toBeDefined();
  });
});
