import { describe, expect, it } from "vitest";

import { eventImpactTone, impactToneLabel, themeImpactTone } from "./impact";

describe("impact", () => {
  it("maps event signals into impact tones", () => {
    expect(eventImpactTone({ infoType: "price", signal: "30d_low" })).toBe("positive");
    expect(eventImpactTone({ infoType: "financial_event", signal: "liquidity_withdrawal" })).toBe("negative");
    expect(eventImpactTone({ infoType: "content_update", signal: "content_update" })).toBe("neutral");
  });

  it("maps theme latest signals into impact tones", () => {
    expect(themeImpactTone({ type: "financial_event", latestEventSignal: "bullish" })).toBe("positive");
    expect(themeImpactTone({ type: "news_announcement", latestEventSignal: "bearish" })).toBe("negative");
    expect(themeImpactTone({ type: "content_update", latestEventSignal: "content_update" })).toBe("neutral");
  });

  it("formats impact labels for UI", () => {
    expect(impactToneLabel("positive")).toBe("偏利好");
    expect(impactToneLabel("negative")).toBe("偏利空");
    expect(impactToneLabel("neutral")).toBe("中性");
  });
});
