import { describe, expect, it } from "vitest";

import { fallbackEvents, fallbackSources, fallbackThemes } from "./demo-fixtures";
import { buildWorkspaceDataset, buildWorkspaceSummary, classifyThemeWorkspace } from "./workspaces";

describe("workspace classification", () => {
  it("routes demo themes into isolated workspaces", () => {
    const byThemeName = new Map(fallbackThemes.map((theme) => {
      const relatedEvents = fallbackEvents.filter((event) => event.themeId === theme.id);
      const relatedSources = fallbackSources.filter((source) => source.themeId === theme.id);
      return [theme.name, classifyThemeWorkspace(theme, relatedEvents, relatedSources)];
    }));

    expect(byThemeName.get("Surface Pro 8 16G + 512G Price")).toBe("goods-supply");
    expect(byThemeName.get("PBOC Open Market Operations")).toBe("market-impact");
    expect(byThemeName.get("NBS CPI Releases")).toBe("market-impact");
    expect(byThemeName.get("Figma Product Updates")).toBe("competitor-watch");
    expect(byThemeName.get("贵州茅台每日价格")).toBe("market-impact");
  });

  it("builds scoped datasets without cross-workspace leakage", () => {
    const market = buildWorkspaceDataset("market-impact", fallbackThemes, fallbackEvents, fallbackSources);
    const goods = buildWorkspaceDataset("goods-supply", fallbackThemes, fallbackEvents, fallbackSources);
    const competitor = buildWorkspaceDataset("competitor-watch", fallbackThemes, fallbackEvents, fallbackSources);

    expect(market.themes.map((theme) => theme.name)).toContain("PBOC Open Market Operations");
    expect(market.themes.map((theme) => theme.name)).not.toContain("Figma Product Updates");
    expect(goods.themes.map((theme) => theme.name)).toContain("Surface Pro 8 16G + 512G Price");
    expect(goods.themes.map((theme) => theme.name)).not.toContain("PBOC Open Market Operations");
    expect(competitor.themes.map((theme) => theme.name)).toEqual(["Figma Product Updates"]);
  });

  it("produces a meaningful workspace summary", () => {
    const market = buildWorkspaceDataset("market-impact", fallbackThemes, fallbackEvents, fallbackSources);
    const summary = buildWorkspaceSummary(market);

    expect(summary.majorEvents).toBeGreaterThan(0);
    expect(summary.warningSources).toBeGreaterThan(0);
    expect(summary.status).toBe("alert");
  });
});
