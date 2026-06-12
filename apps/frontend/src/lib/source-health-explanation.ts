import type { SourceHealthExplanation } from "./api";

/**
 * Get the CSS class for impact level badge.
 */
export function impactLevelClass(level: SourceHealthExplanation["impactLevel"]): string {
  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-[0.8rem] font-semibold";

  switch (level) {
    case "high":
      return `${base} bg-red-100 text-red-800`;
    case "medium":
      return `${base} bg-amber-100 text-amber-800`;
    case "low":
      return `${base} bg-blue-100 text-blue-800`;
    default:
      return `${base} bg-green-100 text-green-800`;
  }
}

/**
 * Get the label for impact level.
 */
export function impactLevelLabel(level: SourceHealthExplanation["impactLevel"]): string {
  switch (level) {
    case "high":
      return "高影响";
    case "medium":
      return "中影响";
    case "low":
      return "低影响";
    default:
      return "无影响";
  }
}

/**
 * Get the CSS class for health status badge.
 */
export function healthStatusClass(status: SourceHealthExplanation["status"]): string {
  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-[0.8rem] font-semibold";

  switch (status) {
    case "healthy":
      return `${base} bg-green-100 text-green-800`;
    case "warning":
      return `${base} bg-amber-100 text-amber-800`;
    case "paused":
      return `${base} bg-slate-100 text-slate-700`;
    default:
      return `${base} bg-slate-100 text-slate-500`;
  }
}

/**
 * Get the label for health status.
 */
export function healthStatusLabel(status: SourceHealthExplanation["status"]): string {
  switch (status) {
    case "healthy":
      return "健康";
    case "warning":
      return "异常";
    case "paused":
      return "已暂停";
    default:
      return "未知";
  }
}

/**
 * Get the CSS class for issue type badge.
 */
export function issueTypeClass(type: SourceHealthExplanation["issues"][0]["type"]): string {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-[0.75rem] font-medium";

  switch (type) {
    case "fetch_failed":
      return `${base} bg-red-50 text-red-700`;
    case "long_stale":
      return `${base} bg-amber-50 text-amber-700`;
    case "paused":
      return `${base} bg-slate-50 text-slate-600`;
    case "pending_backlog":
      return `${base} bg-blue-50 text-blue-700`;
    case "error_message":
      return `${base} bg-orange-50 text-orange-700`;
    default:
      return `${base} bg-slate-50 text-slate-500`;
  }
}

/**
 * Get the label for issue type.
 */
export function issueTypeLabel(type: SourceHealthExplanation["issues"][0]["type"]): string {
  switch (type) {
    case "fetch_failed":
      return "抓取失败";
    case "long_stale":
      return "数据过期";
    case "paused":
      return "已暂停";
    case "pending_backlog":
      return "排队中";
    case "error_message":
      return "有错误";
    default:
      return "未知";
  }
}

/**
 * Generate a summary of the health explanation for display.
 */
export function healthExplanationSummary(explanation: SourceHealthExplanation): string {
  if (explanation.status === "healthy") {
    return "来源运行正常，数据更新及时。";
  }

  if (explanation.status === "paused") {
    return "来源已暂停，不会自动更新数据。";
  }

  if (explanation.issue) {
    return explanation.issue;
  }

  return "来源存在异常，需要关注。";
}

/**
 * Generate impact description for theme judgment.
 */
export function impactDescription(explanation: SourceHealthExplanation): string {
  switch (explanation.impactLevel) {
    case "high":
      return "可能影响主题判断的准确性，建议优先处理。";
    case "medium":
      return "可能影响数据时效性，建议关注。";
    case "low":
      return "对主题判断影响较小。";
    default:
      return "不影响主题判断。";
  }
}
