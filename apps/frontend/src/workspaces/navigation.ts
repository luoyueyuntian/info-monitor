import type { RouteLocationRaw } from "vue-router";

import { buildStockMarketReportRoute } from "./stock-market/navigation";
import type { WorkspaceId, WorkspaceSectionId } from "./types";

type DetailFallbackSection = "actions" | "topics" | "sources";

export function buildWorkspaceSectionPath(workspaceId: WorkspaceId | string, sectionId: WorkspaceSectionId) {
  return `/workspace/${workspaceId}/${sectionId}`;
}

export function buildWorkspaceDetailBackTarget(input: {
  workspaceId?: WorkspaceId | string | null;
  fallbackSection: DetailFallbackSection;
  returnTo?: string | null;
  reportDate?: string | null;
  reportFocus?: string | null;
  sourceThemeId?: string | null;
}): RouteLocationRaw {
  if (input.workspaceId === "stock-market" && input.returnTo === "stock-report") {
    return buildStockMarketReportRoute({
      reportDate: input.reportDate,
      reportFocus: input.reportFocus,
    });
  }

  if (input.workspaceId) {
    return buildWorkspaceSectionPath(input.workspaceId, input.fallbackSection);
  }

  if (input.fallbackSection === "actions") {
    return "/";
  }

  if (input.fallbackSection === "topics") {
    return "/themes";
  }

  if (input.sourceThemeId) {
    return {
      path: "/sources/status",
      query: { themeId: input.sourceThemeId },
    };
  }

  return "/sources/status";
}

export function resolveWorkspaceDetailBackNavigation(input: {
  historyLength: number;
  workspaceId?: WorkspaceId | string | null;
  fallbackSection: DetailFallbackSection;
  returnTo?: string | null;
  reportDate?: string | null;
  reportFocus?: string | null;
  sourceThemeId?: string | null;
}) {
  const target = buildWorkspaceDetailBackTarget(input);
  const shouldPreferExplicitTarget = input.workspaceId === "stock-market" && input.returnTo === "stock-report";

  return {
    useBrowserBack: !shouldPreferExplicitTarget && input.historyLength > 1,
    target,
  };
}
