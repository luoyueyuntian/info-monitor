import type { FastifyInstance } from "fastify";

import {
  createRuleConfiguration,
  deleteRuleConfiguration,
  getRuleConfiguration,
  listRuleConfigurations,
  updateRuleConfiguration,
} from "../services/rule-config-service.js";

export async function registerRuleConfigurationRoutes(app: FastifyInstance) {
  app.get("/api/rule-configurations", async (request) => {
    const query = request.query as { themeId?: string; ruleKey?: string };
    return listRuleConfigurations(query.themeId, query.ruleKey);
  });

  app.get<{ Params: { configId: string } }>(
    "/api/rule-configurations/:configId",
    async (request, reply) => {
      const config = await getRuleConfiguration(request.params.configId);

      if (!config) {
        reply.code(404);
        return { message: "Rule configuration not found" };
      }

      return config;
    },
  );

  app.post("/api/rule-configurations", async (request, reply) => {
    const body = request.body as {
      ruleKey?: string;
      themeId?: string;
      config?: Record<string, unknown>;
      isEnabled?: boolean;
      priority?: number;
    };

    if (!body?.ruleKey) {
      reply.code(400);
      return { message: "ruleKey is required" };
    }

    return createRuleConfiguration({
      ruleKey: body.ruleKey,
      themeId: body.themeId,
      config: body.config,
      isEnabled: body.isEnabled,
      priority: body.priority,
    });
  });

  app.patch<{ Params: { configId: string } }>(
    "/api/rule-configurations/:configId",
    async (request, reply) => {
      const body = request.body as {
        ruleKey?: string;
        themeId?: string;
        config?: Record<string, unknown>;
        isEnabled?: boolean;
        priority?: number;
      };

      if (!body) {
        reply.code(400);
        return { message: "Request body is required" };
      }

      const updated = await updateRuleConfiguration(
        request.params.configId,
        body,
      );

      if (!updated) {
        reply.code(404);
        return { message: "Rule configuration not found" };
      }

      return updated;
    },
  );

  app.delete<{ Params: { configId: string } }>(
    "/api/rule-configurations/:configId",
    async (request, reply) => {
      const deleted = await deleteRuleConfiguration(request.params.configId);

      if (!deleted) {
        reply.code(404);
        return { message: "Rule configuration not found" };
      }

      return { success: true };
    },
  );
}
