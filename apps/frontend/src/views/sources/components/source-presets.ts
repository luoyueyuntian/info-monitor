/**
 * Source preset type definitions.
 *
 * Preset data is fetched from the backend API via GET /api/sources/presets.
 * This file only exports the TypeScript types used to type the API response.
 */

export type SourcePresetFieldType = "text" | "number" | "boolean";

export type SourcePresetInfoType = "stock_price" | "commodity_price" | "financial_event" | "news_announcement" | "content_update";

export type SourcePresetField = {
  key: string;
  label: string;
  type: SourcePresetFieldType;
  placeholder?: string;
  required?: boolean;
};

export type SourcePreset = {
  id: string;
  label: string;
  description: string;
  sourceType: string;
  adapterKey: string;
  infoType: string;
  fields: SourcePresetField[];
  defaultConfig: Record<string, string | number | boolean>;
  help?: string;
};
