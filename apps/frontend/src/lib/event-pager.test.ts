import { describe, expect, it, vi } from "vitest";
import type { EventPage } from "@info-monitor/shared-contracts";
import { createEventPager } from "./event-pager";

describe("event page navigation", () => {
  it("keeps cursor history and returns to the previous page", async () => {
    const load = vi.fn().mockResolvedValueOnce({ items: [{ id: "first" }], total: 80, nextCursor: "next" })
      .mockResolvedValueOnce({ items: [{ id: "second" }], total: 80, nextCursor: null })
      .mockResolvedValueOnce({ items: [{ id: "first" }], total: 80, nextCursor: "next" });
    const pager = createEventPager(load);
    await pager.reset({ status: "open" });
    expect(pager.items.value).toHaveLength(1);
    await pager.next();
    expect(load.mock.calls[1][0]).toMatchObject({ status: "open", limit: 50, cursor: "next" });
    expect(pager.page.value).toBe(2);
    expect(pager.canNext.value).toBe(false);
    await pager.previous();
    expect(pager.page.value).toBe(1);
  });
  it("ignores stale responses even if the loader ignores cancellation", async () => {
    let finish!: (page: EventPage) => void;
    const load = vi.fn().mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }))
      .mockResolvedValueOnce({ items: [], total: 0, nextCursor: null });
    const pager = createEventPager(load);
    const first = pager.reset({ q: "old" });
    await pager.reset({ q: "new" });
    expect(load.mock.calls[0][1].aborted).toBe(true);
    finish({ items: [], total: 99, nextCursor: "stale" });
    await first;
    expect(pager.total.value).toBe(0);
    expect(pager.canNext.value).toBe(false);
  });
  it("shows failures without advancing to a missing page", async () => {
    const load = vi.fn().mockResolvedValueOnce({ items: [], total: 100, nextCursor: "next" })
      .mockRejectedValueOnce(new Error("offline"));
    const pager = createEventPager(load);
    await pager.reset({});
    await pager.next();
    expect(pager.page.value).toBe(1);
    expect(pager.error.value).toBe("offline");
    expect(pager.loading.value).toBe(false);
    pager.dispose();
    expect(load.mock.calls[1][1].aborted).toBe(true);
  });
});
