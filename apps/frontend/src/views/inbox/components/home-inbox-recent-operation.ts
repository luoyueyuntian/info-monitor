import type { RecentEventOperation } from "../../../lib/recent-event-operation";
import { toTimestamp } from "../../../lib/time";

export function buildRecentOperationDiagnostic(operation: RecentEventOperation | null) {
  if (!operation) {
    return null;
  }

  const ageMs = Date.now() - toTimestamp(operation.recordedAt);
  const maxAgeMs = 6 * 60 * 60 * 1000;

  if (ageMs <= 0 || ageMs > maxAgeMs) {
    return null;
  }

  const themeId = operation.themeId;
  const themeName = operation.themeName ?? "该主题";
  const eventLabel = operation.count > 1 ? `${operation.count} 条事件` : `事件「${operation.eventTitle ?? "当前事件"}」`;

  if (operation.action === "tracking") {
    return {
      tone: "pending",
      toneLabel: "处理推进中",
      headline: "你刚把一批待处理事件推进到了持续跟进阶段",
      summary: `${eventLabel} 已转为关注中，当前更适合回看主题趋势、分析或时间线，确认这次变化是否会继续强化。`,
      priorityItems: [
        operation.infoType === "price"
          ? `${themeName}：下一步更适合确认价格趋势和最低来源是否还在持续。`
          : operation.infoType === "financial_event"
            ? `${themeName}：下一步更适合确认最近几轮方向是否继续一致。`
            : `${themeName}：下一步更适合回看时间线，确认是否还需要继续升级。`,
      ],
      actions: [
        themeId
          ? {
              label: operation.infoType === "price" ? `查看 ${themeName} 趋势` : `查看 ${themeName} 主题`,
              to: { path: `/themes/${themeId}`, query: { section: operation.infoType === "price" ? "trend" : "analysis" } },
            }
          : { label: "查看事件工作台", to: { path: "/events", query: { status: "tracking", sort: "statusChanged" } } },
        { label: "查看关注中事件", to: { path: "/events", query: { status: "tracking", sort: "statusChanged", themeId } } },
      ],
    };
  }

  if (operation.action === "bookmark") {
    return {
      tone: "pending",
      toneLabel: "已纳入长期观察",
      headline: "你刚把一批事件沉淀进了长期观察链",
      summary: `${eventLabel} 已加入收藏，后续更适合在每日处理完成后再做低频回看，而不是继续停留在主处理链里。`,
      priorityItems: [
        `${themeName}：如果后续又出现新信号，可以在长期观察和当前处理链之间来回切换。`,
      ],
      actions: [
        { label: "查看观察清单", to: { path: "/watchlist" } },
        { label: "查看收藏事件", to: { path: "/events", query: { bookmark: "bookmarked", sort: "bookmarkedAt", themeId } } },
      ],
    };
  }

  if (operation.action === "ignored") {
    return {
      tone: "healthy",
      toneLabel: "主链已收敛",
      headline: "你刚把一批事件从当前主处理链里移出",
      summary: `${eventLabel} 已标记为已忽略，当前更适合回到其他待处理主题，而不是继续在这批事件上花精力。`,
      priorityItems: [
        `${themeName}：如果后续信号再次强化，仍可以从时间线或事件历史里重新拉回处理链。`,
      ],
      actions: [
        { label: "查看已忽略事件", to: { path: "/events", query: { status: "ignored", sort: "occurredAt", themeId } } },
        { label: "查看主题中心", to: { path: "/themes", query: { sort: "attention" } } },
      ],
    };
  }

  if (operation.action === "read") {
    return {
      tone: "healthy",
      toneLabel: "首轮巡检已推进",
      headline: "你刚完成了一轮事件首读",
      summary: `${eventLabel} 已标记为已读，首页和事件工作台会更偏向尚未巡检的新线索。`,
      priorityItems: [
        `${themeName}：如果还没有转入关注中或收藏，当前更适合回到其他未读主题继续巡检。`,
      ],
      actions: [
        { label: "查看未读事件", to: { path: "/events", query: { read: "unread", sort: "occurredAt", themeId } } },
        { label: "查看主题中心", to: { path: "/themes", query: { queue: "unread", sort: "attention" } } },
      ],
    };
  }

  if (operation.action === "unread") {
    return {
      tone: "pending",
      toneLabel: "重新回到巡检链",
      headline: "你刚把一批事件重新拉回了未读巡检链",
      summary: `${eventLabel} 已恢复为未读，后续更适合回到事件区或未读视图重新判断。`,
      priorityItems: [
        `${themeName}：如果这是因为判断还不够稳，下一步更适合重新做一轮快速复核。`,
      ],
      actions: [
        { label: "查看未读事件", to: { path: "/events", query: { read: "unread", sort: "occurredAt", themeId } } },
        themeId
          ? { label: `回到 ${themeName} 事件区`, to: { path: `/themes/${themeId}`, query: { section: "events" } } }
          : { label: "查看主题中心", to: { path: "/themes", query: { queue: "unread", sort: "attention" } } },
      ],
    };
  }

  if (operation.action === "open") {
    return {
      tone: "warning",
      toneLabel: "重新回到主链",
      headline: "你刚把一批事件重新拉回了待处理链",
      summary: `${eventLabel} 已重新标记为待处理，当前更适合尽快回到事件区继续确认，而不是把它留在关注中或已忽略状态。`,
      priorityItems: [
        `${themeName}：这通常意味着原先判断还不够稳，下一步更适合继续处理该主题事件。`,
      ],
      actions: [
        { label: "查看待处理事件", to: { path: "/events", query: { status: "open", sort: "statusChanged", themeId } } },
        themeId
          ? { label: `回到 ${themeName} 事件区`, to: { path: `/themes/${themeId}`, query: { section: "events" } } }
          : { label: "查看主题中心", to: { path: "/themes", query: { queue: "open", sort: "attention" } } },
      ],
    };
  }

  return {
    tone: "healthy",
    toneLabel: "观察链已收敛",
    headline: "最近操作已经让工作流结构发生了变化",
    summary: `${eventLabel} 的状态刚刚被调整，首页和主题中心的优先项也会跟着变化。`,
    priorityItems: [
      `${themeName}：可以顺手回看首页诊断和主题中心，确认当前主处理链是否已经发生切换。`,
    ],
    actions: [
      { label: "查看事件工作台", to: { path: "/events", query: { sort: "statusChanged", themeId } } },
      { label: "查看主题中心", to: { path: "/themes", query: { sort: "attention" } } },
    ],
  };
}
