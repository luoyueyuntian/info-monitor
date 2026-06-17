import { workspaceModulesCatalog } from "./catalog";
import { buildWorkspaceSectionPath } from "./navigation";
import type { WorkspaceId, WorkspaceModule, WorkspaceNavItem, WorkspaceSectionId, WorkspaceSectionMeta } from "./types";

const workspaceModules = new Map<WorkspaceId, WorkspaceModule>(
  workspaceModulesCatalog.map((module) => [module.definition.id, module]),
);

export function getWorkspaceModule(workspaceId?: string | null): WorkspaceModule | null {
  if (!workspaceId) {
    return null;
  }

  return workspaceModules.get(workspaceId as WorkspaceId) ?? null;
}

export function getWorkspaceSectionMeta(
  workspaceId: WorkspaceId | string,
  sectionId: WorkspaceSectionId,
): WorkspaceSectionMeta | null {
  return getWorkspaceModule(workspaceId)?.sections[sectionId] ?? null;
}

export function getWorkspaceNavItems(workspaceId: WorkspaceId | string): WorkspaceNavItem[] {
  const module = getWorkspaceModule(workspaceId);
  if (!module) {
    return [];
  }

  return Object.values(module.sections).map((section) => ({
    sectionId: section.id,
    label: section.label,
    to: buildWorkspaceSectionPath(module.definition.id, section.id),
  }));
}
