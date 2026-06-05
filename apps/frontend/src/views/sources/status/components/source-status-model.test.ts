import { describe, expect, it } from "vitest";

import type { SourceStatus } from "../../../../lib/api";
import { buildSourceDiagnostics, buildSourceFilterSummary } from "./source-status-model";

const makeSource = (overrides: Partial<SourceStatus> = {}): SourceStatus => ({
  id: "source_1",
  themeId: "theme_1",
  themeName: "Theme One",
  name: "Source One",
  status: "healthy",
  latestSuccessAt: "2026-01-02T00:00:00.000Z",
  latestFailureAt: null,
  latestRunAt: "2026-01-02T00:00:00.000Z",
  ...overrides,
});

describe("source-status-model", () => {
  it("builds warning diagnostics when source warnings exist", () => {
    const diagnostics = buildSourceDiagnostics([
      makeSource({ status: "warning", latestRunStatus: "failed", themeType: "financial_event", latestEventSignal: "bearish" }),
      makeSource({ id: "source_2", status: "pending", latestRunStatus: "pending" }),
    ]);

    expect(diagnostics.tone).toBe("warning");
    expect(diagnostics.summary).toContain("异常来源");
    expect(diagnostics.summary).toContain("偏利空主题");
    expect(diagnostics.priorityItems[0]).toContain("偏利空");
  });

  it("builds source filter summary", () => {
    const summary = buildSourceFilterSummary("warning", "negative", "Theme One", true, "2026-01-01T00:00:00.000Z");

    expect(summary).toContain("只看异常来源");
    expect(summary).toContain("主题 Theme One");
    expect(summary).toContain("只看关联偏利空主题来源");
    expect(summary).toContain("仅最近24小时运行");
  });
});
