import { describe, expect, it } from "vitest";

import {
  buildThemePresetFormState,
  buildThemeSourceConfig,
  getThemePresetById,
} from "./theme-editor-presets";

describe("theme-editor-presets", () => {
  it("loads known preset defaults into form state", () => {
    const state = buildThemePresetFormState("pbc-news");

    expect(state.themeType).toBe("news_announcement");
    expect(state.infoType).toBe("news_announcement");
    expect(state.sourceName).toBe("PBOC News List");
    expect(state.adapterKey).toBe("pbc_news_list");
  });

  it("builds typed source config from preset field values", () => {
    expect(
      buildThemeSourceConfig("eastmoney-price", "{}", {
        secid: "1.600519",
        days: "45",
        schedule_interval_seconds: "86400",
        emit_events_on_latest_only: true,
      }),
    ).toEqual({
      secid: "1.600519",
      days: 45,
      schedule_interval_seconds: 86400,
      emit_events_on_latest_only: true,
    });
  });

  it("returns custom preset fallback and parses custom config", () => {
    expect(getThemePresetById("missing").id).toBe("demo-price-feed");

    expect(
      buildThemeSourceConfig("custom", '{"path":"/demo","schedule_interval_seconds":3600}', {}),
    ).toEqual({
      path: "/demo",
      schedule_interval_seconds: 3600,
    });
  });
});
