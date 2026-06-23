import { buildApp } from "./app.js";
import { assertConfigValid, getConfig } from "./config.js";
import { startDailySummaryScheduler } from "./services/daily-summary-scheduler.js";
import { startStockMarketCloseReportScheduler } from "./services/stock-market-close-report-scheduler.js";
import { startStockMarketCloseReportDeliveryScheduler } from "./services/stock-market-close-report-delivery-scheduler.js";

async function main() {
  assertConfigValid();
  const config = getConfig();
  const app = await buildApp();

  try {
    await app.listen({
      host: config.host,
      port: config.port,
    });

    // Start background schedulers after server is listening
    startDailySummaryScheduler();
    startStockMarketCloseReportScheduler();
    startStockMarketCloseReportDeliveryScheduler();
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void main();
