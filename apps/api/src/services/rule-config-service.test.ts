import { describe, expect, it } from "vitest";

import {
  createRuleConfiguration,
  deleteRuleConfiguration,
  getEffectiveRuleConfig,
  getRuleConfiguration,
  listRuleConfigurations,
  updateRuleConfiguration,
} from "./rule-config-service.js";

describe("rule-config-service", () => {
  it("requires DATABASE_URL for rule config reads and writes", async () => {
    await expect(listRuleConfigurations()).rejects.toThrow(/DATABASE_URL/);
    await expect(getRuleConfiguration("rule-price-30d-low-theme-surface-pro-8")).rejects.toThrow(/DATABASE_URL/);
    await expect(createRuleConfiguration({ ruleKey: "price_30d_low" })).rejects.toThrow(/DATABASE_URL/);
    await expect(updateRuleConfiguration("rule-price-30d-low-theme-surface-pro-8", { priority: 1 })).rejects.toThrow(/DATABASE_URL/);
    await expect(deleteRuleConfiguration("rule-price-30d-low-theme-surface-pro-8")).rejects.toThrow(/DATABASE_URL/);
    await expect(getEffectiveRuleConfig("price_30d_low", "theme-surface-pro-8")).rejects.toThrow(/DATABASE_URL/);
  });
});
