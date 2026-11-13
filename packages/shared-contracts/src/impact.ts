import type { ImpactTone } from "./index.js";

export function eventImpactTone(event: { signal?: string | null; infoType?: string | null }): ImpactTone {
  switch (event.signal) {
    case "30d_low":
    case "bullish":
    case "liquidity_injection":
      return "positive";
    case "bearish":
    case "liquidity_withdrawal":
      return "negative";
    case "content_update":
    case "new_announcement":
    case "new_financial_event":
      return "neutral";
    default:
      return event.infoType === "content_update" ? "neutral" : "neutral";
  }
}
