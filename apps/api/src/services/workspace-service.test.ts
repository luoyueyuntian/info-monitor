import { afterEach, describe, expect, it, vi } from "vitest";
import type { EventSummary, SourceStatus, ThemeSummary } from "@info-monitor/shared-contracts";
const data = vi.hoisted(() => ({ themes: vi.fn(), events: vi.fn(), sources: vi.fn() }));
vi.mock("./theme-service.js", () => ({ listThemes: data.themes }));
vi.mock("./source-service.js", () => ({ listSourceStatuses: data.sources }));
vi.mock("./event-list-service.js", () => ({ listCompactEvents: data.events }));
import { getWorkspaceData, getWorkspaceIndex, invalidateWorkspaceCache } from "./workspace-service.js";

afterEach(() => { invalidateWorkspaceCache(); vi.resetAllMocks(); vi.useRealTimers(); });
function setup() {
  data.themes.mockResolvedValue([{ id: "goods", name: "Laptop", type: "price", status: "active" }, { id: "stock", name: "贵州茅台", type: "price", status: "active" }] as ThemeSummary[]);
  data.sources.mockResolvedValue([{ id: "s1", themeId: "goods", name: "Laptop price", adapterKey: "generic_price_list", status: "healthy" }, { id: "s2", themeId: "stock", name: "Stock quote", adapterKey: "eastmoney_stock_kline", status: "healthy" }] as SourceStatus[]);
  data.events.mockResolvedValue([{ id: "e1", themeId: "goods", themeName: "Laptop", title: "Offer", summary: "", signal: "30d_low", occurredAt: "2026-11-12T00:00:00Z", infoType: "price" }, { id: "e2", themeId: "stock", themeName: "贵州茅台", title: "Stock", summary: "", signal: "bullish", occurredAt: "2026-11-12T00:00:00Z", infoType: "price" }] as EventSummary[]);
}
describe("server workspace aggregation", () => {
  it("scopes events while retaining complete source-catalog metadata", async () => {
    setup();
    const result = await getWorkspaceData("stock-market");
    expect(result.events.map((e) => e.id)).toEqual(["e2"]);
    expect(result.themes.map((t) => t.id)).toEqual(["stock"]);
    expect(result.allThemes).toHaveLength(2);
    expect(result.allSources).toHaveLength(2);
    const index = await getWorkspaceIndex();
    expect(index.workspaces).toHaveLength(4);
    expect(index.workspaces.find((w) => w.id === "goods-supply")?.topEvents[0].id).toBe("e1");
  });
  it("shares concurrent reads and reloads after invalidation", async () => {
    setup();
    await Promise.all([getWorkspaceData("stock-market"), getWorkspaceIndex()]);
    expect(data.events).toHaveBeenCalledTimes(1);
    invalidateWorkspaceCache();
    await getWorkspaceIndex();
    expect(data.events).toHaveBeenCalledTimes(2);
  });
  it("does not let an older request refill an invalidated cache", async () => {
    setup();
    let finish!: (themes: ThemeSummary[]) => void;
    data.themes.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; })).mockResolvedValueOnce([]);
    const old = getWorkspaceIndex();
    invalidateWorkspaceCache();
    await getWorkspaceIndex();
    finish([{ id: "goods", name: "Laptop", type: "price", status: "active" }] as ThemeSummary[]);
    await old;
    expect((await getWorkspaceIndex()).workspaces.every((w) => w.summary.activeTopics === 0)).toBe(true);
    expect(data.themes).toHaveBeenCalledTimes(2);
  });
  it("expires the server cache after five seconds", async () => {
    vi.useFakeTimers(); setup();
    await getWorkspaceIndex();
    vi.advanceTimersByTime(5001);
    await getWorkspaceIndex();
    expect(data.events).toHaveBeenCalledTimes(2);
  });
});
