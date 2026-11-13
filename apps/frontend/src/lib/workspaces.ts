import { selectWorkspaceDataset } from "@info-monitor/shared-contracts";
import type { EventSummary, SourceStatus, ThemeSummary, WorkspaceDataset as WorkspaceData } from "@info-monitor/shared-contracts";
import { workspaceDefinitions } from "../workspaces/catalog";
import type { WorkspaceDefinition, WorkspaceId } from "../workspaces/types";

export type { WorkspaceDefinition, WorkspaceId };
export type { WorkspaceSummary, WorkspacePriority, WorkspaceStatus } from "@info-monitor/shared-contracts";
export { classifyThemeWorkspace, workspaceReferenceNow, scoreWorkspaceEventPriority,
  workspacePriorityLabel, workspaceStatusLabel, workspaceStatusTone, buildWorkspaceSummary,
  sortWorkspaceEvents, workspaceTopicHealthTone } from "@info-monitor/shared-contracts";
export { workspaceDefinitions };
export type WorkspaceDataset = WorkspaceData & { workspace: WorkspaceDefinition };

export function getWorkspaceDefinition(workspaceId?: string | null) {
  return workspaceDefinitions.find((workspace) => workspace.id === workspaceId) ?? null;
}
export function buildWorkspaceDataset(workspaceId: WorkspaceId, themes: ThemeSummary[], events: EventSummary[], sources: SourceStatus[]): WorkspaceDataset {
  return { workspace: getWorkspaceDefinition(workspaceId) ?? workspaceDefinitions[0],
    ...selectWorkspaceDataset(workspaceId, themes, events, sources) };
}
