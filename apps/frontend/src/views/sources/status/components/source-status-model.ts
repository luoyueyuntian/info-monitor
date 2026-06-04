import type { SourceStatus } from "../../../../lib/api";
import { sourcePriorityScore } from "../../../../lib/source-ranking";
import { toTimestamp } from "../../../../lib/time";
import { formatDateTimeLabel } from "../../../../lib/presentation";

export function buildSourceDiagnostics(visibleSources: SourceStatus[]) {
  const warningCount = visibleSources.filter((source) => source.status === "warning" || source.status === "unhealthy").length;
  const pendingCount = visibleSources.filter((source) => source.latestRunStatus === "pending" || source.status === "pending").length;
  const pausedCount = visibleSources.filter((source) => source.isPaused).length;
  const staleCount = visibleSources.filter((source) => {
    const latestActivity = Math.max(
      toTimestamp(source.latestRunAt),
      toTimestamp(source.latestSuccessAt),
      toTimestamp(source.latestFailureAt),
    );

    return latestActivity > 0 && latestActivity < Date.now() - 48 * 60 * 60 * 1000;
  }).length;

  const priorityItems = [...visibleSources]
    .sort((left, right) => sourcePriorityScore(right) - sourcePriorityScore(left))
    .filter((source) => sourcePriorityScore(source) > 0)
    .slice(0, 3)
    .map((source) => {
      if (source.status === "warning" || source.latestRunStatus === "failed") {
        return `${source.name}：最近运行异常，建议优先复核错误原因。`;
      }

      if (source.latestRunStatus === "pending") {
        return `${source.name}：当前仍在排队，适合等待结果后再判断。`;
      }

      if (source.isPaused) {
        return `${source.name}：当前已暂停，可能导致该主题信息覆盖不完整。`;
      }

      return `${source.name}：最近更新时效偏慢，建议检查抓取节奏。`;
    });

  if (warningCount > 0) {
    return {
      tone: "warning",
      toneLabel: "优先处理异常",
      headline: "当前来源状态存在明显异常，建议先处理抓取链路问题。",
      summary: `当前视图下有 ${warningCount} 个异常来源、${pendingCount} 个待运行来源、${pausedCount} 个暂停来源。`,
      priorityItems: priorityItems.length ? priorityItems : ["当前异常来源需要优先复核错误信息和最近运行结果。"],
      actions: [
        "先查看异常来源的最近错误信息，判断是抓取失败、解析失败还是站点结构变化。",
        pendingCount > 0 ? "等待排队中的来源完成后，再决定是否需要继续手动补跑。" : "必要时手动补跑异常来源，确认问题是否可复现。",
      ],
    };
  }

  if (pendingCount > 0 || staleCount > 0 || pausedCount > 0) {
    return {
      tone: "pending",
      toneLabel: "需要继续跟进",
      headline: "当前来源没有明显报错，但仍有待运行、暂停或更新滞后的情况。",
      summary: `当前视图下有 ${pendingCount} 个待运行来源、${pausedCount} 个暂停来源、${staleCount} 个更新滞后来源。`,
      priorityItems: priorityItems.length ? priorityItems : ["当前来源主要以运行时序和覆盖完整度问题为主。"],
      actions: [
        pendingCount > 0 ? "优先等待排队中的来源执行完成，再看是否真的需要人工干预。" : "检查暂停来源是否仍然需要暂停。",
        staleCount > 0 ? "对更新滞后的来源进行补跑，确认最近是否有漏抓。" : "如需更高把握，可手动补跑关键来源。",
      ],
    };
  }

  return {
    tone: "healthy",
    toneLabel: "整体稳定",
    headline: "当前来源整体运行稳定，暂时没有明显需要优先处理的链路。",
    summary: `当前视图下共 ${visibleSources.length} 个来源，最近运行状态整体正常。`,
    priorityItems: ["当前更适合把注意力放到事件和主题判断上，而不是来源故障处理。"],
    actions: [
      "继续按主题价值优先级观察是否需要补跑关键来源。",
      "如要提升把握，可抽查最新成功运行的来源输出是否符合预期。",
    ],
  };
}

export function buildSourceFilterSummary(
  focusFilter: string,
  recentOnly24h: boolean,
  sinceFilter: string,
) {
  const parts = [
    focusFilter === "warning" ? "只看异常来源" : "",
    focusFilter === "pending" ? "只看待运行来源" : "",
    focusFilter === "healthy" ? "只看正常来源" : "",
    recentOnly24h ? "仅最近24小时运行" : "",
    sinceFilter ? `仅看 ${formatDateTimeLabel(sinceFilter)} 之后变化` : "",
  ].filter(Boolean);

  return parts.length ? parts.join(" · ") : "全部来源";
}
