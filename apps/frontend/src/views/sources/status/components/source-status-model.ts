import type { SourceStatus } from "../../../../lib/api";
import type { RouteLocationRaw } from "vue-router";
import { impactToneLabel, themeImpactTone } from "../../../../lib/impact";
import { sourcePriorityScore } from "../../../../lib/source-ranking";
import { toTimestamp } from "../../../../lib/time";
import { formatDateTimeLabel } from "../../../../lib/presentation";

export function buildSourceDiagnostics(visibleSources: SourceStatus[]) {
  const warningCount = visibleSources.filter((source) => source.status === "warning" || source.status === "unhealthy").length;
  const pendingCount = visibleSources.filter((source) => source.latestRunStatus === "pending" || source.status === "pending").length;
  const pausedCount = visibleSources.filter((source) => source.isPaused).length;
  const negativeImpactCount = visibleSources.filter((source) =>
    themeImpactTone({ type: source.themeType ?? "", latestEventSignal: source.latestEventSignal ?? null }) === "negative",
  ).length;
  const positiveImpactCount = visibleSources.filter((source) =>
    themeImpactTone({ type: source.themeType ?? "", latestEventSignal: source.latestEventSignal ?? null }) === "positive",
  ).length;
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
      const impactLabel = impactToneLabel(
        themeImpactTone({ type: source.themeType ?? "", latestEventSignal: source.latestEventSignal ?? null }),
      );

      if (source.status === "warning" || source.latestRunStatus === "failed") {
        return `${source.name}：最近运行异常，建议优先复核错误原因；所属主题当前判断${impactLabel}。`;
      }

      if (source.latestRunStatus === "pending") {
        return `${source.name}：当前仍在排队，适合等待结果后再判断；所属主题当前判断${impactLabel}。`;
      }

      if (source.isPaused) {
        return `${source.name}：当前已暂停，可能导致该主题信息覆盖不完整；所属主题当前判断${impactLabel}。`;
      }

      return `${source.name}：最近更新时效偏慢，建议检查抓取节奏；所属主题当前判断${impactLabel}。`;
    });

  if (warningCount > 0) {
    return {
      tone: "warning",
      toneLabel: "优先处理异常",
      headline: "当前来源状态存在明显异常，建议先处理抓取链路问题。",
      summary: `当前视图下有 ${warningCount} 个异常来源、${pendingCount} 个待运行来源、${pausedCount} 个暂停来源；其中关联偏利空主题的来源有 ${negativeImpactCount} 个。`,
      priorityItems: priorityItems.length ? priorityItems : ["当前异常来源需要优先复核错误信息和最近运行结果。"],
      actions: [
        {
          label: "查看异常来源列表",
          to: { path: "/sources/status", query: { focus: "warning", recent: "24h" } } satisfies RouteLocationRaw,
        },
        negativeImpactCount > 0
          ? {
              label: "查看关联偏利空主题",
              to: { path: "/themes", query: { impact: "negative", sort: "attention" } } satisfies RouteLocationRaw,
            }
          : {
              label: "查看最近24小时事件",
              to: { path: "/events", query: { recent: "24h", sort: "occurredAt" } } satisfies RouteLocationRaw,
            },
        pendingCount > 0
          ? {
              label: "查看待运行来源",
              to: { path: "/sources/status", query: { focus: "pending", recent: "24h" } } satisfies RouteLocationRaw,
            }
          : {
              label: "查看来源详情",
              to: visibleSources[0] ? ({ path: `/sources/${visibleSources[0].id}` } satisfies RouteLocationRaw) : ({ path: "/sources/status" } satisfies RouteLocationRaw),
            },
      ],
    };
  }

  if (pendingCount > 0 || staleCount > 0 || pausedCount > 0) {
    return {
      tone: "pending",
      toneLabel: "需要继续跟进",
      headline: "当前来源没有明显报错，但仍有待运行、暂停或更新滞后的情况。",
      summary: `当前视图下有 ${pendingCount} 个待运行来源、${pausedCount} 个暂停来源、${staleCount} 个更新滞后来源；其中关联偏利空主题的来源有 ${negativeImpactCount} 个，关联偏利好主题的来源有 ${positiveImpactCount} 个。`,
      priorityItems: priorityItems.length ? priorityItems : ["当前来源主要以运行时序和覆盖完整度问题为主。"],
      actions: [
        pendingCount > 0
          ? {
              label: "查看待运行来源",
              to: { path: "/sources/status", query: { focus: "pending", recent: "24h" } } satisfies RouteLocationRaw,
            }
          : {
              label: "查看正常来源",
              to: { path: "/sources/status", query: { focus: "healthy" } } satisfies RouteLocationRaw,
            },
        negativeImpactCount > 0
          ? {
              label: "查看关联偏利空主题",
              to: { path: "/themes", query: { impact: "negative", sort: "attention" } } satisfies RouteLocationRaw,
            }
          : positiveImpactCount > 0
            ? {
                label: "查看关联偏利好主题",
                to: { path: "/themes", query: { impact: "positive", sort: "attention" } } satisfies RouteLocationRaw,
              }
            : {
                label: "查看最近24小时事件",
                to: { path: "/events", query: { recent: "24h", sort: "occurredAt" } } satisfies RouteLocationRaw,
              },
        staleCount > 0
          ? {
              label: "查看全部来源状态",
              to: { path: "/sources/status", query: { focus: "all", recent: "24h" } } satisfies RouteLocationRaw,
            }
          : {
              label: "查看来源详情",
              to: visibleSources[0] ? ({ path: `/sources/${visibleSources[0].id}` } satisfies RouteLocationRaw) : ({ path: "/sources/status" } satisfies RouteLocationRaw),
            },
      ],
    };
  }

  return {
    tone: "healthy",
    toneLabel: "整体稳定",
    headline: "当前来源整体运行稳定，暂时没有明显需要优先处理的链路。",
    summary: `当前视图下共 ${visibleSources.length} 个来源，最近运行状态整体正常；其中关联偏利空主题的来源有 ${negativeImpactCount} 个，关联偏利好主题的来源有 ${positiveImpactCount} 个。`,
    priorityItems: ["当前更适合把注意力放到事件和主题判断上，而不是来源故障处理。"],
    actions: [
      negativeImpactCount > 0
        ? {
            label: "查看关联偏利空主题",
            to: { path: "/themes", query: { impact: "negative", sort: "attention" } } satisfies RouteLocationRaw,
          }
        : positiveImpactCount > 0
          ? {
              label: "查看关联偏利好主题",
              to: { path: "/themes", query: { impact: "positive", sort: "attention" } } satisfies RouteLocationRaw,
            }
          : {
              label: "查看主题中心",
              to: { path: "/themes", query: { sort: "attention" } } satisfies RouteLocationRaw,
            },
      {
        label: "查看最近24小时事件",
        to: { path: "/events", query: { recent: "24h", sort: "occurredAt" } } satisfies RouteLocationRaw,
      },
      {
        label: "查看全部来源状态",
        to: { path: "/sources/status", query: { focus: "all", recent: "24h" } } satisfies RouteLocationRaw,
      },
    ],
  };
}

export function buildSourceFilterSummary(
  focusFilter: string,
  impactFilter: string,
  themeLabel: string,
  recentOnly24h: boolean,
  sinceFilter: string,
) {
  const parts = [
    focusFilter === "warning" ? "只看异常来源" : "",
    focusFilter === "pending" ? "只看待运行来源" : "",
    focusFilter === "healthy" ? "只看正常来源" : "",
    themeLabel ? `主题 ${themeLabel}` : "",
    impactFilter === "negative" ? "只看关联偏利空主题来源" : "",
    impactFilter === "positive" ? "只看关联偏利好主题来源" : "",
    impactFilter === "neutral" ? "只看关联中性主题来源" : "",
    recentOnly24h ? "仅最近24小时运行" : "",
    sinceFilter ? `仅看 ${formatDateTimeLabel(sinceFilter)} 之后变化` : "",
  ].filter(Boolean);

  return parts.length ? parts.join(" · ") : "全部来源";
}
