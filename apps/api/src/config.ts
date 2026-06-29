import dotenv from "dotenv";

dotenv.config();

export function getConfig() {
  return {
    host: process.env.API_HOST ?? "0.0.0.0",
    port: Number(process.env.API_PORT ?? "3001"),
    corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
    databaseUrl: process.env.DATABASE_URL ?? "",
    meiliHost: process.env.MEILI_HOST ?? "",
    meiliApiKey: process.env.MEILI_API_KEY ?? "",
  };
}

export function assertConfigValid() {
  const config = getConfig();

  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL is required. Runtime mock mode has been removed.");
  }
}
