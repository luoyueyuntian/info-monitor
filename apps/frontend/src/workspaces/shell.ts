import { getWorkspaceModule, getWorkspaceNavItems } from "./registry";
import { workspaceSectionIds, type WorkspaceId, type WorkspaceSectionId } from "./types";

export type WorkspaceShellState = {
  currentSection: {
    id: WorkspaceSectionId;
    label: string;
    description: string;
  };
  navItems: ReturnType<typeof getWorkspaceNavItems>;
  workspace: NonNullable<ReturnType<typeof getWorkspaceModule>>["definition"];
};

export function getWorkspaceSectionIdFromPath(path: string): WorkspaceSectionId | null {
  const segments = path.split("/").filter(Boolean);
  if (segments[0] !== "workspace" || segments.length < 3) {
    return null;
  }

  const sectionId = segments[2] as WorkspaceSectionId;
  return workspaceSectionIds.includes(sectionId) ? sectionId : null;
}

export function buildWorkspaceShellState(workspaceId: WorkspaceId | string | null | undefined, path: string): WorkspaceShellState | null {
  const module = getWorkspaceModule(workspaceId);
  if (!module) {
    return null;
  }

  const currentSectionId = getWorkspaceSectionIdFromPath(path) ?? "dashboard";
  return {
    currentSection: module.sections[currentSectionId],
    navItems: getWorkspaceNavItems(module.definition.id),
    workspace: module.definition,
  };
}
