import { describe, expect, it } from "vitest";

import {
  getSignalLabel,
  getSignalColors,
  getSignalPriority,
  shouldNotify,
  renderNotification,
  getNotificationStatusColors,
  getEventStatusColors,
  SIGNAL_COLORS,
  SIGNAL_PRIORITIES,
  SIGNAL_LABELS,
  NOTIFICATION_TEMPLATES,
  NOTIFICATION_STATUS_COLORS,
  EVENT_STATUS_COLORS,
} from "@info-monitor/shared-contracts";

describe("notification-theme", () => {
  describe("getSignalLabel", () => {
    it("returns label for known signals", () => {
      expect(getSignalLabel("30d_low")).toBe("价格新低");
      expect(getSignalLabel("bullish")).toBe("利好信号");
      expect(getSignalLabel("bearish")).toBe("利空信号");
      expect(getSignalLabel("liquidity_injection")).toBe("流动性投放");
      expect(getSignalLabel("liquidity_withdrawal")).toBe("流动性回笼");
      expect(getSignalLabel("new_announcement")).toBe("新公告");
      expect(getSignalLabel("content_update")).toBe("内容更新");
      expect(getSignalLabel("new_financial_event")).toBe("金融事件");
      expect(getSignalLabel("neutral")).toBe("中性");
    });

    it("returns signal string for unknown signals", () => {
      expect(getSignalLabel("unknown_signal")).toBe("unknown_signal");
      expect(getSignalLabel("")).toBe("");
    });

    it("all signals in SIGNAL_LABELS have labels", () => {
      for (const signal of Object.keys(SIGNAL_LABELS)) {
        const label = getSignalLabel(signal);
        expect(label).toBeDefined();
        expect(typeof label).toBe("string");
        expect(label.length).toBeGreaterThan(0);
      }
    });
  });

  describe("getSignalColors", () => {
    it("returns colors for known signals", () => {
      const lowColors = getSignalColors("30d_low");
      expect(lowColors).toEqual(SIGNAL_COLORS["30d_low"]);
      expect(lowColors.background).toBe("bg-emerald-50");
      expect(lowColors.text).toBe("text-emerald-700");

      const injectionColors = getSignalColors("liquidity_injection");
      expect(injectionColors).toEqual(SIGNAL_COLORS.liquidity_injection);

      const withdrawalColors = getSignalColors("liquidity_withdrawal");
      expect(withdrawalColors).toEqual(SIGNAL_COLORS.liquidity_withdrawal);
    });

    it("returns neutral colors for unknown signals", () => {
      const colors = getSignalColors("unknown_signal");
      expect(colors).toEqual(SIGNAL_COLORS.neutral);
      expect(colors.background).toBe("bg-slate-50");
      expect(colors.text).toBe("text-slate-600");
    });

    it("all signals have valid color schemes", () => {
      for (const [signal, colors] of Object.entries(SIGNAL_COLORS)) {
        expect(colors.background).toBeDefined();
        expect(colors.text).toBeDefined();
        expect(colors.border).toBeDefined();
        expect(colors.dot).toBeDefined();

        // All should be Tailwind classes
        expect(colors.background).toMatch(/^bg-/);
        expect(colors.text).toMatch(/^text-/);
        expect(colors.border).toMatch(/^border-/);
        expect(colors.dot).toMatch(/^bg-/);
      }
    });

    it("positive signals use emerald colors", () => {
      const positiveSignals = ["30d_low", "bullish", "liquidity_injection"];

      for (const signal of positiveSignals) {
        const colors = getSignalColors(signal);
        expect(colors.background).toContain("emerald");
        expect(colors.text).toContain("emerald");
      }
    });

    it("negative signals use rose colors", () => {
      const negativeSignals = ["bearish", "liquidity_withdrawal"];

      for (const signal of negativeSignals) {
        const colors = getSignalColors(signal);
        expect(colors.background).toContain("rose");
        expect(colors.text).toContain("rose");
      }
    });
  });

  describe("getSignalPriority", () => {
    it("returns priority for known signals", () => {
      const lowPriority = getSignalPriority("30d_low");
      expect(lowPriority.level).toBe("high");
      expect(lowPriority.weight).toBe(10);
      expect(lowPriority.emoji).toBe("📉");

      const injectionPriority = getSignalPriority("liquidity_injection");
      expect(injectionPriority.level).toBe("high");
      expect(injectionPriority.weight).toBe(8);

      const announcementPriority = getSignalPriority("new_announcement");
      expect(announcementPriority.level).toBe("medium");
      expect(announcementPriority.weight).toBe(5);

      const contentPriority = getSignalPriority("content_update");
      expect(contentPriority.level).toBe("low");
      expect(contentPriority.weight).toBe(2);
    });

    it("returns unknown priority for unknown signals", () => {
      const priority = getSignalPriority("unknown_signal");
      expect(priority.level).toBe("low");
      expect(priority.weight).toBe(0);
      expect(priority.emoji).toBe("ℹ️");
    });

    it("all signals have valid priorities", () => {
      for (const [signal, priority] of Object.entries(SIGNAL_PRIORITIES)) {
        expect(["high", "medium", "low"]).toContain(priority.level);
        expect(typeof priority.weight).toBe("number");
        expect(priority.weight).toBeGreaterThanOrEqual(0);
        expect(typeof priority.emoji).toBe("string");
      }
    });

    it("high priority signals have higher weights", () => {
      const highPriority = getSignalPriority("30d_low");
      const mediumPriority = getSignalPriority("new_announcement");
      const lowPriority = getSignalPriority("content_update");

      expect(highPriority.weight).toBeGreaterThan(mediumPriority.weight);
      expect(mediumPriority.weight).toBeGreaterThan(lowPriority.weight);
    });
  });

  describe("shouldNotify", () => {
    it("returns true for high priority signals with low filter", () => {
      expect(shouldNotify("30d_low", "low")).toBe(true);
      expect(shouldNotify("bullish", "low")).toBe(true);
      expect(shouldNotify("bearish", "low")).toBe(true);
    });

    it("returns true for high priority signals with medium filter", () => {
      expect(shouldNotify("30d_low", "medium")).toBe(true);
      expect(shouldNotify("liquidity_injection", "medium")).toBe(true);
    });

    it("returns true for high priority signals with high filter", () => {
      expect(shouldNotify("30d_low", "high")).toBe(true);
      expect(shouldNotify("bullish", "high")).toBe(true);
    });

    it("returns false for low priority signals with high filter", () => {
      expect(shouldNotify("content_update", "high")).toBe(false);
      expect(shouldNotify("neutral", "high")).toBe(false);
    });

    it("returns false for medium priority signals with high filter", () => {
      expect(shouldNotify("new_announcement", "high")).toBe(false);
      expect(shouldNotify("new_financial_event", "high")).toBe(false);
    });

    it("returns true for medium priority signals with medium filter", () => {
      expect(shouldNotify("new_announcement", "medium")).toBe(true);
      expect(shouldNotify("new_financial_event", "medium")).toBe(true);
    });

    it("returns true for all signals with low filter", () => {
      const allSignals = Object.keys(SIGNAL_PRIORITIES);

      for (const signal of allSignals) {
        expect(shouldNotify(signal, "low")).toBe(true);
      }
    });

    it("defaults to low filter when not specified", () => {
      expect(shouldNotify("content_update")).toBe(true);
      expect(shouldNotify("neutral")).toBe(true);
    });
  });

  describe("renderNotification", () => {
    it("renders 30d_low template", () => {
      const result = renderNotification("30d_low", {
        spec: "16G+512G",
        price: "3999",
        previousPrice: "4288",
      });

      expect(result.title).toBe("30天新低: 16G+512G");
      expect(result.summary).toContain("16G+512G");
      expect(result.summary).toContain("3999");
      expect(result.summary).toContain("4288");
    });

    it("renders liquidity_injection template", () => {
      const result = renderNotification("liquidity_injection", {
        operationType: "逆回购",
        amount: "980",
        termDays: "7",
      });

      expect(result.title).toBe("流动性投放: 逆回购");
      expect(result.summary).toContain("逆回购");
      expect(result.summary).toContain("980");
      expect(result.summary).toContain("7");
    });

    it("renders liquidity_withdrawal template", () => {
      const result = renderNotification("liquidity_withdrawal", {
        operationType: "正回购",
      });

      expect(result.title).toBe("流动性回笼: 正回购");
      expect(result.summary).toContain("正回购");
    });

    it("renders new_announcement template", () => {
      const result = renderNotification("new_announcement", {
        title: "货币政策报告",
        publisher: "中国人民银行",
      });

      expect(result.title).toBe("新公告: 货币政策报告");
      expect(result.summary).toContain("中国人民银行");
    });

    it("renders content_update template", () => {
      const result = renderNotification("content_update", {
        objectName: "Figma",
        updateType: "功能发布",
      });

      expect(result.title).toBe("内容更新: Figma");
      expect(result.summary).toContain("Figma");
      expect(result.summary).toContain("功能发布");
    });

    it("renders bullish template", () => {
      const result = renderNotification("bullish", {
        title: "利好消息",
        summary: "这是一条利好消息",
      });

      expect(result.title).toBe("利好信号: 利好消息");
      expect(result.summary).toBe("这是一条利好消息");
    });

    it("renders bearish template", () => {
      const result = renderNotification("bearish", {
        title: "利空消息",
        summary: "这是一条利空消息",
      });

      expect(result.title).toBe("利空信号: 利空消息");
      expect(result.summary).toBe("这是一条利空消息");
    });

    it("falls back for unknown signals", () => {
      const result = renderNotification("unknown_signal", {
        title: "自定义标题",
        summary: "自定义摘要",
      });

      expect(result.title).toBe("自定义标题");
      expect(result.summary).toBe("自定义摘要");
    });

    it("falls back to default title for unknown signals without title", () => {
      const result = renderNotification("unknown_signal", {});

      expect(result.title).toBe("新通知");
      expect(result.summary).toBe("");
    });

    it("preserves unmatched variables as-is", () => {
      const result = renderNotification("30d_low", {
        spec: "16G+512G",
        // price and previousPrice not provided
      });

      expect(result.title).toBe("30天新低: 16G+512G");
      expect(result.summary).toContain("{{price}}");
      expect(result.summary).toContain("{{previousPrice}}");
    });

    it("all templates have title and summary", () => {
      for (const [signal, template] of Object.entries(NOTIFICATION_TEMPLATES)) {
        expect(template.title).toBeDefined();
        expect(template.summary).toBeDefined();
        expect(typeof template.title).toBe("string");
        expect(typeof template.summary).toBe("string");
      }
    });
  });

  describe("getNotificationStatusColors", () => {
    it("returns colors for known statuses", () => {
      const pendingColors = getNotificationStatusColors("pending");
      expect(pendingColors).toEqual(NOTIFICATION_STATUS_COLORS.pending);
      expect(pendingColors.background).toBe("bg-amber-50");

      const sentColors = getNotificationStatusColors("sent");
      expect(sentColors).toEqual(NOTIFICATION_STATUS_COLORS.sent);

      const failedColors = getNotificationStatusColors("failed");
      expect(failedColors).toEqual(NOTIFICATION_STATUS_COLORS.failed);
      expect(failedColors.background).toBe("bg-rose-50");
    });

    it("returns pending colors for unknown statuses", () => {
      const colors = getNotificationStatusColors("unknown");
      expect(colors).toEqual(NOTIFICATION_STATUS_COLORS.pending);
    });

    it("all notification statuses have valid colors", () => {
      for (const [status, colors] of Object.entries(NOTIFICATION_STATUS_COLORS)) {
        expect(colors.background).toBeDefined();
        expect(colors.text).toBeDefined();
        expect(colors.background).toMatch(/^bg-/);
        expect(colors.text).toMatch(/^text-/);
      }
    });
  });

  describe("getEventStatusColors", () => {
    it("returns colors for known statuses", () => {
      const openColors = getEventStatusColors("open");
      expect(openColors).toEqual(EVENT_STATUS_COLORS.open);
      expect(openColors.background).toBe("bg-blue-50");

      const trackingColors = getEventStatusColors("tracking");
      expect(trackingColors).toEqual(EVENT_STATUS_COLORS.tracking);
      expect(trackingColors.background).toBe("bg-amber-50");

      const ignoredColors = getEventStatusColors("ignored");
      expect(ignoredColors).toEqual(EVENT_STATUS_COLORS.ignored);

      const resolvedColors = getEventStatusColors("resolved");
      expect(resolvedColors).toEqual(EVENT_STATUS_COLORS.resolved);
      expect(resolvedColors.background).toBe("bg-emerald-50");
    });

    it("returns open colors for unknown statuses", () => {
      const colors = getEventStatusColors("unknown");
      expect(colors).toEqual(EVENT_STATUS_COLORS.open);
    });

    it("all event statuses have valid colors", () => {
      for (const [status, colors] of Object.entries(EVENT_STATUS_COLORS)) {
        expect(colors.background).toBeDefined();
        expect(colors.text).toBeDefined();
        expect(colors.background).toMatch(/^bg-/);
        expect(colors.text).toMatch(/^text-/);
      }
    });
  });

  describe("Data consistency", () => {
    it("all signals in SIGNAL_COLORS are also in SIGNAL_PRIORITIES", () => {
      const colorSignals = Object.keys(SIGNAL_COLORS);
      const prioritySignals = Object.keys(SIGNAL_PRIORITIES);

      for (const signal of colorSignals) {
        expect(prioritySignals).toContain(signal);
      }
    });

    it("all signals in SIGNAL_PRIORITIES are also in SIGNAL_COLORS", () => {
      const colorSignals = Object.keys(SIGNAL_COLORS);
      const prioritySignals = Object.keys(SIGNAL_PRIORITIES);

      for (const signal of prioritySignals) {
        expect(colorSignals).toContain(signal);
      }
    });

    it("all signals in SIGNAL_LABELS are also in SIGNAL_COLORS", () => {
      const colorSignals = Object.keys(SIGNAL_COLORS);
      const labelSignals = Object.keys(SIGNAL_LABELS);

      for (const signal of labelSignals) {
        expect(colorSignals).toContain(signal);
      }
    });

    it("templates exist for high priority signals", () => {
      const highPrioritySignals = Object.entries(SIGNAL_PRIORITIES)
        .filter(([, priority]) => priority.level === "high")
        .map(([signal]) => signal);

      for (const signal of highPrioritySignals) {
        // High priority signals should have templates (except neutral variants)
        if (signal !== "neutral") {
          expect(NOTIFICATION_TEMPLATES[signal]).toBeDefined();
        }
      }
    });
  });
});
