import { eventImpactTone } from "@info-monitor/shared-contracts";
export { eventImpactTone } from "@info-monitor/shared-contracts";
import type { ImpactTone } from "@info-monitor/shared-contracts";
import type { EventSummary, ThemeSummary } from "./api";

export type { ImpactTone };

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


export function themeImpactTone(theme: ThemeImpactInput): ImpactTone {
  return eventImpactTone({
    infoType: theme.type as string,
    signal: theme.latestEventSignal ?? null,
  });
}
