import type { SourcePreset } from "../../../../../views/sources/components/source-presets";

export function resolveCatalogThemeType(infoType: string): string {
  if (infoType === "stock_price" || infoType === "commodity_price") {
    return "price";
  }

  return infoType;
}

export function resolveCatalogInfoType(infoType: string): string {
  if (infoType === "stock_price" || infoType === "commodity_price") {
    return "price";
  }

  return infoType;
}

export function getPresetMissingRequiredFields(preset: SourcePreset): string[] {
  return preset.fields
    .filter((field) => field.required)
    .filter((field) => {
      const value = preset.defaultConfig[field.key];
      return value === undefined || value === null || value === "";
    })
    .map((field) => field.key);
}

export function canAutoCreatePreset(preset: SourcePreset): boolean {
  return getPresetMissingRequiredFields(preset).length === 0;
}
