import { describe, expect, it } from "vitest";

import { fallbackEvents, fallbackSources, fallbackThemes } from "../../test-fixtures/demo-fixtures";
import { buildWorkspaceDataset, workspaceReferenceNow } from "../../lib/workspaces";
import {
  buildCompetitorActionBuckets,
  buildCompetitorFocusList,
  buildCompetitorPulse,
  buildCompetitorTopicCards,
  resolveCompetitorActionType,
  resolveCompetitorObjectName,
} from "./intelligence";

describe("competitor workspace intelligence", () => {
  const dataset = buildWorkspaceDataset("competitor-watch", fallbackThemes, fallbackEvents, fallbackSources);
  const nowValue = workspaceReferenceNow(dataset);
  const figmaEvent = dataset.events.find((event) => event.themeName === "Figma Product Updates");
  const figmaTheme = dataset.themes.find((theme) => theme.name === "Figma Product Updates");

  it("resolves object names and action types from structured content update fields", () => {
    expect(figmaEvent).toBeTruthy();
    expect(figmaTheme).toBeTruthy();
    expect(resolveCompetitorObjectName(figmaEvent!, figmaTheme!)).toBe("Figma");
    expect(resolveCompetitorActionType(figmaEvent!)).toBe("feature_release");
  });

  it("builds dashboard pulse and focus data from current competitor events", () => {
    expect(buildCompetitorPulse(dataset, nowValue).map((item) => item.actionType)).toContain("feature_release");
    expect(buildCompetitorFocusList(dataset, nowValue).map((item) => item.objectName)).toContain("Figma");
  });

  it("builds action buckets and topic cards with workspace recommendations", () => {
    expect(
      buildCompetitorActionBuckets(dataset, nowValue).find((bucket) => bucket.actionType === "feature_release")?.events.length,
    ).toBeGreaterThan(0);
    expect(
      buildCompetitorTopicCards(dataset, nowValue).find((card) => card.theme.name === "Figma Product Updates")?.recommendation,
    ).toContain("待判断");
  });
});
