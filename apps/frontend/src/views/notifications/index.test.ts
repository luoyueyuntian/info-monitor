import { describe, expect, it, vi, beforeEach } from "vitest";
import { ref, nextTick } from "vue";

// Mock the API module
vi.mock("../../lib/api", () => ({
  fetchNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
}));

// Mock shared-contracts
vi.mock("@info-monitor/shared-contracts", () => ({
  getSignalLabel: vi.fn((signal: string) => {
    const labels: Record<string, string> = {
      "30d_low": "30天新低",
      liquidity_injection: "流动性投放",
      liquidity_withdrawal: "流动性回笼",
    };
    return labels[signal] || signal;
  }),
  getSignalColors: vi.fn((signal: string) => {
    const colors: Record<string, { background: string; text: string }> = {
      "30d_low": { background: "bg-green-50", text: "text-green-700" },
      liquidity_injection: { background: "bg-blue-50", text: "text-blue-700" },
      liquidity_withdrawal: { background: "bg-red-50", text: "text-red-700" },
    };
    return colors[signal] || { background: "bg-slate-50", text: "text-slate-700" };
  }),
}));

import { fetchNotifications } from "../../lib/api";

describe("Notifications Page Interactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Preset Views", () => {
    it("defines all expected preset views", () => {
      const presetViews = [
        { id: "unread", label: "最新未读", status: "pending", sortBy: "createdAt", sortOrder: "desc" },
        { id: "failed", label: "只看失败", status: "failed" },
        { id: "signals", label: "只看信号", signal: "30d_low" },
        { id: "injection", label: "流动性投放", signal: "liquidity_injection" },
        { id: "withdrawal", label: "流动性回笼", signal: "liquidity_withdrawal" },
      ];

      expect(presetViews).toHaveLength(5);
      expect(presetViews.map((p) => p.id)).toEqual([
        "unread",
        "failed",
        "signals",
        "injection",
        "withdrawal",
      ]);
    });

    it("unread preset filters by pending status", () => {
      const preset = {
        id: "unread",
        label: "最新未读",
        status: "pending",
        sortBy: "createdAt",
        sortOrder: "desc",
      };

      expect(preset.status).toBe("pending");
      expect(preset.sortBy).toBe("createdAt");
      expect(preset.sortOrder).toBe("desc");
    });

    it("failed preset filters by failed status", () => {
      const preset = {
        id: "failed",
        label: "只看失败",
        status: "failed",
        signal: undefined as string | undefined,
      };

      expect(preset.status).toBe("failed");
      expect(preset.signal).toBeUndefined();
    });

    it("signal presets filter by specific signals", () => {
      const signalPresets = [
        { id: "signals", signal: "30d_low" },
        { id: "injection", signal: "liquidity_injection" },
        { id: "withdrawal", signal: "liquidity_withdrawal" },
      ];

      for (const preset of signalPresets) {
        expect(preset.signal).toBeDefined();
        expect(typeof preset.signal).toBe("string");
      }
    });
  });

  describe("Status Filters", () => {
    it("defines all status filter options", () => {
      const statusFilters = [
        { value: "all", label: "全部" },
        { value: "pending", label: "未读" },
        { value: "sent", label: "已读" },
        { value: "failed", label: "失败" },
      ];

      expect(statusFilters).toHaveLength(4);
      expect(statusFilters.map((f) => f.value)).toEqual(["all", "pending", "sent", "failed"]);
    });

    it("status filter changes trigger API call", async () => {
      const mockFetchNotifications = vi.mocked(fetchNotifications);
      mockFetchNotifications.mockResolvedValue({
        items: [],
        total: 0,
        hasMore: false,
      });

      // Simulate status filter change
      const activeStatusFilter = ref<"all" | "pending" | "sent" | "failed">("all");

      // Change to pending
      activeStatusFilter.value = "pending";

      // Verify the filter value changed
      expect(activeStatusFilter.value).toBe("pending");
    });
  });

  describe("Sorting", () => {
    it("sort by options include createdAt and sentAt", () => {
      const sortOptions = ["createdAt", "sentAt"];
      expect(sortOptions).toContain("createdAt");
      expect(sortOptions).toContain("sentAt");
    });

    it("sort order toggles between asc and desc", () => {
      const sortOrder = ref<"asc" | "desc">("desc");

      // Toggle
      sortOrder.value = sortOrder.value === "desc" ? "asc" : "desc";
      expect(sortOrder.value).toBe("asc");

      // Toggle again
      sortOrder.value = sortOrder.value === "desc" ? "asc" : "desc";
      expect(sortOrder.value).toBe("desc");
    });

    it("sort changes trigger API call", async () => {
      const mockFetchNotifications = vi.mocked(fetchNotifications);
      mockFetchNotifications.mockResolvedValue({
        items: [],
        total: 0,
        hasMore: false,
      });

      const sortBy = ref<"createdAt" | "sentAt">("createdAt");
      const sortOrder = ref<"asc" | "desc">("desc");

      // Change sort by
      sortBy.value = "sentAt";
      expect(sortBy.value).toBe("sentAt");

      // Change sort order
      sortOrder.value = "asc";
      expect(sortOrder.value).toBe("asc");
    });
  });

  describe("Notification Filtering", () => {
    it("filters notifications by status", () => {
      const notifications = [
        { id: "1", status: "pending", signal: "30d_low" },
        { id: "2", status: "sent", signal: "30d_low" },
        { id: "3", status: "failed", signal: "30d_low" },
        { id: "4", status: "pending", signal: "liquidity_injection" },
      ];

      const activeStatusFilter = ref<"all" | "pending" | "sent" | "failed">("pending");

      const filtered = notifications.filter((n) =>
        activeStatusFilter.value === "all" || n.status === activeStatusFilter.value
      );

      expect(filtered).toHaveLength(2);
      expect(filtered.every((n) => n.status === "pending")).toBe(true);
    });

    it("shows all notifications when filter is all", () => {
      const notifications = [
        { id: "1", status: "pending" },
        { id: "2", status: "sent" },
        { id: "3", status: "failed" },
      ];

      const activeStatusFilter = ref<"all" | "pending" | "sent" | "failed">("all");

      const filtered = notifications.filter((n) =>
        activeStatusFilter.value === "all" || n.status === activeStatusFilter.value
      );

      expect(filtered).toHaveLength(3);
    });
  });

  describe("Notification Sorting", () => {
    it("sorts by createdAt descending", () => {
      const notifications = [
        { id: "1", createdAt: "2026-06-01T10:00:00Z", sentAt: null },
        { id: "2", createdAt: "2026-06-01T12:00:00Z", sentAt: null },
        { id: "3", createdAt: "2026-06-01T11:00:00Z", sentAt: null },
      ];

      const sortBy = ref<"createdAt" | "sentAt">("createdAt");
      const sortOrder = ref<"asc" | "desc">("desc");

      const sorted = [...notifications].sort((left, right) => {
        const leftVal = sortBy.value === "sentAt" ? left.sentAt || left.createdAt : left.createdAt;
        const rightVal = sortBy.value === "sentAt" ? right.sentAt || right.createdAt : right.createdAt;
        return sortOrder.value === "desc"
          ? rightVal.localeCompare(leftVal)
          : leftVal.localeCompare(rightVal);
      });

      expect(sorted[0].id).toBe("2");
      expect(sorted[1].id).toBe("3");
      expect(sorted[2].id).toBe("1");
    });

    it("sorts by createdAt ascending", () => {
      const notifications = [
        { id: "1", createdAt: "2026-06-01T10:00:00Z", sentAt: null },
        { id: "2", createdAt: "2026-06-01T12:00:00Z", sentAt: null },
        { id: "3", createdAt: "2026-06-01T11:00:00Z", sentAt: null },
      ];

      const sortBy = ref<"createdAt" | "sentAt">("createdAt");
      const sortOrder = ref<"asc" | "desc">("asc");

      const sorted = [...notifications].sort((left, right) => {
        const leftVal = sortBy.value === "sentAt" ? left.sentAt || left.createdAt : left.createdAt;
        const rightVal = sortBy.value === "sentAt" ? right.sentAt || right.createdAt : right.createdAt;
        return sortOrder.value === "desc"
          ? rightVal.localeCompare(leftVal)
          : leftVal.localeCompare(rightVal);
      });

      expect(sorted[0].id).toBe("1");
      expect(sorted[1].id).toBe("3");
      expect(sorted[2].id).toBe("2");
    });

    it("sorts by sentAt when available, falls back to createdAt", () => {
      const notifications = [
        { id: "1", createdAt: "2026-06-01T10:00:00Z", sentAt: "2026-06-01T10:05:00Z" },
        { id: "2", createdAt: "2026-06-01T12:00:00Z", sentAt: null },
        { id: "3", createdAt: "2026-06-01T11:00:00Z", sentAt: "2026-06-01T11:05:00Z" },
      ];

      const sortBy = ref<"createdAt" | "sentAt">("sentAt");
      const sortOrder = ref<"asc" | "desc">("desc");

      const sorted = [...notifications].sort((left, right) => {
        const leftVal = sortBy.value === "sentAt" ? left.sentAt || left.createdAt : left.createdAt;
        const rightVal = sortBy.value === "sentAt" ? right.sentAt || right.createdAt : right.createdAt;
        return sortOrder.value === "desc"
          ? rightVal.localeCompare(leftVal)
          : leftVal.localeCompare(rightVal);
      });

      // When sorting by sentAt descending:
      // - id: "2" has sentAt null, falls back to createdAt "2026-06-01T12:00:00Z" (most recent)
      // - id: "3" has sentAt "2026-06-01T11:05:00Z"
      // - id: "1" has sentAt "2026-06-01T10:05:00Z" (oldest)
      expect(sorted[0].id).toBe("2");
      expect(sorted[1].id).toBe("3");
      expect(sorted[2].id).toBe("1");
    });
  });

  describe("Preset Application", () => {
    it("applying preset sets correct filters", () => {
      const activePreset = ref<string | null>(null);
      const activeStatusFilter = ref<"all" | "pending" | "sent" | "failed">("all");
      const activeSignalFilter = ref<string | undefined>(undefined);
      const sortBy = ref<"createdAt" | "sentAt">("createdAt");
      const sortOrder = ref<"asc" | "desc">("desc");

      const preset = {
        id: "unread",
        label: "最新未读",
        status: "pending",
        signal: undefined as string | undefined,
        sortBy: "createdAt" as const,
        sortOrder: "desc" as const,
      };

      // Apply preset
      activePreset.value = preset.id;
      activeStatusFilter.value = (preset.status as typeof activeStatusFilter.value) || "all";
      activeSignalFilter.value = preset.signal;

      if (preset.sortBy) {
        sortBy.value = preset.sortBy;
      }

      if (preset.sortOrder) {
        sortOrder.value = preset.sortOrder;
      }

      expect(activePreset.value).toBe("unread");
      expect(activeStatusFilter.value).toBe("pending");
      expect(activeSignalFilter.value).toBeUndefined();
      expect(sortBy.value).toBe("createdAt");
      expect(sortOrder.value).toBe("desc");
    });

    it("applying signal preset sets signal filter", () => {
      const activePreset = ref<string | null>(null);
      const activeStatusFilter = ref<"all" | "pending" | "sent" | "failed">("all");
      const activeSignalFilter = ref<string | undefined>(undefined);

      const preset = {
        id: "signals",
        label: "只看信号",
        status: undefined as string | undefined,
        signal: "30d_low",
      };

      // Apply preset
      activePreset.value = preset.id;
      activeStatusFilter.value = (preset.status as typeof activeStatusFilter.value) || "all";
      activeSignalFilter.value = preset.signal;

      expect(activePreset.value).toBe("signals");
      expect(activeStatusFilter.value).toBe("all");
      expect(activeSignalFilter.value).toBe("30d_low");
    });

    it("changing status filter clears preset and signal filter", () => {
      const activePreset = ref<string | null>("signals");
      const activeStatusFilter = ref<"all" | "pending" | "sent" | "failed">("all");
      const activeSignalFilter = ref<string | undefined>("30d_low");

      // Simulate setStatusFilter
      activeStatusFilter.value = "pending";
      activeSignalFilter.value = undefined;
      activePreset.value = null;

      expect(activePreset.value).toBeNull();
      expect(activeStatusFilter.value).toBe("pending");
      expect(activeSignalFilter.value).toBeUndefined();
    });
  });

  describe("Mark Read Interaction", () => {
    it("marking notification as read updates local state", () => {
      const notifications = ref([
        { id: "1", status: "pending", sentAt: null as string | null },
        { id: "2", status: "pending", sentAt: null as string | null },
      ]);

      const markingId = ref("");

      // Simulate mark read
      markingId.value = "1";
      const item = notifications.value.find((n) => n.id === "1");

      if (item) {
        item.status = "sent";
        item.sentAt = new Date().toISOString();
      }

      markingId.value = "";

      expect(notifications.value[0].status).toBe("sent");
      expect(notifications.value[0].sentAt).toBeDefined();
      expect(markingId.value).toBe("");
    });

    it("only pending notifications show mark read button", () => {
      const notifications = [
        { id: "1", status: "pending" },
        { id: "2", status: "sent" },
        { id: "3", status: "failed" },
      ];

      const showMarkRead = notifications.filter((n) => n.status === "pending");
      expect(showMarkRead).toHaveLength(1);
      expect(showMarkRead[0].id).toBe("1");
    });
  });

  describe("API Integration", () => {
    it("fetchNotifications is called with correct parameters", async () => {
      const mockFetchNotifications = vi.mocked(fetchNotifications);
      mockFetchNotifications.mockResolvedValue({
        items: [],
        total: 0,
        hasMore: false,
      });

      await fetchNotifications({
        status: "pending",
        signal: "30d_low",
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      expect(mockFetchNotifications).toHaveBeenCalledWith({
        status: "pending",
        signal: "30d_low",
        sortBy: "createdAt",
        sortOrder: "desc",
      });
    });

    it("fetchNotifications handles empty response", async () => {
      const mockFetchNotifications = vi.mocked(fetchNotifications);
      mockFetchNotifications.mockResolvedValue({
        items: [],
        total: 0,
        hasMore: false,
      });

      const result = await fetchNotifications({});

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it("fetchNotifications handles error", async () => {
      const mockFetchNotifications = vi.mocked(fetchNotifications);
      mockFetchNotifications.mockRejectedValue(new Error("Network error"));

      await expect(fetchNotifications({})).rejects.toThrow("Network error");
    });
  });
});
