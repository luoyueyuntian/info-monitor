import { effectScope, nextTick, ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWorkspaceData } from "./useWorkspaceData";
import type { WorkspaceId } from "@info-monitor/shared-contracts";
const api = vi.hoisted(() => ({ fetchWorkspaceData: vi.fn(), fetchThemes: vi.fn(async () => []), fetchEvents: vi.fn(async () => []), fetchSourceStatuses: vi.fn(async () => []) }));
vi.mock("../../../lib/api", () => api);
beforeEach(() => { vi.clearAllMocks(); });
function response(id: string) { return { themes: [{ id }], events: [{ id: `event-${id}`, themeId: id }], sources: [{ id: `source-${id}` }], allThemes: [{ id: "goods" }, { id: "stock" }], allSources: [{ id: "one" }, { id: "two" }] }; }
describe("scoped workspace loading", () => {
  it("loads only scoped events and keeps global catalog metadata", async () => {
    api.fetchWorkspaceData.mockResolvedValue(response("goods"));
    const scope = effectScope();
    const data = scope.run(() => useWorkspaceData("goods-supply"))!;
    await data.load();
    expect(data.dataset.value.events.map((e) => e.id)).toEqual(["event-goods"]);
    expect(data.allThemes.value).toHaveLength(2);
    expect(data.allSources.value).toHaveLength(2);
    expect(api.fetchEvents).not.toHaveBeenCalled();
    scope.stop();
  });
  it("reloads on workspace changes and ignores the previous response", async () => {
    let complete!: (value: unknown) => void;
    api.fetchWorkspaceData.mockImplementationOnce(() => new Promise((resolve) => { complete = resolve; })).mockResolvedValueOnce(response("stock"));
    const id = ref<WorkspaceId>("goods-supply");
    const scope = effectScope();
    const data = scope.run(() => useWorkspaceData(id))!;
    const old = data.load();
    id.value = "stock-market";
    await nextTick(); await Promise.resolve(); await Promise.resolve();
    complete(response("goods"));
    await old;
    expect(data.dataset.value.events.map((e) => e.id)).toEqual(["event-stock"]);
    scope.stop();
  });
  it("keeps catalog metadata available while switching workspaces", async () => {
    let finish!: (value: unknown) => void;
    api.fetchWorkspaceData.mockResolvedValueOnce(response("goods")).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const id = ref<WorkspaceId>("goods-supply");
    const scope = effectScope();
    const data = scope.run(() => useWorkspaceData(id))!;
    await data.load();
    id.value = "stock-market";
    await nextTick();
    expect(data.dataset.value.events).toHaveLength(0);
    expect(data.allThemes.value).toHaveLength(2);
    expect(data.allSources.value).toHaveLength(2);
    finish(response("stock"));
    await Promise.resolve(); await Promise.resolve();
    scope.stop();
  });
});
