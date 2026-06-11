import cors from "@fastify/cors";
import Fastify from "fastify";

import { getConfig } from "./config.js";
import { registerDashboardRoutes } from "./routes/dashboard.js";
import { registerEventRoutes } from "./routes/events.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerNotificationRoutes } from "./routes/notifications.js";
import { registerSourceRoutes } from "./routes/sources.js";
import { registerThemeRoutes } from "./routes/themes.js";

export async function buildApp() {
  const config = getConfig();
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: config.corsOrigin,
  });

  await registerHealthRoutes(app);
  await registerDashboardRoutes(app);
  await registerThemeRoutes(app);
  await registerEventRoutes(app);
  await registerNotificationRoutes(app);
  await registerSourceRoutes(app);

  return app;
}
