import type { FastifyInstance } from "fastify";
import { WORKSPACE_IDS } from "@info-monitor/shared-contracts";
import type { WorkspaceId } from "@info-monitor/shared-contracts";
import { getWorkspaceData, getWorkspaceIndex } from "../services/workspace-service.js";

export async function registerWorkspaceRoutes(app: FastifyInstance) {
  app.get("/api/workspaces", () => getWorkspaceIndex());
  app.get<{ Params: { workspaceId: WorkspaceId } }>("/api/workspaces/:workspaceId", {
    schema: { params: { type: "object", required: ["workspaceId"], properties: { workspaceId: { type: "string", enum: WORKSPACE_IDS } } } },
  }, (request) => getWorkspaceData(request.params.workspaceId));
}
