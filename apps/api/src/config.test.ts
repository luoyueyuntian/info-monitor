import { afterEach, describe, expect, it } from "vitest";

import { assertConfigValid, getConfig } from "./config.js";

const originalDatabaseUrl = process.env.DATABASE_URL;

function restoreEnv() {
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }
}

afterEach(() => {
  restoreEnv();
});

describe("config", () => {
  it("requires DATABASE_URL by default", () => {
    delete process.env.DATABASE_URL;
    expect(() => assertConfigValid()).toThrow(/DATABASE_URL/);
  });

  it("accepts DATABASE_URL when configured", () => {
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/info_monitor";

    expect(() => assertConfigValid()).not.toThrow();
    expect(getConfig().databaseUrl).toContain("info_monitor");
  });
});
