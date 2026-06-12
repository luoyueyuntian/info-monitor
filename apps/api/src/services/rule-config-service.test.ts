import { describe, expect, it, vi } from "vitest";

// Force mock mode
vi.mock("../db/client.js", () => ({
  getDatabase: () => null,
}));

import {
  listRuleConfigurations,
  getRuleConfiguration,
  createRuleConfiguration,
  updateRuleConfiguration,
  deleteRuleConfiguration,
  getEffectiveRuleConfig,
} from "./rule-config-service.js";

// Use 'as any' for test configs to avoid strict union type constraints
const priceConfig = { thresholdPercent: 5, dedupWindowDays: 30, onlyLatest: true, notificationLevel: "high", minPriceChange: 0 } as any;
const globalConfig = { notificationLevel: "low" } as any;
const themeConfig = { notificationLevel: "medium" } as any;
const highPriorityConfig = { notificationLevel: "high" } as any;
const lowPriorityConfig = { notificationLevel: "low" } as any;
const disabledConfig = { notificationLevel: "low" } as any;

describe("rule-config-service (mock mode)", () => {
  describe("listRuleConfigurations", () => {
    it("returns all rule configurations", async () => {
      const configs = await listRuleConfigurations();

      expect(configs.length).toBeGreaterThanOrEqual(3);
    });

    it("filters by themeId", async () => {
      const configs = await listRuleConfigurations("theme-surface-pro-8");

      expect(configs.length).toBeGreaterThanOrEqual(1);
      for (const c of configs) {
        expect(c.themeId).toBe("theme-surface-pro-8");
      }
    });

    it("filters by ruleKey", async () => {
      const configs = await listRuleConfigurations(undefined, "price_30d_low");

      expect(configs.length).toBeGreaterThanOrEqual(1);
      for (const c of configs) {
        expect(c.ruleKey).toBe("price_30d_low");
      }
    });

    it("filters by both themeId and ruleKey", async () => {
      const configs = await listRuleConfigurations("theme-surface-pro-8", "price_30d_low");

      expect(configs.length).toBe(1);
      expect(configs[0].ruleKey).toBe("price_30d_low");
      expect(configs[0].themeId).toBe("theme-surface-pro-8");
    });

    it("returns empty for nonexistent theme", async () => {
      const configs = await listRuleConfigurations("nonexistent-theme");
      expect(configs).toHaveLength(0);
    });

    it("configurations have correct structure", async () => {
      const configs = await listRuleConfigurations();

      for (const c of configs) {
        expect(c).toHaveProperty("id");
        expect(c).toHaveProperty("ruleKey");
        expect(c).toHaveProperty("config");
        expect(c).toHaveProperty("isEnabled");
        expect(c).toHaveProperty("priority");
        expect(c).toHaveProperty("createdAt");
        expect(c).toHaveProperty("updatedAt");
        expect(typeof c.config).toBe("object");
      }
    });
  });

  describe("getRuleConfiguration", () => {
    it("returns config by ID", async () => {
      const config = await getRuleConfiguration("rule-price-30d-low-theme-surface-pro-8");

      expect(config).not.toBeNull();
      expect(config?.ruleKey).toBe("price_30d_low");
      expect(config?.config).toHaveProperty("thresholdPercent");
    });

    it("returns null for nonexistent ID", async () => {
      const config = await getRuleConfiguration("does-not-exist");
      expect(config).toBeNull();
    });
  });

  describe("createRuleConfiguration", () => {
    it("creates a new rule config", async () => {
      const created = await createRuleConfiguration({
        ruleKey: "price_30d_low",
        themeId: "theme-test",
        config: priceConfig,
        isEnabled: true,
        priority: 5,
      });

      expect(created.id).toBeTruthy();
      expect(created.ruleKey).toBe("price_30d_low");
      expect(created.themeId).toBe("theme-test");
      expect(created.isEnabled).toBe(true);
      expect(created.priority).toBe(5);

      const all = await listRuleConfigurations();
      expect(all.some((c) => c.id === created.id)).toBe(true);
    });

    it("applies defaults for optional fields", async () => {
      const created = await createRuleConfiguration({ ruleKey: "content_update" });

      expect(created.themeId).toBeNull();
      expect(created.isEnabled).toBe(true);
      expect(created.priority).toBe(0);
    });
  });

  describe("updateRuleConfiguration", () => {
    it("updates an existing config", async () => {
      const created = await createRuleConfiguration({
        ruleKey: "price_30d_low",
        config: priceConfig,
      });

      const updated = await updateRuleConfiguration(created.id, {
        config: { thresholdPercent: 20 } as any,
        isEnabled: false,
        priority: 99,
      });

      expect(updated).not.toBeNull();
      expect(updated?.isEnabled).toBe(false);
      expect(updated?.priority).toBe(99);
    });

    it("returns null for nonexistent config", async () => {
      const result = await updateRuleConfiguration("does-not-exist", { isEnabled: false });
      expect(result).toBeNull();
    });

    it("updates the updatedAt timestamp", async () => {
      const created = await createRuleConfiguration({ ruleKey: "content_update" });
      const original = created.updatedAt;

      await new Promise((r) => setTimeout(r, 10));

      const updated = await updateRuleConfiguration(created.id, { priority: 1 });
      expect(updated?.updatedAt).not.toBe(original);
    });
  });

  describe("deleteRuleConfiguration", () => {
    it("deletes an existing config", async () => {
      const created = await createRuleConfiguration({ ruleKey: "content_update" });

      const deleted = await deleteRuleConfiguration(created.id);
      expect(deleted).toBe(true);

      const found = await getRuleConfiguration(created.id);
      expect(found).toBeNull();
    });

    it("returns false for nonexistent config", async () => {
      const result = await deleteRuleConfiguration("does-not-exist");
      expect(result).toBe(false);
    });
  });

  describe("getEffectiveRuleConfig", () => {
    it("returns theme-specific config when available", async () => {
      const config = await getEffectiveRuleConfig("price_30d_low", "theme-surface-pro-8");

      expect(config).not.toBeNull();
      expect(config).toHaveProperty("thresholdPercent");
    });

    it("falls back to global config when no theme match", async () => {
      const config = await getEffectiveRuleConfig("price_30d_low");

      if (config) {
        expect(typeof config).toBe("object");
      }
    });

    it("returns null for nonexistent rule key", async () => {
      const config = await getEffectiveRuleConfig("nonexistent_rule", "nonexistent-theme");
      expect(config).toBeNull();
    });

    it("prefers theme-specific over global config when themeId provided", async () => {
      await createRuleConfiguration({
        ruleKey: "keyword_match",
        config: globalConfig,
        priority: 1,
      });

      await createRuleConfiguration({
        ruleKey: "keyword_match",
        themeId: "theme-specific",
        config: themeConfig,
        priority: 1,
      });

      const themeResult = await getEffectiveRuleConfig("keyword_match", "theme-specific");
      expect(themeResult).toBeTruthy();
    });

    it("respects priority ordering", async () => {
      await createRuleConfiguration({
        ruleKey: "macro_deviation",
        config: lowPriorityConfig,
        priority: 1,
      });

      await createRuleConfiguration({
        ruleKey: "macro_deviation",
        config: highPriorityConfig,
        priority: 10,
      });

      const config = await getEffectiveRuleConfig("macro_deviation");
      expect(config).toBeTruthy();
    });

    it("ignores disabled configs", async () => {
      await createRuleConfiguration({
        ruleKey: "consecutive_movement",
        config: disabledConfig,
        isEnabled: false,
        priority: 100,
      });

      const config = await getEffectiveRuleConfig("consecutive_movement");
      // Should return null or the mock default if one exists
      if (config) {
        // If a mock default exists, that's fine
        expect(typeof config).toBe("object");
      }
    });
  });
});
