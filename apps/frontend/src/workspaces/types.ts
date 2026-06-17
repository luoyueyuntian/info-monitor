import type { WorkspaceId as SharedWorkspaceId } from "@info-monitor/shared-contracts";

export type WorkspaceId = SharedWorkspaceId;

export const workspaceSectionIds = ["dashboard", "actions", "topics", "sources", "reports"] as const;

export type WorkspaceSectionId = (typeof workspaceSectionIds)[number];

export type WorkspaceDefinition = {
  id: WorkspaceId;
  label: string;
  shortLabel: string;
  description: string;
  summary: string;
  emptyTitle: string;
  emptyBody: string;
};

export type WorkspaceSectionMeta = {
  id: WorkspaceSectionId;
  label: string;
  description: string;
};

export type WorkspaceModule = {
  definition: WorkspaceDefinition;
  sections: Record<WorkspaceSectionId, WorkspaceSectionMeta>;
};

export type WorkspaceNavItem = {
  sectionId: WorkspaceSectionId;
  label: string;
  to: string;
};
