import { afterEach, describe, expect, it } from "vitest";

import { assertConfigValid, getConfig } from "./config.js";

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalRequireDatabase = process.env.REQUIRE_DATABASE;

function restoreEnv() {
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }

  if (originalRequireDatabase === undefined) {
    delete process.env.REQUIRE_DATABASE;
  } else {
    process.env.REQUIRE_DATABASE = originalRequireDatabase;
  }
}

afterEach(() => {
  restoreEnv();
});

describe("config", () => {
  it("allows mock mode by default when DATABASE_URL is missing", () => {
    delete process.env.DATABASE_URL;
    delete process.env.REQUIRE_DATABASE;

    expect(getConfig().requireDatabase).toBe(false);
    expect(() => assertConfigValid()).not.toThrow();
  });

  it("requires DATABASE_URL when REQUIRE_DATABASE is true", () => {
    delete process.env.DATABASE_URL;
    process.env.REQUIRE_DATABASE = "true";

    expect(getConfig().requireDatabase).toBe(true);
    expect(() => assertConfigValid()).toThrow(/DATABASE_URL/);
  });

  it("accepts DATABASE_URL when REQUIRE_DATABASE is true", () => {
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/info_monitor";
    process.env.REQUIRE_DATABASE = "true";

    expect(() => assertConfigValid()).not.toThrow();
  });
});
