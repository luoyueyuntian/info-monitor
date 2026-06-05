import type { ThemeSummary } from "./api";
import { themeImpactTone } from "./impact";
import { toTimestamp } from "./time";

export function themeHealthRank(value?: string | null) {
  if (value === "warning") {
    return 2;
  }

  if (value === "healthy") {
    return 1;
  }

  return 0;
}

export function hasRecentThemeActivity(theme: ThemeSummary, now = Date.now()) {
  const threshold = now - 24 * 60 * 60 * 1000;
  const latestEvent = toTimestamp(theme.latestEventAt);
  const latestRun = toTimestamp(theme.latestRunAt);
  const latest = Math.max(latestEvent, latestRun);

  return latest > threshold;
}

export function themePriorityScore(theme: ThemeSummary) {
  return (
    themeHealthRank(theme.sourceHealth) * 1_000_000_000_000 +
    toTimestamp(theme.latestEventAt) * 1_000 +
    toTimestamp(theme.latestRunAt)
  );
}

export function themeLatestBookmarkedScore(theme: ThemeSummary) {
  return toTimestamp(theme.latestBookmarkedAt);
}

export function themeAttentionScore(theme: ThemeSummary, now = Date.now()) {
  let score = 0;

  if (theme.sourceHealth === "warning") {
    score += 100;
  }

  if (theme.status === "paused") {
    score += 20;
  }

  score += (theme.openEventCount ?? 0) * 25;
  score += (theme.trackingEventCount ?? 0) * 10;
  score += (theme.unreadEventCount ?? 0) * 8;
  score += (theme.bookmarkedEventCount ?? 0) * 6;

  if (theme.latestEventSignal === "30d_low") {
    score += 50;
  } else if (theme.latestEventSignal === "new_financial_event" || theme.latestEventSignal === "new_announcement") {
    score += 35;
  } else if (themeImpactTone(theme) === "negative") {
    score += 40;
  } else if (themeImpactTone(theme) === "positive") {
    score += 35;
  }

  if (hasRecentThemeActivity(theme, now)) {
    score += 20;
  }

  const latestActivity = Math.max(toTimestamp(theme.latestEventAt), toTimestamp(theme.latestRunAt));
  if (latestActivity > 0 && latestActivity < now - 72 * 60 * 60 * 1000) {
    score += 10;
  }

  return score;
}
