import { describe, expect, it } from "vitest";

import {
  canAutoCreatePreset,
  getPresetMissingRequiredFields,
  resolveCatalogInfoType,
  resolveCatalogThemeType,
} from "./workspace-source-catalog";
import type { SourcePreset } from "../../../../../views/sources/components/source-presets";

describe("workspace source catalog helpers", () => {
  it("maps stock and commodity catalog types back to canonical price themes", () => {
    expect(resolveCatalogThemeType("stock_price")).toBe("price");
    expect(resolveCatalogInfoType("commodity_price")).toBe("price");
    expect(resolveCatalogThemeType("news_announcement")).toBe("news_announcement");
  });

  it("detects presets that cannot be auto-created because required defaults are missing", () => {
    const preset: SourcePreset = {
      id: "generic-announcement-list",
      label: "Product Announcement API",
      description: "Monitor product updates from a JSON API.",
      sourceType: "api",
      adapterKey: "generic_announcement_list",
      infoType: "content_update",
      fields: [
        { key: "url", label: "API URL", type: "text", required: true },
        { key: "title_field", label: "Title Field", type: "text", required: true },
      ],
      defaultConfig: {
        title_field: "title",
      },
    };

    expect(getPresetMissingRequiredFields(preset)).toEqual(["url"]);
    expect(canAutoCreatePreset(preset)).toBe(false);
  });

  it("allows auto-creation when preset defaults already satisfy required fields", () => {
    const preset: SourcePreset = {
      id: "github-releases",
      label: "GitHub Releases",
      description: "Track GitHub releases.",
      sourceType: "api",
      adapterKey: "github_releases",
      infoType: "content_update",
      fields: [
        { key: "owner", label: "Owner", type: "text", required: true },
        { key: "repo", label: "Repo", type: "text", required: true },
      ],
      defaultConfig: {
        owner: "vuejs",
        repo: "core",
      },
    };

    expect(getPresetMissingRequiredFields(preset)).toEqual([]);
    expect(canAutoCreatePreset(preset)).toBe(true);
  });
});
