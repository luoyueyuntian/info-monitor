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

  it("loads content update preset defaults into form state", () => {
    const state = buildThemePresetFormState("content-update-page");

    expect(state.themeType).toBe("content_update");
    expect(state.infoType).toBe("content_update");
    expect(state.sourceName).toBe("Figma Release Notes");
    expect(state.adapterKey).toBe("generic_content_update_list");
  });

  it("loads official authority presets into form state", () => {
    const nbs = buildThemePresetFormState("nbs-macro-releases");
    expect(nbs.themeType).toBe("news_announcement");
    expect(nbs.adapterKey).toBe("stats_data_release_list");
    expect(nbs.sourceName).toBe("国家统计局宏观发布列表");

    const csrc = buildThemePresetFormState("csrc-announcements");
    expect(csrc.themeType).toBe("financial_event");
    expect(csrc.adapterKey).toBe("csrc_announcements");
    expect(csrc.sourceName).toBe("证监会公告列表");

    const sse = buildThemePresetFormState("sse-announcements");
    expect(sse.themeType).toBe("news_announcement");
    expect(sse.adapterKey).toBe("sse_announcements");
    expect(sse.sourceName).toBe("上交所官方公告源");

    const hkex = buildThemePresetFormState("hkex-announcements");
    expect(hkex.themeType).toBe("news_announcement");
    expect(hkex.adapterKey).toBe("hkex_announcements");
    expect(hkex.sourceName).toBe("港交所官方公告源");

    const szse = buildThemePresetFormState("szse-announcements");
    expect(szse.themeType).toBe("news_announcement");
    expect(szse.adapterKey).toBe("szse_announcements");
    expect(szse.sourceName).toBe("深交所官方公告源");
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

  it("builds typed authority source config values", () => {
    expect(
      buildThemeSourceConfig("ndrc-announcements", "{}", {
        url: "https://www.ndrc.gov.cn/xxgk/zcfb/tz/index.html",
        max_items: "12",
        schedule_interval_seconds: "21600",
        emit_events_on_latest_only: true,
      }),
    ).toEqual({
      url: "https://www.ndrc.gov.cn/xxgk/zcfb/tz/index.html",
      max_items: 12,
      schedule_interval_seconds: 21600,
      emit_events_on_latest_only: true,
    });
  });

  it("builds typed SSE official source config values", () => {
    expect(
      buildThemeSourceConfig("sse-announcements", "{}", {
        lookback_days: "3",
        page_size: "30",
        stock_type: "2",
        security_code: "688008",
        title_keyword: "回购",
        schedule_interval_seconds: "21600",
        emit_events_on_latest_only: true,
      }),
    ).toEqual({
      lookback_days: 3,
      page_size: 30,
      stock_type: "2",
      security_code: "688008",
      title_keyword: "回购",
      schedule_interval_seconds: 21600,
      emit_events_on_latest_only: true,
    });
  });

  it("builds typed HKEX official source config values", () => {
    expect(
      buildThemeSourceConfig("hkex-announcements", "{}", {
        lookback_days: "5",
        max_items: "40",
        title_keyword: "盈利警告",
        schedule_interval_seconds: "21600",
        emit_events_on_latest_only: true,
      }),
    ).toEqual({
      lookback_days: 5,
      max_items: 40,
      title_keyword: "盈利警告",
      schedule_interval_seconds: 21600,
      emit_events_on_latest_only: true,
    });
  });

  it("builds typed SZSE official source config values", () => {
    expect(
      buildThemeSourceConfig("szse-announcements", "{}", {
        plate_code: "nmk",
        page_size: "35",
        schedule_interval_seconds: "21600",
        emit_events_on_latest_only: true,
      }),
    ).toEqual({
      plate_code: "nmk",
      page_size: 35,
      schedule_interval_seconds: 21600,
      emit_events_on_latest_only: true,
    });
  });

  it("returns undefined for unknown preset and parses custom config", () => {
    expect(getThemePresetById("missing")).toBeUndefined();

    expect(
      buildThemeSourceConfig("custom", '{"path":"/demo","schedule_interval_seconds":3600}', {}),
    ).toEqual({
      path: "/demo",
      schedule_interval_seconds: 3600,
    });
  });
});
