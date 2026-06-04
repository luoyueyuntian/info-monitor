import type { SourceStatus } from "./api";
import { toTimestamp } from "./time";

export function sourcePriorityScore(source: SourceStatus, now = Date.now()) {
  let score = 0;

  if (source.status === "warning" || source.status === "unhealthy") {
    score += 100;
  }

  if (source.latestRunStatus === "failed") {
    score += 80;
  }

  if (source.latestRunStatus === "pending" || source.status === "pending") {
    score += 40;
  }

  if (source.isPaused) {
    score += 20;
  }

  if (source.lastErrorMessage) {
    score += 10;
  }

  const latestActivity = Math.max(
    toTimestamp(source.latestRunAt),
    toTimestamp(source.latestSuccessAt),
    toTimestamp(source.latestFailureAt),
  );

  if (latestActivity > 0 && latestActivity < now - 48 * 60 * 60 * 1000) {
    score += 15;
  }

  return score;
}
