import cors from "@fastify/cors";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

import { getConfig } from "./config.js";
import { registerDashboardRoutes } from "./routes/dashboard.js";
import { registerEventRoutes } from "./routes/events.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerNotificationAuditRoutes } from "./routes/notification-audit.js";
import { registerNotificationPreferenceRoutes } from "./routes/notification-preferences.js";
import { registerNotificationRoutes } from "./routes/notifications.js";
import { registerRuleConfigurationRoutes } from "./routes/rule-configurations.js";
import { registerSourceHealthRoutes } from "./routes/source-health.js";
import { registerSourceRoutes } from "./routes/sources.js";
import { registerThemeRoutes } from "./routes/themes.js";
import { registerChannelConfigRoutes } from "./routes/channel-config.js";
import { registerDailySummaryRoutes } from "./routes/daily-summary.js";
import { registerWeeklySummaryRoutes } from "./routes/weekly-summary.js";
import { registerUserPreferencesRoutes } from "./routes/user-preferences.js";
import { registerStockMarketCloseReportRoutes } from "./routes/stock-market-close-report.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function buildApp() {
  const config = getConfig();
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: config.corsOrigin,
  });

  // Register API routes first
  await registerHealthRoutes(app);
  await registerDashboardRoutes(app);
  await registerThemeRoutes(app);
  await registerEventRoutes(app);
  await registerNotificationRoutes(app);
  await registerNotificationAuditRoutes(app);
  await registerNotificationPreferenceRoutes(app);
  await registerRuleConfigurationRoutes(app);
  await registerSourceRoutes(app);
  await registerSourceHealthRoutes(app);
  await registerChannelConfigRoutes(app);
  await registerDailySummaryRoutes(app);
  await registerWeeklySummaryRoutes(app);
  await registerStockMarketCloseReportRoutes(app);
  await registerUserPreferencesRoutes(app);

  // Serve frontend static files
  // __dirname is /app/apps/api/src
  // frontend/dist is at /app/apps/frontend/dist
  const frontendDistPath = path.resolve(__dirname, "../../frontend/dist");

  app.log.info(`Looking for frontend dist at: ${frontendDistPath}`);

  if (fs.existsSync(frontendDistPath)) {
    app.log.info(`Found frontend dist at: ${frontendDistPath}`);
    await app.register(fastifyStatic, {
      root: frontendDistPath,
      prefix: "/",
      decorateReply: true,
    });

    // SPA fallback - serve index.html for non-API routes
    app.setNotFoundHandler((request, reply) => {
      // If it's an API route, return 404
      if (request.url.startsWith("/api/")) {
        reply.code(404).send({
          message: `Route ${request.method}:${request.url} not found`,
          error: "Not Found",
          statusCode: 404,
        });
        return;
      }

      // For all other routes, serve index.html (SPA routing)
      const indexPath = path.join(frontendDistPath, "index.html");
      reply.type("text/html").send(fs.readFileSync(indexPath, "utf-8"));
    });
  } else {
    app.log.warn(`Frontend dist path not found: ${frontendDistPath}`);

    // Fallback 404 handler
    app.setNotFoundHandler((request, reply) => {
      reply.code(404).send({
        message: `Route ${request.method}:${request.url} not found`,
        error: "Not Found",
        statusCode: 404,
      });
    });
  }

  return app;
}
