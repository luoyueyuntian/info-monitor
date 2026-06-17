import type { EventSummary, ThemeSummary } from "../../lib/api";
import {
  sortWorkspaceEvents,
  type WorkspaceDataset,
} from "../../lib/workspaces";

export type CompetitorActionType =
  | "feature_release"
  | "pricing_packaging"
  | "campaign_content"
  | "docs_support"
  | "other";

export type CompetitorActionPulse = {
  actionType: CompetitorActionType;
  count: number;
  openCount: number;
};

export type CompetitorFocusObject = {
  objectName: string;
  eventCount: number;
  openCount: number;
  latestOccurredAt: string | null;
};

export type CompetitorActionBucket = {
  actionType: CompetitorActionType;
  events: EventSummary[];
};

export type CompetitorTopicCard = {
  theme: ThemeSummary;
  objectName: string;
  latestActionType: CompetitorActionType;
  latestOccurredAt: string | null;
  openCount: number;
  trackingCount: number;
  sourceCount: number;
  recommendation: string;
};

const competitorActionTypes: CompetitorActionType[] = [
  "feature_release",
  "pricing_packaging",
  "campaign_content",
  "docs_support",
  "other",
];

function readContextString(event: EventSummary, key: string) {
  const value = event.context?.[key];
  return typeof value === "string" ? value.trim() : "";
}

export function resolveCompetitorObjectName(event: EventSummary, theme?: ThemeSummary | null) {
  return readContextString(event, "object_name") || theme?.name || event.themeName;
}

export function resolveCompetitorActionType(event: EventSummary): CompetitorActionType {
  const structured = readContextString(event, "update_type");
  if (structured === "feature_release") {
    return "feature_release";
  }

  const text = `${event.title} ${event.summary}`.toLowerCase();
  if (/(feature|release|version|update|dev mode|changelog)/i.test(text)) {
    return "feature_release";
  }
  if (/(pricing|plan|package|enterprise|billing)/i.test(text)) {
    return "pricing_packaging";
  }
  if (/(campaign|activity|launch|social|content|marketing)/i.test(text)) {
    return "campaign_content";
  }
  if (/(help|docs|guide|support|faq)/i.test(text)) {
    return "docs_support";
  }
  return "other";
}

export function buildCompetitorPulse(dataset: WorkspaceDataset, _nowValue: Date): CompetitorActionPulse[] {
  return competitorActionTypes
    .map((actionType) => ({
      actionType,
      count: dataset.events.filter((event) => resolveCompetitorActionType(event) === actionType).length,
      openCount: dataset.events.filter(
        (event) => resolveCompetitorActionType(event) === actionType && (event.status ?? "open") === "open",
      ).length,
    }))
    .filter((item) => item.count > 0);
}

export function buildCompetitorFocusList(dataset: WorkspaceDataset, _nowValue: Date): CompetitorFocusObject[] {
  const themeById = new Map(dataset.themes.map((theme) => [theme.id, theme]));
  const byObject = new Map<string, CompetitorFocusObject>();

  for (const event of dataset.events) {
    const objectName = resolveCompetitorObjectName(event, themeById.get(event.themeId));
    const current = byObject.get(objectName) ?? {
      objectName,
      eventCount: 0,
      openCount: 0,
      latestOccurredAt: null,
    };

    current.eventCount += 1;
    if ((event.status ?? "open") === "open") {
      current.openCount += 1;
    }
    if (
      !current.latestOccurredAt ||
      new Date(event.occurredAt).getTime() > new Date(current.latestOccurredAt).getTime()
    ) {
      current.latestOccurredAt = event.occurredAt;
    }

    byObject.set(objectName, current);
  }

  return [...byObject.values()].sort((left, right) => {
    if (right.eventCount !== left.eventCount) {
      return right.eventCount - left.eventCount;
    }

    return new Date(right.latestOccurredAt ?? 0).getTime() - new Date(left.latestOccurredAt ?? 0).getTime();
  });
}

export function buildCompetitorActionBuckets(dataset: WorkspaceDataset, _nowValue: Date): CompetitorActionBucket[] {
  const sortedEvents = sortWorkspaceEvents(dataset.events);

  return competitorActionTypes
    .map((actionType) => ({
      actionType,
      events: sortedEvents.filter((event) => resolveCompetitorActionType(event) === actionType),
    }))
    .filter((bucket) => bucket.events.length > 0);
}

export function buildCompetitorTopicCards(dataset: WorkspaceDataset, _nowValue: Date): CompetitorTopicCard[] {
  return dataset.themes.map((theme) => {
    const themeEvents = dataset.events.filter((event) => event.themeId === theme.id);
    const themeSources = dataset.sources.filter((source) => source.themeId === theme.id);
    const latestEvent = sortWorkspaceEvents(themeEvents)[0] ?? null;
    const openCount = themeEvents.filter((event) => (event.status ?? "open") === "open").length;
    const trackingCount = themeEvents.filter((event) => event.status === "tracking").length;

    return {
      theme,
      objectName: latestEvent ? resolveCompetitorObjectName(latestEvent, theme) : theme.name,
      latestActionType: latestEvent ? resolveCompetitorActionType(latestEvent) : "other",
      latestOccurredAt: latestEvent?.occurredAt ?? theme.latestEventAt ?? null,
      openCount,
      trackingCount,
      sourceCount: themeSources.length,
      recommendation:
        theme.sourceHealth === "warning"
          ? "优先验证来源，再继续基于这个对象做判断。"
          : openCount > 0
            ? "当前仍有待判断动作，建议先完成首轮分诊。"
            : trackingCount > 0
              ? "这个对象已经进入持续跟踪，适合结合时间线低频回看。"
              : "当前节奏稳定，可以继续观察下一轮动作。",
    };
  });
}
