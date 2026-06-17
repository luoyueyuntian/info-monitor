import { describe, expect, it } from "vitest";

import { resolveWorkspaceSectionViewId } from "./section-resolver";

describe("workspace section resolver", () => {
  it("resolves stock-market sections to stock-specific views where registered", () => {
    expect(resolveWorkspaceSectionViewId("stock-market", "dashboard")).toBe("stock-market/dashboard");
    expect(resolveWorkspaceSectionViewId("stock-market", "reports")).toBe("stock-market/reports");
    expect(resolveWorkspaceSectionViewId("stock-market", "sources")).toBe("shared/sources");
  });

  it("resolves competitor-watch sections to competitor-specific views where registered", () => {
    expect(resolveWorkspaceSectionViewId("competitor-watch", "dashboard")).toBe("competitor-watch/dashboard");
    expect(resolveWorkspaceSectionViewId("competitor-watch", "actions")).toBe("competitor-watch/actions");
    expect(resolveWorkspaceSectionViewId("competitor-watch", "topics")).toBe("competitor-watch/topics");
    expect(resolveWorkspaceSectionViewId("competitor-watch", "sources")).toBe("competitor-watch/sources");
    expect(resolveWorkspaceSectionViewId("competitor-watch", "reports")).toBe("competitor-watch/reports");
  });

  it("falls back to shared views for other generic workspaces", () => {
    expect(resolveWorkspaceSectionViewId("market-impact", "dashboard")).toBe("shared/dashboard");
    expect(resolveWorkspaceSectionViewId("goods-supply", "topics")).toBe("shared/topics");
  });
});
