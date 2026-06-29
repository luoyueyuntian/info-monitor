// @vitest-environment jsdom
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

import SourceHealthView from "./health.vue";

const apiMocks = vi.hoisted(() => ({
  fetchSourceHealthStats: vi.fn(),
}));

vi.mock("../../lib/api", () => ({
  fetchSourceHealthStats: apiMocks.fetchSourceHealthStats,
}));

describe("sources health dashboard", () => {
  it("renders the system health dashboard with log entry links", async () => {
    apiMocks.fetchSourceHealthStats.mockResolvedValue({
      totalSources: 3,
      activeSources: 2,
      healthySources: 1,
      warningSources: 1,
      pausedSources: 1,
      healthRate: 0.72,
      overallScore: 78,
      fetchAvailability: 0.5,
      ingestionAvailability: 0.5,
      recentRuns: {
        total: 6,
        successful: 4,
        failed: 2,
        successRate: 0.67,
      },
      averageRunDuration: 1800,
      backlog: {
        pendingRuns: 1,
        runningRuns: 0,
        oldestPendingAge: "PT15M",
      },
      recentErrors: [
        {
          sourceId: "source-2",
          sourceName: "异常来源",
          errorMessage: "页面结构变化",
          occurredAt: "2026-06-26T02:00:00.000Z",
        },
      ],
      recentExceptions: [
        {
          errorMessage: "页面结构变化",
          count: 2,
          lastOccurredAt: "2026-06-26T02:00:00.000Z",
          sourceIds: ["source-2"],
        },
      ],
      systemChecks: [
        {
          id: "fetch",
          label: "抓取链路",
          status: "warning",
          summary: "1 / 2 个活跃渠道最近一次抓取成功。",
          description: "异常渠道需要优先检查上游可达性和页面结构。",
          healthyCount: 1,
          warningCount: 1,
          pendingCount: 0,
        },
        {
          id: "ingest",
          label: "入库链路",
          status: "warning",
          summary: "1 个渠道抓到了快照，但没有成功入库记录。",
          description: "优先排查标准化和解析规则是否失效。",
          healthyCount: 1,
          warningCount: 1,
          pendingCount: 0,
        },
        {
          id: "output",
          label: "输出链路",
          status: "healthy",
          summary: "规则执行链路整体可用。",
          description: "没有发现明显的检测或事件落地异常。",
          healthyCount: 2,
          warningCount: 0,
          pendingCount: 0,
        },
        {
          id: "schedule",
          label: "调度队列",
          status: "pending",
          summary: "当前仍有 1 个任务排队。",
          description: "如果积压持续扩大，需要回看 worker 处理能力。",
          healthyCount: 0,
          warningCount: 0,
          pendingCount: 1,
        },
      ],
      sourceDetails: [
        {
          id: "source-1",
          name: "稳定来源",
          themeName: "主题 A",
          status: "healthy",
          isPaused: false,
          latestRunStatus: "completed",
          latestRunAt: "2026-06-26T01:00:00.000Z",
          latestSuccessAt: "2026-06-26T01:00:00.000Z",
          latestFailureAt: null,
          lastErrorMessage: null,
          runCount24h: 3,
          successCount24h: 3,
          failureCount24h: 0,
          healthScore: 92,
          issueSummary: null,
          latestSnapshotCount: 1,
          latestRecordCount: 4,
          latestChangeCount: 1,
          latestEventCount: 1,
          pipeline: {
            fetch: { status: "healthy", label: "抓取正常", detail: "最近一次已成功抓到快照。" },
            ingest: { status: "healthy", label: "入库正常", detail: "最近一次已成功写入记录。" },
            output: { status: "healthy", label: "输出正常", detail: "最近一次规则链路已完成。" },
          },
        },
        {
          id: "source-2",
          name: "异常来源",
          themeName: "主题 B",
          status: "warning",
          isPaused: false,
          latestRunStatus: "failed",
          latestRunAt: "2026-06-26T02:00:00.000Z",
          latestSuccessAt: "2026-06-25T02:00:00.000Z",
          latestFailureAt: "2026-06-26T02:00:00.000Z",
          lastErrorMessage: "页面结构变化",
          runCount24h: 3,
          successCount24h: 1,
          failureCount24h: 2,
          healthScore: 48,
          issueSummary: "最近抓取失败",
          latestSnapshotCount: 1,
          latestRecordCount: 0,
          latestChangeCount: 0,
          latestEventCount: 0,
          pipeline: {
            fetch: { status: "healthy", label: "抓取完成", detail: "最近一次已抓到原始快照。" },
            ingest: { status: "warning", label: "入库失败", detail: "抓到了快照，但没有成功产出记录。" },
            output: { status: "warning", label: "输出中断", detail: "入库没有完成，后续规则没有继续执行。" },
          },
        },
        {
          id: "source-3",
          name: "暂停来源",
          themeName: "主题 C",
          status: "paused",
          isPaused: true,
          latestRunStatus: null,
          latestRunAt: null,
          latestSuccessAt: null,
          latestFailureAt: null,
          lastErrorMessage: null,
          runCount24h: 0,
          successCount24h: 0,
          failureCount24h: 0,
          healthScore: 60,
          issueSummary: "来源已暂停",
          latestSnapshotCount: 0,
          latestRecordCount: 0,
          latestChangeCount: 0,
          latestEventCount: 0,
          pipeline: {
            fetch: { status: "pending", label: "已暂停", detail: "来源暂停后不会继续抓取。" },
            ingest: { status: "pending", label: "已暂停", detail: "来源暂停后不会继续入库。" },
            output: { status: "pending", label: "已暂停", detail: "来源暂停后不会继续执行规则。" },
          },
        },
      ],
    });

    const wrapper = mount(SourceHealthView, {
      global: {
        stubs: {
          RouterLink: {
            props: ["to"],
            template: "<a :href=\"typeof to === 'string' ? to : to.path\"><slot /></a>",
          },
        },
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain("系统健康仪表盘");
    expect(wrapper.text()).toContain("查看抓取日志总览");
    expect(wrapper.text()).toContain("抓取链路");
    expect(wrapper.text()).toContain("入库链路");
    expect(wrapper.text()).toContain("异常来源");
    expect(wrapper.html()).toContain("/sources/status");
    expect(wrapper.html()).toContain("/sources/source-2");
  });
});
