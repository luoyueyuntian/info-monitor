import { buildApp } from "./app.js";
import { getConfig } from "./config.js";
import { startDailySummaryScheduler } from "./services/daily-summary-scheduler.js";

async function main() {
  const config = getConfig();
  const app = await buildApp();

  try {
    await app.listen({
      host: config.host,
      port: config.port,
    });

    // Start background schedulers after server is listening
    startDailySummaryScheduler();
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void main();
