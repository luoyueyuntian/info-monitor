import { describe, expect, it } from "vitest";

import { buildWorkspaceShellState } from "./shell";

describe("workspace shell state", () => {
  it("builds top navigation state for the active workspace section", () => {
    const state = buildWorkspaceShellState("stock-market", "/workspace/stock-market/reports");

    expect(state?.currentSection.id).toBe("reports");
    expect(state?.currentSection.description).toContain("盘后");
    expect(state?.navItems.map((item) => item.to)).toContain("/workspace/stock-market/reports");
  });

  it("uses workspace-specific section descriptions for competitor-watch", () => {
    const state = buildWorkspaceShellState("competitor-watch", "/workspace/competitor-watch/reports");

    expect(state?.currentSection.id).toBe("reports");
    expect(state?.currentSection.description).toContain("情报摘要");
  });

  it("returns null when the current route is outside workspace pages", () => {
    expect(buildWorkspaceShellState(null, "/notifications")).toBeNull();
  });
});
