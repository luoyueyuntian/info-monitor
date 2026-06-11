export type RecentEventOperationAction =
  | "open"
  | "tracking"
  | "ignored"
  | "read"
  | "unread"
  | "bookmark"
  | "unbookmark";

export type RecentEventOperation = {
  action: RecentEventOperationAction;
  count: number;
  eventTitle?: string;
  infoType?: string | null;
  themeId?: string;
  themeName?: string;
  recordedAt: string;
};

export const recentEventOperationStorageKey = "info-monitor:recent-event-operation";

export function recordRecentEventOperation(operation: Omit<RecentEventOperation, "recordedAt">) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    recentEventOperationStorageKey,
    JSON.stringify({
      ...operation,
      recordedAt: new Date().toISOString(),
    } satisfies RecentEventOperation),
  );
}

export function loadRecentEventOperation() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(recentEventOperationStorageKey);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<RecentEventOperation>;

    if (
      typeof parsed.action !== "string" ||
      typeof parsed.count !== "number" ||
      typeof parsed.recordedAt !== "string"
    ) {
      return null;
    }

    return parsed as RecentEventOperation;
  } catch {
    return null;
  }
}

export function clearRecentEventOperation() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(recentEventOperationStorageKey);
}
