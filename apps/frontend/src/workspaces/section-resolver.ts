import { defineAsyncComponent, type Component } from "vue";

import type { WorkspaceId, WorkspaceSectionId } from "./types";

export type WorkspaceSectionViewId =
  | "shared/actions"
  | "shared/dashboard"
  | "shared/reports"
  | "shared/sources"
  | "shared/topics"
  | "stock-market/actions"
  | "stock-market/dashboard"
  | "stock-market/reports"
  | "stock-market/topics";

const workspaceSectionOverrides: Partial<Record<WorkspaceId, Partial<Record<WorkspaceSectionId, WorkspaceSectionViewId>>>> = {
  "stock-market": {
    actions: "stock-market/actions",
    dashboard: "stock-market/dashboard",
    reports: "stock-market/reports",
    topics: "stock-market/topics",
  },
};

const sharedSectionViews: Record<WorkspaceSectionId, WorkspaceSectionViewId> = {
  actions: "shared/actions",
  dashboard: "shared/dashboard",
  reports: "shared/reports",
  sources: "shared/sources",
  topics: "shared/topics",
};

// Keep board resolution lazy so one workspace section does not eagerly pull every other board into
// the same chunk.
const sectionComponents: Record<WorkspaceSectionViewId, Component> = {
  "shared/actions": defineAsyncComponent(() => import("../views/workspace/[workspaceId]/actions/components/WorkspaceActionsBoard.vue")),
  "shared/dashboard": defineAsyncComponent(() => import("../views/workspace/[workspaceId]/dashboard/components/WorkspaceDashboardBoard.vue")),
  "shared/reports": defineAsyncComponent(() => import("../views/workspace/[workspaceId]/reports/components/WorkspaceReportsBoard.vue")),
  "shared/sources": defineAsyncComponent(() => import("../views/workspace/[workspaceId]/sources/components/WorkspaceSourcesBoard.vue")),
  "shared/topics": defineAsyncComponent(() => import("../views/workspace/[workspaceId]/topics/components/WorkspaceTopicsBoard.vue")),
  "stock-market/actions": defineAsyncComponent(() => import("../views/workspace/[workspaceId]/actions/components/StockMarketActionsBoard.vue")),
  "stock-market/dashboard": defineAsyncComponent(() => import("../views/workspace/[workspaceId]/dashboard/components/StockMarketDashboardBoard.vue")),
  "stock-market/reports": defineAsyncComponent(() => import("../views/workspace/[workspaceId]/reports/components/StockMarketReportsBoard.vue")),
  "stock-market/topics": defineAsyncComponent(() => import("../views/workspace/[workspaceId]/topics/components/StockMarketTopicsBoard.vue")),
};

export function resolveWorkspaceSectionViewId(
  workspaceId: WorkspaceId | string | null | undefined,
  sectionId: WorkspaceSectionId,
): WorkspaceSectionViewId {
  const overrides = workspaceId ? workspaceSectionOverrides[workspaceId as WorkspaceId] : undefined;
  return overrides?.[sectionId] ?? sharedSectionViews[sectionId];
}

export function resolveWorkspaceSectionComponent(
  workspaceId: WorkspaceId | string | null | undefined,
  sectionId: WorkspaceSectionId,
): Component {
  return sectionComponents[resolveWorkspaceSectionViewId(workspaceId, sectionId)];
}
