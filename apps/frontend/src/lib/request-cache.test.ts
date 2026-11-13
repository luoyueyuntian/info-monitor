import { afterEach, describe, expect, it, vi } from "vitest";
import { cachedRead, invalidateReadCache } from "./request-cache";

afterEach(() => { invalidateReadCache(); vi.useRealTimers(); });

describe("shared reads", () => {
  it("coalesces concurrent loads and returns independent values", async () => {
    const load = vi.fn(async () => ({ items: [1] }));
    const [a, b] = await Promise.all([cachedRead("a", load), cachedRead("a", load)]);
    a.items.push(2);
    expect(b.items).toEqual([1]);
    expect((await cachedRead("a", load)).items).toEqual([1]);
    expect(load).toHaveBeenCalledTimes(1);
  });
  it("expires cached data and retries failures", async () => {
    vi.useFakeTimers();
    const load = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue({ ok: true });
    await expect(cachedRead("a", load, 100)).rejects.toThrow("offline");
    await cachedRead("a", load, 100);
    vi.advanceTimersByTime(101);
    await cachedRead("a", load, 100);
    expect(load).toHaveBeenCalledTimes(3);
  });
  it("does not let a stale in-flight read refill an invalidated cache", async () => {
    let finish!: (value: number) => void;
    const old = cachedRead("a", () => new Promise<number>((resolve) => { finish = resolve; }));
    await Promise.resolve();
    invalidateReadCache();
    expect(await cachedRead("a", async () => 2)).toBe(2);
    finish(1);
    expect(await old).toBe(1);
    expect(await cachedRead("a", async () => 3)).toBe(2);
  });
});
