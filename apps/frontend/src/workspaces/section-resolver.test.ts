import { describe, expect, it } from "vitest";

import { resolveWorkspaceSectionViewId } from "./section-resolver";

describe("workspace section resolver", () => {
  it("resolves stock-market sections to stock-specific views where registered", () => {
    expect(resolveWorkspaceSectionViewId("stock-market", "dashboard")).toBe("stock-market/dashboard");
    expect(resolveWorkspaceSectionViewId("stock-market", "reports")).toBe("stock-market/reports");
    expect(resolveWorkspaceSectionViewId("stock-market", "sources")).toBe("shared/sources");
  });

  it("falls back to shared views for other workspaces", () => {
    expect(resolveWorkspaceSectionViewId("market-impact", "dashboard")).toBe("shared/dashboard");
    expect(resolveWorkspaceSectionViewId("competitor-watch", "topics")).toBe("shared/topics");
  });
});
