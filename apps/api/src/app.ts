import { registerContentRoutes } from "./routes/content.js";
import { registerRuntimeMetrics } from "./lib/runtime-metrics.js";
import { registerWorkspaceRoutes } from "./routes/workspaces.js";
import { invalidateWorkspaceCache } from "./services/workspace-service.js";
import cors from "@fastify/cors";
import compress from "@fastify/compress";
import { constants as zlibConstants } from "node:zlib";
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
import { registerEventStreamRoutes } from "./routes/events-stream.js";
import { registerSearchRoutes } from "./routes/search.js";
import { registerBacktestRoutes } from "./routes/backtest.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function buildApp() {
  const config = getConfig();
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: config.corsOrigin,
  });
  await app.register(compress, {
    globalDecompression: false, encodings: ["br", "gzip"], threshold: 1024,
    brotliOptions: { params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 4 } },
    zlibOptions: { level: 4 },
  });

  app.addHook("onSend", async (request, reply, payload) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && reply.statusCode >= 200 && reply.statusCode < 300) invalidateWorkspaceCache();
    return payload;
  });
  await registerRuntimeMetrics(app);
  await registerWorkspaceRoutes(app);

  // Register API routes first
  await registerHealthRoutes(app);
  await registerDashboardRoutes(app);
  await registerThemeRoutes(app);
  await registerContentRoutes(app);
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
  await registerEventStreamRoutes(app);
  await registerSearchRoutes(app);
  await registerBacktestRoutes(app);

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
      cacheControl: false,
      setHeaders(response, filePath) {
        if (filePath.startsWith(path.join(frontendDistPath, "assets") + path.sep)) {
          response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        } else if (path.basename(filePath) === "index.html") {
          response.setHeader("Cache-Control", "no-cache");
        }
      },
    });

    // SPA fallback - serve index.html for non-API routes
    app.setNotFoundHandler((request, reply) => {
      // If it's an API route, return 404
      if (request.url.startsWith("/api/") || request.url.startsWith("/assets/")) {
        reply.code(404).send({
          message: `Route ${request.method}:${request.url} not found`,
          error: "Not Found",
          statusCode: 404,
        });
        return;
      }

      // For all other routes, serve index.html (SPA routing)
      const indexPath = path.join(frontendDistPath, "index.html");
      reply.header("Cache-Control", "no-cache").type("text/html").send(fs.readFileSync(indexPath, "utf-8"));
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
