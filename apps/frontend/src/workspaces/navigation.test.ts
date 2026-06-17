import { describe, expect, it } from "vitest";

import { buildWorkspaceDetailBackTarget, buildWorkspaceSectionPath, resolveWorkspaceDetailBackNavigation } from "./navigation";
import { buildStockMarketReportRoute, buildStockReportReturnQuery } from "./stock-market/navigation";

describe("workspace navigation helpers", () => {
  it("builds workspace section paths from a shared helper", () => {
    expect(buildWorkspaceSectionPath("stock-market", "reports")).toBe("/workspace/stock-market/reports");
    expect(buildWorkspaceSectionPath("competitor-watch", "topics")).toBe("/workspace/competitor-watch/topics");
  });

  it("builds stock-market report return query and target together", () => {
    expect(buildStockReportReturnQuery({ reportDate: "2026-06-18", reportFocus: "movers" })).toEqual({
      returnTo: "stock-report",
      reportDate: "2026-06-18",
      reportFocus: "movers",
    });

    expect(buildStockMarketReportRoute({ reportDate: "2026-06-18", reportFocus: "movers" })).toEqual({
      path: "/workspace/stock-market/reports",
      query: { date: "2026-06-18", focus: "movers" },
    });
  });

  it("builds detail back targets without per-component stock-market branches", () => {
    expect(buildWorkspaceDetailBackTarget({
      workspaceId: "stock-market",
      fallbackSection: "actions",
      returnTo: "stock-report",
      reportDate: "2026-06-18",
      reportFocus: "snapshot",
    })).toEqual({
      path: "/workspace/stock-market/reports",
      query: { date: "2026-06-18", focus: "snapshot" },
    });

    expect(buildWorkspaceDetailBackTarget({
      workspaceId: "market-impact",
      fallbackSection: "topics",
    })).toBe("/workspace/market-impact/topics");

    expect(buildWorkspaceDetailBackTarget({
      workspaceId: null,
      fallbackSection: "sources",
      sourceThemeId: "theme_1",
    })).toEqual({
      path: "/sources/status",
      query: { themeId: "theme_1" },
    });
  });

  it("prefers explicit stock-report return targets over browser history", () => {
    expect(resolveWorkspaceDetailBackNavigation({
      historyLength: 5,
      workspaceId: "stock-market",
      fallbackSection: "actions",
      returnTo: "stock-report",
      reportDate: "2026-06-18",
      reportFocus: "sector",
    })).toEqual({
      useBrowserBack: false,
      target: {
        path: "/workspace/stock-market/reports",
        query: { date: "2026-06-18", focus: "sector" },
      },
    });

    expect(resolveWorkspaceDetailBackNavigation({
      historyLength: 5,
      workspaceId: "market-impact",
      fallbackSection: "topics",
    })).toEqual({
      useBrowserBack: true,
      target: "/workspace/market-impact/topics",
    });
  });
});
