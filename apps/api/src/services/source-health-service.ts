/**
 * Source health monitoring service.
 *
 * Provides health statistics and monitoring for data sources,
 * including operational metrics like run duration trends,
 * failure rates, task backlog, and exception aggregation.
 */

import { getDatabase } from "../db/client.js";

// ─── Operational Metrics Types ───────────────────────────────────────────────

export type DailyMetric = {
  date: string;
  value: number;
};

export type OperationalMetrics = {
  /** Run duration trend over the last 7 days (avg ms per day) */
  runDurationTrend: DailyMetric[];
  /** Failure rate trend over the last 7 days (0-1 per day) */
  failureRateTrend: DailyMetric[];
  /** Current task backlog */
  backlog: {
    pendingRuns: number;
    runningRuns: number;
    oldestPendingAge: string | null; // ISO duration string
  };
  /** Recent exception aggregation */
  recentExceptions: Array<{
    errorMessage: string;
    count: number;
    lastOccurredAt: string;
    sourceIds: string[];
  }>;
  /** Hourly run distribution (last 24h) */
  hourlyDistribution: Array<{
    hour: number;
    total: number;
    successful: number;
    failed: number;
  }>;
};

export type SystemHealthStatus = "healthy" | "warning" | "pending";

export type SystemHealthCheck = {
  id: "fetch" | "ingest" | "output" | "schedule";
  label: string;
  status: SystemHealthStatus;
  summary: string;
  description: string;
  healthyCount: number;
  warningCount: number;
  pendingCount: number;
};

export type SourcePipelineStatus = {
  status: SystemHealthStatus;
  label: string;
  detail: string;
};

export type SourceHealthDetail = {
  id: string;
  name: string;
  themeName: string;
  status: string;
  sourceType?: string;
  adapterKey?: string;
  isPaused: boolean;
  latestRunStatus: string | null;
  latestRunAt: string | null;
  latestSuccessAt: string | null;
  latestFailureAt: string | null;
  lastErrorMessage: string | null;
  runCount24h: number;
  successCount24h: number;
  failureCount24h: number;
  healthScore: number;
  issueSummary: string | null;
  latestSnapshotCount: number;
  latestRecordCount: number;
  latestChangeCount: number;
  latestEventCount: number;
  pipeline: {
    fetch: SourcePipelineStatus;
    ingest: SourcePipelineStatus;
    output: SourcePipelineStatus;
  };
};

export type SourceHealthStats = {
  totalSources: number;
  activeSources: number;
  healthySources: number;
  warningSources: number;
  pausedSources: number;
  healthRate: number;
  overallScore: number;
  fetchAvailability: number;
  ingestionAvailability: number;
  recentRuns: {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
  };
  averageRunDuration: number | null;
  recentErrors: Array<{
    sourceId: string;
    sourceName: string;
    errorMessage: string;
    occurredAt: string;
  }>;
  backlog: OperationalMetrics["backlog"];
  recentExceptions: OperationalMetrics["recentExceptions"];
  systemChecks: SystemHealthCheck[];
  sourceDetails: SourceHealthDetail[];
};

function requireDatabase() {
  const db = getDatabase();
  if (!db) {
    throw new Error("DATABASE_URL is required. Runtime mock mode has been removed.");
  }

  return db;
}

/**
 * Calculate health score for a source based on its metrics.
 * Score ranges from 0-100:
 * - >80: healthy
 * - 60-80: degraded
 * - <60: unhealthy
 */
export type HealthScoreInput = {
  status: string;
  isPaused?: boolean;
  latestRunStatus?: string | null;
  latestSuccessAt?: string | null;
  latestFailureAt?: string | null;
  lastErrorMessage?: string | null;
};

export type HealthScoreBreakdown = {
  /** Freshness: data availability — does the source have recent successful data? (0-100) */
  freshness: number;
  /** Stability: run reliability — are runs succeeding consistently? (0-100) */
  stability: number;
  /** Completeness: source health — is the source active and error-free? (0-100) */
  completeness: number;
  /** Timeliness: current state — did the latest run succeed? (0-100) */
  timeliness: number;
};

function calculateSourceHealthScore(source: HealthScoreInput): { score: number; breakdown: HealthScoreBreakdown } {
  // Track per-dimension penalties (each starts at 100)
  let freshnessPenalty = 0;
  let stabilityPenalty = 0;
  let completenessPenalty = 0;
  let timelinessPenalty = 0;

  // Overall score — preserved from the original algorithm
  let score = 100;

  // Factor 1: Latest run status (fetchStatus)
  if (source.latestRunStatus === "failed") {
    score -= 30;
    timelinessPenalty += 20;
    stabilityPenalty += 10;
  } else if (source.latestRunStatus === "pending" || source.latestRunStatus === "running") {
    score -= 10;
    timelinessPenalty += 10;
  }

  // Factor 2: Current status (contentStatus indicator)
  if (source.status === "warning") {
    score -= 25;
    completenessPenalty += 15;
    timelinessPenalty += 10;
  }

  // Factor 3: Consecutive failures (based on latestFailureAt vs latestSuccessAt)
  if (source.latestFailureAt && source.latestSuccessAt) {
    const failureTime = new Date(source.latestFailureAt).getTime();
    const successTime = new Date(source.latestSuccessAt).getTime();
    if (failureTime > successTime) {
      score -= 20;
      stabilityPenalty += 15;
      freshnessPenalty += 5;
    }
  } else if (source.latestFailureAt && !source.latestSuccessAt) {
    score -= 40;
    stabilityPenalty += 25;
    freshnessPenalty += 15;
  }

  // Factor 4: Error message presence
  if (source.lastErrorMessage) {
    score -= 15;
    stabilityPenalty += 10;
    freshnessPenalty += 5;
  }

  // Factor 5: Paused status
  if (source.isPaused) {
    score -= 10;
    completenessPenalty += 10;
  }

  const breakdown: HealthScoreBreakdown = {
    freshness: Math.max(0, Math.min(100, 100 - freshnessPenalty)),
    stability: Math.max(0, Math.min(100, 100 - stabilityPenalty)),
    completeness: Math.max(0, Math.min(100, 100 - completenessPenalty)),
    timeliness: Math.max(0, Math.min(100, 100 - timelinessPenalty)),
  };

  return {
    score: Math.max(0, Math.min(100, score)),
    breakdown,
  };
}

/**
 * Determine health status based on score.
 * - >80: healthy
 * - ≤80: warning (degraded and unhealthy both map to "warning" for UI consistency)
 */
function getHealthStatusFromScore(score: number): string {
  if (score > 80) return "healthy";
  return "warning";
}

type PipelineInput = {
  isPaused?: boolean;
  latestRunStatus?: string | null;
  latestSnapshotCount?: number;
  latestRecordCount?: number;
  latestChangeCount?: number;
  latestEventCount?: number;
  lastErrorMessage?: string | null;
};

function buildSourcePipelineStatus(input: PipelineInput): SourceHealthDetail["pipeline"] {
  const snapshotCount = input.latestSnapshotCount ?? 0;
  const recordCount = input.latestRecordCount ?? 0;
  const changeCount = input.latestChangeCount ?? 0;
  const eventCount = input.latestEventCount ?? 0;

  if (input.isPaused) {
    return {
      fetch: { status: "pending", label: "已暂停", detail: "来源暂停后不会继续抓取。" },
      ingest: { status: "pending", label: "已暂停", detail: "来源暂停后不会继续入库。" },
      output: { status: "pending", label: "已暂停", detail: "来源暂停后不会继续执行规则。" },
    };
  }

  if (input.latestRunStatus === "pending" || input.latestRunStatus === "running") {
    return {
      fetch: { status: "pending", label: "执行中", detail: "抓取任务正在排队或运行中。" },
      ingest: { status: "pending", label: "等待抓取完成", detail: "需要等待抓取完成后才能判断入库状态。" },
      output: { status: "pending", label: "等待上游完成", detail: "需要等待抓取和入库完成后才能继续判断输出链路。" },
    };
  }

  if (input.latestRunStatus === "failed") {
    if (snapshotCount > 0) {
      return {
        fetch: { status: "healthy", label: "抓取完成", detail: "最近一次已抓到原始快照。" },
        ingest: {
          status: recordCount > 0 ? "healthy" : "warning",
          label: recordCount > 0 ? "部分入库成功" : "入库失败",
          detail: recordCount > 0 ? "虽然运行失败，但已有部分记录成功写入。" : "抓到了快照，但没有成功产出记录。",
        },
        output: {
          status: recordCount > 0 && (changeCount > 0 || eventCount > 0) ? "healthy" : "warning",
          label: recordCount > 0 && (changeCount > 0 || eventCount > 0) ? "部分输出成功" : "输出中断",
          detail:
            recordCount > 0 && (changeCount > 0 || eventCount > 0)
              ? "规则链路已经部分执行，仍需回看失败原因。"
              : input.lastErrorMessage ?? "抓取后的处理链路没有完整跑通。",
        },
      };
    }

    return {
      fetch: { status: "warning", label: "抓取失败", detail: input.lastErrorMessage ?? "最近一次未能抓到原始数据。" },
      ingest: { status: "warning", label: "入库未开始", detail: "抓取未成功，因此没有进入入库链路。" },
      output: { status: "warning", label: "输出未开始", detail: "抓取未成功，因此没有进入规则输出链路。" },
    };
  }

  if (input.latestRunStatus === "completed") {
    const fetchStatus: SourcePipelineStatus = snapshotCount > 0
      ? { status: "healthy", label: "抓取正常", detail: "最近一次已成功抓到快照。" }
      : { status: "warning", label: "抓取结果为空", detail: "运行完成，但没有看到可用快照。" };
    const ingestStatus: SourcePipelineStatus = recordCount > 0
      ? { status: "healthy", label: "入库正常", detail: "最近一次已成功写入标准化记录。" }
      : snapshotCount > 0
        ? { status: "warning", label: "入库异常", detail: "抓到了快照，但没有成功写入记录。" }
        : { status: "warning", label: "入库未开始", detail: "抓取阶段没有留下可继续处理的数据。" };
    const outputStatus: SourcePipelineStatus = recordCount === 0
      ? { status: "warning", label: "输出中断", detail: "入库没有完成，规则链路无法继续执行。" }
      : changeCount > 0 || eventCount > 0
        ? { status: "healthy", label: "输出正常", detail: `本轮产生了 ${changeCount} 条变更、${eventCount} 条事件。` }
        : { status: "healthy", label: "输出正常", detail: "规则链路已完成，本轮没有检测到新变化。" };

    return {
      fetch: fetchStatus,
      ingest: ingestStatus,
      output: outputStatus,
    };
  }

  return {
    fetch: { status: "warning", label: "暂无运行", detail: "还没有可用于判断的最近运行记录。" },
    ingest: { status: "warning", label: "暂无运行", detail: "还没有可用于判断的最近入库记录。" },
    output: { status: "warning", label: "暂无运行", detail: "还没有可用于判断的最近规则输出记录。" },
  };
}

function parseDurationMinutes(duration: string | null): number {
  if (!duration) {
    return 0;
  }

  const hours = Number(duration.match(/(\d+)H/)?.[1] ?? 0);
  const minutes = Number(duration.match(/(\d+)M/)?.[1] ?? 0);
  const seconds = Number(duration.match(/(\d+)S/)?.[1] ?? 0);
  return hours * 60 + minutes + Math.floor(seconds / 60);
}

function buildSystemChecks(input: {
  activeSources: number;
  sourceDetails: SourceHealthDetail[];
  backlog: OperationalMetrics["backlog"];
}): SystemHealthCheck[] {
  const activeDetails = input.sourceDetails.filter((detail) => !detail.isPaused);
  const fetchHealthyCount = activeDetails.filter((detail) => detail.pipeline.fetch.status === "healthy").length;
  const fetchWarningCount = activeDetails.filter((detail) => detail.pipeline.fetch.status === "warning").length;
  const fetchPendingCount = activeDetails.filter((detail) => detail.pipeline.fetch.status === "pending").length;
  const ingestHealthyCount = activeDetails.filter((detail) => detail.pipeline.ingest.status === "healthy").length;
  const ingestWarningCount = activeDetails.filter((detail) => detail.pipeline.ingest.status === "warning").length;
  const ingestPendingCount = activeDetails.filter((detail) => detail.pipeline.ingest.status === "pending").length;
  const outputHealthyCount = activeDetails.filter((detail) => detail.pipeline.output.status === "healthy").length;
  const outputWarningCount = activeDetails.filter((detail) => detail.pipeline.output.status === "warning").length;
  const outputPendingCount = activeDetails.filter((detail) => detail.pipeline.output.status === "pending").length;

  const queuePressure = input.backlog.pendingRuns + input.backlog.runningRuns;
  const oldestPendingMinutes = parseDurationMinutes(input.backlog.oldestPendingAge);
  const scheduleStatus: SystemHealthStatus =
    queuePressure === 0
      ? "healthy"
      : queuePressure >= 3 || oldestPendingMinutes >= 60
        ? "warning"
        : "pending";

  return [
    {
      id: "fetch",
      label: "抓取链路",
      status: fetchWarningCount > 0 ? "warning" : fetchPendingCount > 0 ? "pending" : "healthy",
      summary: `${fetchHealthyCount} / ${input.activeSources} 个活跃渠道最近一次抓取成功。`,
      description: fetchWarningCount > 0 ? "异常渠道需要优先检查上游可达性和页面结构。" : "最近一次抓取链路整体稳定。",
      healthyCount: fetchHealthyCount,
      warningCount: fetchWarningCount,
      pendingCount: fetchPendingCount,
    },
    {
      id: "ingest",
      label: "入库链路",
      status: ingestWarningCount > 0 ? "warning" : ingestPendingCount > 0 ? "pending" : "healthy",
      summary: ingestWarningCount > 0
        ? `${ingestWarningCount} 个渠道抓到了快照，但没有成功入库记录。`
        : `${ingestHealthyCount} 个活跃渠道最近一次入库正常。`,
      description: ingestWarningCount > 0 ? "优先排查标准化和解析规则是否失效。" : "标准化入库链路当前没有明显异常。",
      healthyCount: ingestHealthyCount,
      warningCount: ingestWarningCount,
      pendingCount: ingestPendingCount,
    },
    {
      id: "output",
      label: "输出链路",
      status: outputWarningCount > 0 ? "warning" : outputPendingCount > 0 ? "pending" : "healthy",
      summary: outputWarningCount > 0
        ? `${outputWarningCount} 个渠道的后续检测或事件输出链路中断。`
        : "规则执行链路整体可用。",
      description: outputWarningCount > 0 ? "需要从最近运行日志回看是入库中断，还是规则执行异常。" : "没有发现明显的检测或事件落地异常。",
      healthyCount: outputHealthyCount,
      warningCount: outputWarningCount,
      pendingCount: outputPendingCount,
    },
    {
      id: "schedule",
      label: "调度队列",
      status: scheduleStatus,
      summary:
        queuePressure === 0
          ? "当前没有任务积压。"
          : `当前仍有 ${input.backlog.pendingRuns} 个排队任务、${input.backlog.runningRuns} 个执行中任务。`,
      description:
        scheduleStatus === "warning"
          ? "任务积压已经偏高，建议检查 worker 处理能力或失败重试堆积。"
          : queuePressure > 0
            ? "如果积压持续扩大，需要回看 worker 处理能力。"
            : "调度和消费节奏当前正常。",
      healthyCount: queuePressure === 0 ? input.activeSources : 0,
      warningCount: scheduleStatus === "warning" ? queuePressure : 0,
      pendingCount: scheduleStatus === "pending" ? queuePressure : 0,
    },
  ];
}

// ─── Source Health Explanation ──────────────────────────────────────────────

export type SourceHealthExplanation = {
  /** Source ID */
  sourceId: string;
  /** Source name */
  sourceName: string;
  /** Current health status */
  status: "healthy" | "warning" | "paused";
  /** Health score (0-100) */
  healthScore: number;
  /** Score breakdown by dimension */
  breakdown: HealthScoreBreakdown;
  /** Primary issue explanation */
  issue: string | null;
  /** Why this issue matters */
  impact: string | null;
  /** Impact level on theme judgment */
  impactLevel: "none" | "low" | "medium" | "high";
  /** What the user should do */
  recommendation: string | null;
  /** Detailed breakdown of issues */
  issues: Array<{
    type: "fetch_failed" | "long_stale" | "paused" | "pending_backlog" | "error_message" | "record_drop" | "silent_degradation" | "upstream_unreachable" | "upstream_empty" | "parse_mismatch" | "normalized_zero" | "rule_produced_nothing";
    label: string;
    description: string;
    impact: string;
  }>;
};

/**
 * Generate a unified health explanation for a source.
 * Explains why a source is abnormal and what the impact is on theme judgment.
 */
export function explainSourceHealth(source: {
  id: string;
  name: string;
  status: string;
  isPaused?: boolean;
  latestRunStatus?: string | null;
  latestRunAt?: string | null;
  latestSuccessAt?: string | null;
  latestFailureAt?: string | null;
  lastErrorMessage?: string | null;
  runCount24h?: number;
  failureCount24h?: number;
  /** Recent record counts, ordered newest-first (index 0 = most recent run) */
  recentRecordCounts?: number[];
  /** Recent snapshot counts, ordered newest-first */
  recentSnapshotCounts?: number[];
  /** Record count from the most recent run */
  latestRecordCount?: number;
  /** Snapshot count from the most recent run */
  latestSnapshotCount?: number;
  /** Event count from the most recent run */
  latestEventCount?: number;
}): SourceHealthExplanation {
  const issues: SourceHealthExplanation["issues"] = [];
  const now = Date.now();

  // Check for paused status
  if (source.isPaused) {
    issues.push({
      type: "paused",
      label: "来源已暂停",
      description: "该来源当前处于暂停状态，不会自动执行抓取任务。",
      impact: "无法获取该来源的最新数据，主题判断可能缺少该渠道的信息。",
    });
  }

  // Check for recent fetch failures - classify more precisely
  if (source.latestRunStatus === "failed") {
    const errorMsg = source.lastErrorMessage || "";
    const errorLower = errorMsg.toLowerCase();

    if (errorLower.includes("timeout") || errorLower.includes("connection") || errorLower.includes("unreachable") || errorLower.includes("refused") || errorLower.includes("dns") || errorLower.includes("network")) {
      issues.push({
        type: "upstream_unreachable",
        label: "上游不可达",
        description: errorMsg,
        impact: "无法连接到数据源，可能是网络问题或上游服务宕机。",
      });
    } else if (errorLower.includes("empty") || errorLower.includes("no data") || errorLower.includes("not found") || errorLower.includes("404")) {
      issues.push({
        type: "upstream_empty",
        label: "上游无数据",
        description: errorMsg,
        impact: "数据源返回空内容，可能是页面已下线或接口变更。",
      });
    } else if (errorLower.includes("parse") || errorLower.includes("selector") || errorLower.includes("extract") || errorLower.includes("structure")) {
      issues.push({
        type: "parse_mismatch",
        label: "解析失败",
        description: errorMsg,
        impact: "页面结构可能已变化，适配器需要更新。",
      });
    } else {
      issues.push({
        type: "fetch_failed",
        label: "最近抓取失败",
        description: errorMsg || "最近一次抓取任务执行失败。",
        impact: "最新数据可能缺失或不完整，需要检查失败原因并重新抓取。",
      });
    }
  }

  // Check for stale data (no success in 24 hours)
  if (source.latestSuccessAt) {
    const lastSuccess = new Date(source.latestSuccessAt).getTime();
    const hoursSinceSuccess = (now - lastSuccess) / (1000 * 60 * 60);

    if (hoursSinceSuccess > 24) {
      issues.push({
        type: "long_stale",
        label: "长时间未更新",
        description: `最近一次成功抓取在 ${Math.floor(hoursSinceSuccess)} 小时前。`,
        impact: "数据可能已经过时，无法反映最新情况。",
      });
    }
  } else if (!source.isPaused) {
    issues.push({
      type: "long_stale",
      label: "从未成功抓取",
      description: "该来源还没有成功抓取记录。",
      impact: "无法判断该来源的数据质量，需要先完成一次成功抓取。",
    });
  }

  // Check for pending backlog
  if (source.latestRunStatus === "pending") {
    issues.push({
      type: "pending_backlog",
      label: "任务排队中",
      description: "抓取任务正在排队等待执行。",
      impact: "数据更新会有延迟，但通常不会影响最终结果。",
    });
  }

  // Check for error message
  if (source.lastErrorMessage && source.latestRunStatus !== "failed") {
    issues.push({
      type: "error_message",
      label: "存在错误信息",
      description: source.lastErrorMessage,
      impact: "可能存在间歇性问题，需要关注是否会影响数据质量。",
    });
  }

  // Check for record count drift (significant drop vs average of previous runs)
  // recentRecordCounts is ordered newest-first (most recent run at index 0)
  if (source.recentRecordCounts && source.recentRecordCounts.length >= 3) {
    const latest = source.latestRecordCount ?? source.recentRecordCounts[0]; // [0] = most recent
    const previousRuns = source.recentRecordCounts.slice(1); // exclude latest
    const avg = previousRuns.reduce((a, b) => a + b, 0) / previousRuns.length;
    if (avg > 0 && latest < avg * 0.5) {
      issues.push({
        type: "record_drop",
        label: "数据量异常下降",
        description: `最近一次抓取记录数 (${latest}) 明显低于平均值 (${Math.round(avg)})，下降超过 50%。`,
        impact: "来源页面结构可能发生变化，导致数据抓取不完整。",
      });
    }
  }

  // Check for silent degradation (completed run with snapshots but zero records)
  if (
    source.latestRunStatus === "completed" &&
    (source.latestSnapshotCount ?? 0) > 0 &&
    (source.latestRecordCount ?? 0) === 0 &&
    !source.isPaused
  ) {
    issues.push({
      type: "normalized_zero",
      label: "标准化无结果",
      description: "最近一次运行成功且有快照数据，但未能提取到任何记录。",
      impact: "来源页面可能已改版，适配器需要更新。",
    });
  }

  // Check for rule producing nothing (completed run with records but zero events)
  if (
    source.latestRunStatus === "completed" &&
    (source.latestRecordCount ?? 0) > 0 &&
    (source.latestEventCount ?? 0) === 0 &&
    !source.isPaused
  ) {
    issues.push({
      type: "rule_produced_nothing",
      label: "事件规则未触发",
      description: "最近一次运行提取到了记录，但未触发任何事件。",
      impact: "可能是正常的（数据未变化），也可能是事件规则需要调整。",
    });
  }

  // Determine primary issue
  const primaryIssue = issues[0] ?? null;

  // Determine impact level
  let impactLevel: SourceHealthExplanation["impactLevel"] = "none";
  const hasCriticalDegradation = issues.some(
    (i) => i.type === "normalized_zero" || i.type === "record_drop" || i.type === "upstream_unreachable",
  );
  if (source.isPaused) {
    impactLevel = "low"; // Paused is intentional, low impact
  } else if (source.status === "warning" || source.latestRunStatus === "failed" || hasCriticalDegradation) {
    impactLevel = "high";
  } else if (issues.length > 0) {
    impactLevel = "medium";
  }

  // Generate recommendation (specific issue types first, then generic fallbacks)
  let recommendation: string | null = null;
  if (source.isPaused) {
    recommendation = "如需继续监控，可以恢复该来源。";
  } else if (issues.some((i) => i.type === "upstream_unreachable")) {
    recommendation = "检查目标 URL 是否可访问，网络是否正常。";
  } else if (issues.some((i) => i.type === "upstream_empty")) {
    recommendation = "检查数据源是否已下线或接口是否变更。";
  } else if (issues.some((i) => i.type === "parse_mismatch")) {
    recommendation = "页面结构可能已变化，需要更新适配器配置。";
  } else if (issues.some((i) => i.type === "normalized_zero")) {
    recommendation = "检查页面结构是否变化，CSS 选择器是否仍然有效。";
  } else if (issues.some((i) => i.type === "record_drop")) {
    recommendation = "检查页面结构是否变化，手动运行一次确认数据量。";
  } else if (issues.some((i) => i.type === "rule_produced_nothing")) {
    recommendation = "检查事件规则是否需要调整，或确认数据是否真的未变化。";
  } else if (issues.some((i) => i.type === "long_stale")) {
    recommendation = "手动触发一次抓取，确认来源是否仍然可用。";
  } else if (source.latestRunStatus === "failed") {
    recommendation = "检查错误信息并重新运行抓取任务。";
  } else if (source.latestRunStatus === "pending") {
    recommendation = "等待当前任务完成，或检查是否有任务积压。";
  }

  // Calculate health score with breakdown
  const { score: healthScore, breakdown } = calculateSourceHealthScore({
    status: source.status,
    isPaused: source.isPaused,
    latestRunStatus: source.latestRunStatus,
    latestSuccessAt: source.latestSuccessAt,
    latestFailureAt: source.latestFailureAt,
    lastErrorMessage: source.lastErrorMessage,
  });

  // Determine status
  const status = source.isPaused ? "paused" : getHealthStatusFromScore(healthScore) as "healthy" | "warning";

  return {
    sourceId: source.id,
    sourceName: source.name,
    status,
    healthScore,
    breakdown,
    issue: primaryIssue?.label ?? null,
    impact: primaryIssue?.impact ?? null,
    impactLevel,
    recommendation,
    issues,
  };
}

/**
 * Generate health explanations for multiple sources.
 */
export function explainMultipleSourceHealth(sources: Array<{
  id: string;
  name: string;
  status: string;
  isPaused?: boolean;
  latestRunStatus?: string | null;
  latestRunAt?: string | null;
  latestSuccessAt?: string | null;
  latestFailureAt?: string | null;
  lastErrorMessage?: string | null;
  runCount24h?: number;
  failureCount24h?: number;
}>): SourceHealthExplanation[] {
  return sources.map((source) => explainSourceHealth(source));
}

export async function getSourceHealthStats(): Promise<SourceHealthStats> {
  const db = requireDatabase();
  const operationalMetrics = await getOperationalMetrics();

  const sources = await db
    .selectFrom("sources")
    .select([
      "id",
      "name",
      "theme_id as themeId",
      "status",
      "source_type as sourceType",
      "adapter_key as adapterKey",
      "is_paused as isPaused",
      "latest_success_at as latestSuccessAt",
      "latest_failure_at as latestFailureAt",
    ])
    .execute();

  const themeIds = [...new Set(sources.map((s) => s.themeId))];
  const themes = themeIds.length > 0
    ? await db
        .selectFrom("themes")
        .select(["id", "name"])
        .where("id", "in", themeIds)
        .execute()
    : [];

  const themeMap = new Map(themes.map((t) => [t.id, t.name]));

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentRuns = await db
    .selectFrom("source_runs")
    .select([
      "source_id as sourceId",
      "status",
      "started_at as startedAt",
      "finished_at as finishedAt",
      "error_message as errorMessage",
    ])
    .where("created_at", ">=", twentyFourHoursAgo as any)
    .where("trigger_type", "not in", ["test", "replay"])
    .orderBy("created_at", "desc")
    .execute();

  const sourceRunMap = new Map<string, typeof recentRuns>();
  for (const run of recentRuns) {
    const runs = sourceRunMap.get(run.sourceId) || [];
    runs.push(run);
    sourceRunMap.set(run.sourceId, runs);
  }

  const totalSources = sources.length;
  const pausedSources = sources.filter((s) => s.isPaused).length;
  const activeSources = totalSources - pausedSources;

  const totalRuns = recentRuns.length;
  const successfulRuns = recentRuns.filter((r) => r.status === "completed").length;
  const failedRuns = recentRuns.filter((r) => r.status === "failed").length;

  // Calculate average run duration
  const runsWithDuration = recentRuns.filter((r) => r.startedAt && r.finishedAt);
  const totalDuration = runsWithDuration.reduce((sum, r) => {
    const start = new Date(r.startedAt!).getTime();
    const end = new Date(r.finishedAt!).getTime();
    return sum + (end - start);
  }, 0);
  const averageRunDuration = runsWithDuration.length > 0
    ? totalDuration / runsWithDuration.length
    : null;

  const recentErrors = recentRuns
    .filter((r) => r.status === "failed" && r.errorMessage)
    .slice(0, 10)
    .map((r) => {
      const source = sources.find((s) => s.id === r.sourceId);
      return {
        sourceId: r.sourceId,
        sourceName: source?.name || "Unknown",
        errorMessage: r.errorMessage!,
        occurredAt: r.finishedAt?.toString() || new Date().toISOString(),
      };
    });

  const latestRuns = await Promise.all(
    sources.map(async (source) => {
      const latestRun = await db
        .selectFrom("source_runs")
        .select([
          "id",
          "status",
          "started_at as startedAt",
          "finished_at as finishedAt",
          "error_message as errorMessage",
        ])
        .where("source_id", "=", source.id)
        .where("trigger_type", "not in", ["test", "replay"])
        .orderBy("created_at", "desc")
        .limit(1)
        .executeTakeFirst();

      return {
        sourceId: source.id,
        runId: latestRun?.id ?? null,
        latestRunStatus: latestRun?.status ?? null,
        latestRunAt:
          latestRun?.finishedAt?.toISOString?.() ??
          latestRun?.startedAt?.toISOString?.() ??
          null,
        lastErrorMessage: latestRun?.errorMessage ?? null,
      };
    }),
  );

  const latestRunIds = latestRuns
    .map((run) => run.runId)
    .filter((runId): runId is string => Boolean(runId));

  const [snapshotCounts, recordCounts, changeCounts, eventCounts] = latestRunIds.length > 0
    ? await Promise.all([
        db
          .selectFrom("raw_snapshots")
          .select(["source_run_id as runId", ({ fn }) => fn.count("id").as("count")])
          .where("source_run_id", "in", latestRunIds)
          .groupBy("source_run_id")
          .execute(),
        db
          .selectFrom("normalized_records")
          .select(["source_run_id as runId", ({ fn }) => fn.count("id").as("count")])
          .where("source_run_id", "in", latestRunIds)
          .groupBy("source_run_id")
          .execute(),
        db
          .selectFrom("changes")
          .select(["source_run_id as runId", ({ fn }) => fn.count("id").as("count")])
          .where("source_run_id", "in", latestRunIds)
          .groupBy("source_run_id")
          .execute(),
        db
          .selectFrom("events")
          .select(["source_run_id as runId", ({ fn }) => fn.count("id").as("count")])
          .where("source_run_id", "in", latestRunIds)
          .groupBy("source_run_id")
          .execute(),
      ])
    : [[], [], [], []];

  const snapshotCountMap = new Map(snapshotCounts.map((row) => [row.runId, Number(row.count)]));
  const recordCountMap = new Map(recordCounts.map((row) => [row.runId, Number(row.count)]));
  const changeCountMap = new Map(changeCounts.map((row) => [row.runId, Number(row.count)]));
  const eventCountMap = new Map(eventCounts.map((row) => [row.runId, Number(row.count)]));

  const sourceDetails = sources.map((s) => {
    const runs = sourceRunMap.get(s.id) || [];
    const latestRun = latestRuns.find((run) => run.sourceId === s.id);
    const latestSnapshotCount = latestRun?.runId ? snapshotCountMap.get(latestRun.runId) ?? 0 : 0;
    const latestRecordCount = latestRun?.runId ? recordCountMap.get(latestRun.runId) ?? 0 : 0;
    const latestChangeCount = latestRun?.runId ? changeCountMap.get(latestRun.runId) ?? 0 : 0;
    const latestEventCount = latestRun?.runId ? eventCountMap.get(latestRun.runId) ?? 0 : 0;
    const { score: healthScore } = calculateSourceHealthScore({
      status: s.status,
      isPaused: s.isPaused,
      latestRunStatus: latestRun?.latestRunStatus ?? null,
      latestSuccessAt: s.latestSuccessAt?.toISOString?.() ?? null,
      latestFailureAt: s.latestFailureAt?.toISOString?.() ?? null,
      lastErrorMessage: latestRun?.lastErrorMessage ?? null,
    });
    const normalizedStatus = s.isPaused ? "paused" : getHealthStatusFromScore(healthScore);
    const explanation = explainSourceHealth({
      id: s.id,
      name: s.name,
      status: normalizedStatus,
      isPaused: s.isPaused,
      latestRunStatus: latestRun?.latestRunStatus ?? null,
      latestRunAt: latestRun?.latestRunAt ?? null,
      latestSuccessAt: s.latestSuccessAt?.toISOString?.() ?? null,
      latestFailureAt: s.latestFailureAt?.toISOString?.() ?? null,
      lastErrorMessage: latestRun?.lastErrorMessage ?? null,
      latestSnapshotCount,
      latestRecordCount,
      latestEventCount,
    });
    const pipeline = buildSourcePipelineStatus({
      isPaused: s.isPaused,
      latestRunStatus: latestRun?.latestRunStatus ?? null,
      lastErrorMessage: latestRun?.lastErrorMessage ?? null,
      latestSnapshotCount,
      latestRecordCount,
      latestChangeCount,
      latestEventCount,
    });

    return {
      id: s.id,
      name: s.name,
      themeName: themeMap.get(s.themeId) || "Unknown",
      status: normalizedStatus,
      sourceType: s.sourceType,
      adapterKey: s.adapterKey,
      isPaused: s.isPaused,
      latestRunStatus: latestRun?.latestRunStatus ?? null,
      latestRunAt: latestRun?.latestRunAt ?? null,
      latestSuccessAt: s.latestSuccessAt?.toString() || null,
      latestFailureAt: s.latestFailureAt?.toString() || null,
      lastErrorMessage: latestRun?.lastErrorMessage ?? null,
      runCount24h: runs.length,
      successCount24h: runs.filter((r) => r.status === "completed").length,
      failureCount24h: runs.filter((r) => r.status === "failed").length,
      healthScore,
      issueSummary: explanation.issue,
      latestSnapshotCount,
      latestRecordCount,
      latestChangeCount,
      latestEventCount,
      pipeline,
    } satisfies SourceHealthDetail;
  });

  const healthySources = sourceDetails.filter((detail) => !detail.isPaused && detail.status === "healthy").length;
  const warningSources = sourceDetails.filter((detail) => !detail.isPaused && detail.status === "warning").length;
  const averageHealthScore = sourceDetails
    .filter((detail) => !detail.isPaused)
    .reduce((sum, detail) => sum + detail.healthScore, 0) / Math.max(activeSources, 1);
  const fetchHealthyCount = sourceDetails.filter((detail) => !detail.isPaused && detail.pipeline.fetch.status === "healthy").length;
  const ingestHealthyCount = sourceDetails.filter((detail) => !detail.isPaused && detail.pipeline.ingest.status === "healthy").length;
  const fetchAvailability = activeSources > 0 ? fetchHealthyCount / activeSources : 0;
  const ingestionAvailability = activeSources > 0 ? ingestHealthyCount / activeSources : 0;
  const recentRunSuccessRate = totalRuns > 0 ? successfulRuns / totalRuns : 0;
  const overallScore = Math.round(
    averageHealthScore * 0.35 +
    fetchAvailability * 100 * 0.25 +
    ingestionAvailability * 100 * 0.25 +
    recentRunSuccessRate * 100 * 0.15,
  );

  return {
    totalSources,
    activeSources,
    healthySources,
    warningSources,
    pausedSources,
    healthRate: activeSources > 0 ? healthySources / activeSources : 0,
    overallScore,
    fetchAvailability,
    ingestionAvailability,
    recentRuns: {
      total: totalRuns,
      successful: successfulRuns,
      failed: failedRuns,
      successRate: totalRuns > 0 ? successfulRuns / totalRuns : 0,
    },
    averageRunDuration,
    recentErrors,
    backlog: operationalMetrics.backlog,
    recentExceptions: operationalMetrics.recentExceptions,
    systemChecks: buildSystemChecks({
      activeSources,
      sourceDetails,
      backlog: operationalMetrics.backlog,
    }),
    sourceDetails,
  };
}

// ─── Operational Metrics ─────────────────────────────────────────────────────

export async function getOperationalMetrics(): Promise<OperationalMetrics> {
  const db = requireDatabase();

  // ─── DB Mode ───────────────────────────────────────────────────────────────

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Get all runs from last 7 days
  const runs = await db
    .selectFrom("source_runs")
    .select([
      "status",
      "started_at as startedAt",
      "finished_at as finishedAt",
      "error_message as errorMessage",
      "source_id as sourceId",
      "created_at as createdAt",
    ])
    .where("created_at", ">=", sevenDaysAgo as any)
    .where("trigger_type", "!=", "test")
    .execute();

  // ── Run Duration Trend (avg per day) ──────────────────────────────────────

  const dailyRuns = new Map<string, typeof runs>();
  for (const run of runs) {
    const dateKey = run.createdAt
      ? new Date(run.createdAt as any).toISOString().split("T")[0]
      : "unknown";
    const dayRuns = dailyRuns.get(dateKey) || [];
    dayRuns.push(run);
    dailyRuns.set(dateKey, dayRuns);
  }

  const runDurationTrend: DailyMetric[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const dayRuns = dailyRuns.get(dateStr) || [];

    const runsWithDuration = dayRuns.filter((r) => r.startedAt && r.finishedAt);
    const avgDuration =
      runsWithDuration.length > 0
        ? runsWithDuration.reduce((sum, r) => {
            const start = new Date(r.startedAt as any).getTime();
            const end = new Date(r.finishedAt as any).getTime();
            return sum + (end - start);
          }, 0) / runsWithDuration.length
        : 0;

    runDurationTrend.push({ date: dateStr, value: Math.round(avgDuration) });
  }

  // ── Failure Rate Trend (per day) ──────────────────────────────────────────

  const failureRateTrend: DailyMetric[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const dayRuns = dailyRuns.get(dateStr) || [];

    const total = dayRuns.length;
    const failed = dayRuns.filter((r) => r.status === "failed").length;
    failureRateTrend.push({
      date: dateStr,
      value: total > 0 ? Number((failed / total).toFixed(3)) : 0,
    });
  }

  // ── Task Backlog ──────────────────────────────────────────────────────────

  const pendingRuns = await db
    .selectFrom("source_runs")
    .select((eb) => eb.fn.count("id").as("count"))
    .where("status", "=", "pending")
    .where("trigger_type", "!=", "test")
    .executeTakeFirst();

  const runningRuns = await db
    .selectFrom("source_runs")
    .select((eb) => eb.fn.count("id").as("count"))
    .where("status", "=", "running")
    .where("trigger_type", "!=", "test")
    .executeTakeFirst();

  const oldestPending = await db
    .selectFrom("source_runs")
    .select("created_at as createdAt")
    .where("status", "=", "pending")
    .where("trigger_type", "!=", "test")
    .orderBy("created_at", "asc")
    .executeTakeFirst();

  const oldestPendingAge = oldestPending?.createdAt
    ? formatDuration(now.getTime() - new Date(oldestPending.createdAt as any).getTime())
    : null;

  // ── Recent Exception Aggregation ──────────────────────────────────────────

  const recentErrors = runs.filter((r) => r.status === "failed" && r.errorMessage);

  const errorMap = new Map<
    string,
    { count: number; lastOccurredAt: string; sourceIds: Set<string> }
  >();

  for (const run of recentErrors) {
    const msg = run.errorMessage!;
    const existing = errorMap.get(msg) || {
      count: 0,
      lastOccurredAt: "",
      sourceIds: new Set<string>(),
    };
    existing.count++;
    const runTime = run.finishedAt
      ? new Date(run.finishedAt as any).toISOString()
      : new Date(run.createdAt as any).toISOString();
    if (runTime > existing.lastOccurredAt) {
      existing.lastOccurredAt = runTime;
    }
    existing.sourceIds.add(run.sourceId);
    errorMap.set(msg, existing);
  }

  const recentExceptions = [...errorMap.entries()]
    .map(([errorMessage, data]) => ({
      errorMessage,
      count: data.count,
      lastOccurredAt: data.lastOccurredAt,
      sourceIds: [...data.sourceIds],
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // ── Hourly Distribution (last 24h) ────────────────────────────────────────

  const hourlyRuns = runs.filter((r) => {
    const createdAt = r.createdAt ? new Date(r.createdAt as any) : null;
    return createdAt && createdAt >= twentyFourHoursAgo;
  });

  const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => {
    const hourRuns = hourlyRuns.filter((r) => {
      const h = new Date(r.createdAt as any).getUTCHours();
      return h === hour;
    });
    return {
      hour,
      total: hourRuns.length,
      successful: hourRuns.filter((r) => r.status === "completed").length,
      failed: hourRuns.filter((r) => r.status === "failed").length,
    };
  });

  return {
    runDurationTrend,
    failureRateTrend,
    backlog: {
      pendingRuns: Number(pendingRuns?.count ?? 0),
      runningRuns: Number(runningRuns?.count ?? 0),
      oldestPendingAge,
    },
    recentExceptions,
    hourlyDistribution,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `PT${seconds}S`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `PT${minutes}M`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `PT${hours}H${remainingMinutes}M` : `PT${hours}H`;
}
