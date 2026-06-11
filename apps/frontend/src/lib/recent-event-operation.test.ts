import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearRecentEventOperation,
  loadRecentEventOperation,
  recordRecentEventOperation,
  recentEventOperationStorageKey,
} from "./recent-event-operation";

describe("recent-event-operation", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem(key: string) {
          return store.has(key) ? store.get(key)! : null;
        },
        setItem(key: string, value: string) {
          store.set(key, value);
        },
        removeItem(key: string) {
          store.delete(key);
        },
        clear() {
          store.clear();
        },
      },
    });
    window.localStorage.clear();
    vi.useRealTimers();
  });

  it("records and loads the latest operation", () => {
    const now = new Date("2026-06-11T10:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);

    recordRecentEventOperation({
      action: "tracking",
      count: 1,
      themeId: "theme_1",
      themeName: "Theme One",
      eventTitle: "Price low",
      infoType: "price",
    });

    expect(loadRecentEventOperation()).toEqual({
      action: "tracking",
      count: 1,
      themeId: "theme_1",
      themeName: "Theme One",
      eventTitle: "Price low",
      infoType: "price",
      recordedAt: now.toISOString(),
    });
  });

  it("clears stored operation", () => {
    window.localStorage.setItem(
      recentEventOperationStorageKey,
      JSON.stringify({
        action: "ignored",
        count: 1,
        recordedAt: "2026-06-11T10:00:00.000Z",
      }),
    );

    clearRecentEventOperation();

    expect(loadRecentEventOperation()).toBeNull();
  });

  it("returns null for malformed storage", () => {
    window.localStorage.setItem(recentEventOperationStorageKey, JSON.stringify({ foo: "bar" }));

    expect(loadRecentEventOperation()).toBeNull();
  });
});
