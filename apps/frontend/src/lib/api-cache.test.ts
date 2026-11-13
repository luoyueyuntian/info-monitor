// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchEvents, fetchThemes, updateEvent } from "./api";
import { invalidateReadCache } from "./request-cache";

afterEach(() => { invalidateReadCache(); vi.unstubAllGlobals(); });

describe("cached API reads", () => {
  it("shares theme reads and invalidates them after an event write", async () => {
    const fetchMock = vi.fn().mockImplementation(async (_url, init) => new Response(JSON.stringify(init?.method === "PATCH" ? { id: "e" } : [{ id: "t" }]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await Promise.all([fetchThemes(), fetchThemes()]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await updateEvent("e", { isRead: true });
    await fetchThemes();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
  it("uses complete compact events rather than truncating global workspace data", async () => {
    const events = Array.from({ length: 120 }, (_, n) => ({ id: `e${n}` }));
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(events), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchEvents()).toHaveLength(120);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/events?view=compact");
  });
});
