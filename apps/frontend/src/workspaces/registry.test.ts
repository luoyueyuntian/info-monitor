import { describe, expect, it } from "vitest";
import { WORKSPACE_IDS } from "@info-monitor/shared-contracts";

import { workspaceDefinitions } from "./catalog";
import { getWorkspaceModule, getWorkspaceNavItems, getWorkspaceSectionMeta } from "./registry";

describe("workspace registry", () => {
  it("returns section navigation for every workspace from one registry", () => {
    expect(getWorkspaceNavItems("stock-market").map((item) => item.label)).toEqual([
      "大盘",
      "动作",
      "主题",
      "来源",
      "报告",
    ]);
    expect(getWorkspaceNavItems("market-impact")).toHaveLength(5);
  });

  it("exposes section metadata without route-level conditionals", () => {
    expect(getWorkspaceSectionMeta("stock-market", "reports")?.label).toBe("报告");
    expect(getWorkspaceSectionMeta("stock-market", "reports")?.description).toContain("盘后");
    expect(getWorkspaceSectionMeta("competitor-watch", "actions")?.description).toContain("分诊");
    expect(getWorkspaceSectionMeta("competitor-watch", "reports")?.description).toContain("情报摘要");
  });

  it("returns null for unknown workspaces", () => {
    expect(getWorkspaceModule("missing-workspace")).toBeNull();
  });

  it("stays aligned with shared workspace identifiers", () => {
    expect(workspaceDefinitions.map((workspace) => workspace.id)).toEqual([...WORKSPACE_IDS]);
  });
});
