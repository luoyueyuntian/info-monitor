import type { EventSummary, ThemeSummary } from "./api";

export type ImpactTone = "positive" | "negative" | "neutral";

type EventImpactInput = {
  infoType?: EventSummary["infoType"] | null;
  signal?: EventSummary["signal"] | null;
};
type ThemeImpactInput = Pick<ThemeSummary, "type" | "latestEventSignal">;

export function impactToneLabel(tone: ImpactTone) {
  switch (tone) {
    case "positive":
      return "偏利好";
    case "negative":
      return "偏利空";
    default:
      return "中性";
  }
}

export function eventImpactTone(event: EventImpactInput): ImpactTone {
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

export function themeImpactTone(theme: ThemeImpactInput): ImpactTone {
  return eventImpactTone({
    infoType: theme.type,
    signal: theme.latestEventSignal ?? null,
  });
}
