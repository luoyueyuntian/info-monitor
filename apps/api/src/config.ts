import dotenv from "dotenv";

dotenv.config();

function readBooleanEnv(value: string | undefined) {
  if (!value) {
    return false;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export function getConfig() {
  return {
    host: process.env.API_HOST ?? "0.0.0.0",
    port: Number(process.env.API_PORT ?? "3001"),
    corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
    databaseUrl: process.env.DATABASE_URL ?? "",
    requireDatabase: readBooleanEnv(process.env.REQUIRE_DATABASE),
  };
}

export function assertConfigValid() {
  const config = getConfig();

  if (config.requireDatabase && !config.databaseUrl) {
    throw new Error("DATABASE_URL is required when REQUIRE_DATABASE=true. Refusing to start in mock mode.");
  }
}
