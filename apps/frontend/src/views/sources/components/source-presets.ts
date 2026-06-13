/**
 * Source preset definitions for the source onboarding flow.
 *
 * These presets drive the "add source" form — choosing a preset populates
 * source type, adapter key, config fields, and default values.
 */

export type SourcePresetField = {
  key: string;
  label: string;
  type: "text" | "number" | "boolean";
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

export const sourcePresetOptions: SourcePreset[] = [
  {
    id: "demo-price-feed",
    label: "Demo Price Feed",
    description: "Local demo price feed for validating the monitoring pipeline.",
    sourceType: "page_list",
    adapterKey: "demo_price_feed",
    infoType: "price",
    fields: [
      { key: "file_path", label: "File Path", type: "text", placeholder: "apps/python-worker/examples/surface-pro-8-price-feed.json", required: true },
    ],
    defaultConfig: { file_path: "apps/python-worker/examples/surface-pro-8-price-feed.json" },
    help: "Use this for smoke tests before connecting a live source.",
  },
  {
    id: "eastmoney-price",
    label: "Eastmoney Daily Price",
    description: "Eastmoney historical kline data for stock-like price monitoring.",
    sourceType: "api",
    adapterKey: "eastmoney_stock_kline",
    infoType: "price",
    fields: [
      { key: "secid", label: "Security ID", type: "text", placeholder: "1.600519", required: true },
      { key: "days", label: "Lookback Days", type: "number", placeholder: "45" },
      { key: "schedule_interval_seconds", label: "Schedule Interval (s)", type: "number", placeholder: "86400" },
      { key: "emit_events_on_latest_only", label: "Latest only", type: "boolean" },
    ],
    defaultConfig: { secid: "1.600519", days: 45, schedule_interval_seconds: 86400, emit_events_on_latest_only: true },
    help: "Use `1.600519` for Shanghai-listed Kweichow Moutai.",
  },
  {
    id: "pbc-news",
    label: "PBOC News Releases",
    description: "Official news from the People's Bank of China.",
    sourceType: "page_list",
    adapterKey: "pbc_news_list",
    infoType: "news_announcement",
    fields: [
      { key: "path", label: "List Path", type: "text", placeholder: "/goutongjiaoliu/113456/113469/index.html", required: true },
      { key: "schedule_interval_seconds", label: "Schedule Interval (s)", type: "number", placeholder: "21600" },
      { key: "emit_events_on_latest_only", label: "Latest only", type: "boolean" },
    ],
    defaultConfig: { path: "/goutongjiaoliu/113456/113469/index.html", schedule_interval_seconds: 21600, emit_events_on_latest_only: true },
  },
  {
    id: "pbc-open-market",
    label: "PBOC Open Market",
    description: "Structured open market operation announcements from the PBOC.",
    sourceType: "page_list",
    adapterKey: "pbc_open_market_announcements",
    infoType: "financial_event",
    fields: [
      { key: "path", label: "List Path", type: "text", placeholder: "/zhengcehuobisi/125207/125213/125431/125475/index.html", required: true },
      { key: "max_items", label: "Max Items", type: "number", placeholder: "5" },
      { key: "schedule_interval_seconds", label: "Schedule Interval (s)", type: "number", placeholder: "21600" },
      { key: "emit_events_on_latest_only", label: "Latest only", type: "boolean" },
    ],
    defaultConfig: { path: "/zhengcehuobisi/125207/125213/125431/125475/index.html", max_items: 5, schedule_interval_seconds: 21600, emit_events_on_latest_only: true },
  },
  {
    id: "content-update-page",
    label: "Product Update Feed",
    description: "Track feature releases, changelog entries, or product updates.",
    sourceType: "page_list",
    adapterKey: "generic_content_update_list",
    infoType: "content_update",
    fields: [
      { key: "url", label: "Page URL", type: "text", placeholder: "https://example.com/releases", required: true },
      { key: "item_selector", label: "Item Selector", type: "text", placeholder: ".release-item", required: true },
      { key: "title_selector", label: "Title Selector", type: "text", placeholder: "h2 a" },
      { key: "link_selector", label: "Link Selector", type: "text", placeholder: "h2 a" },
      { key: "time_selector", label: "Time Selector", type: "text", placeholder: "time" },
      { key: "update_type", label: "Update Type", type: "text", placeholder: "feature_release" },
      { key: "schedule_interval_seconds", label: "Schedule Interval (s)", type: "number", placeholder: "21600" },
      { key: "emit_events_on_latest_only", label: "Latest only", type: "boolean" },
    ],
    defaultConfig: { schedule_interval_seconds: 21600, emit_events_on_latest_only: true },
    help: "Use CSS selectors to extract update cards from a release-note page.",
  },
  {
    id: "generic-price-list",
    label: "Second-Hand Price API",
    description: "Monitor prices from a JSON API endpoint (second-hand marketplaces, price aggregators, etc.).",
    sourceType: "api",
    adapterKey: "generic_price_list",
    infoType: "price",
    fields: [
      { key: "url", label: "API URL", type: "text", placeholder: "https://api.example.com/prices", required: true },
      { key: "items_field", label: "Items Field (dot notation)", type: "text", placeholder: "data.items" },
      { key: "title_field", label: "Title Field", type: "text", placeholder: "title", required: true },
      { key: "price_field", label: "Price Field", type: "text", placeholder: "price", required: true },
      { key: "spec_field", label: "Spec Field", type: "text", placeholder: "spec" },
      { key: "url_field", label: "URL Field", type: "text", placeholder: "url" },
      { key: "time_field", label: "Time Field", type: "text", placeholder: "created_at" },
      { key: "currency", label: "Currency", type: "text", placeholder: "CNY" },
      { key: "symbol_field", label: "Symbol Field", type: "text", placeholder: "symbol" },
      { key: "max_items", label: "Max Items", type: "number", placeholder: "20" },
      { key: "schedule_interval_seconds", label: "Schedule Interval (s)", type: "number", placeholder: "21600" },
      { key: "emit_events_on_latest_only", label: "Latest only", type: "boolean" },
    ],
    defaultConfig: { currency: "CNY", max_items: 20, schedule_interval_seconds: 21600, emit_events_on_latest_only: true },
    help: "Works with any JSON API returning a list of price items. Use dot notation for nested fields.",
  },
  {
    id: "generic-announcement-list",
    label: "Product Announcement API",
    description: "Monitor product updates, changelogs, or announcements from a JSON API.",
    sourceType: "api",
    adapterKey: "generic_announcement_list",
    infoType: "content_update",
    fields: [
      { key: "url", label: "API URL", type: "text", placeholder: "https://api.example.com/announcements", required: true },
      { key: "items_field", label: "Items Field (dot notation)", type: "text", placeholder: "data.items" },
      { key: "title_field", label: "Title Field", type: "text", placeholder: "title", required: true },
      { key: "time_field", label: "Time Field", type: "text", placeholder: "published_at" },
      { key: "url_field", label: "URL Field", type: "text", placeholder: "url" },
      { key: "summary_field", label: "Summary Field", type: "text", placeholder: "description" },
      { key: "category_field", label: "Category Field", type: "text", placeholder: "category" },
      { key: "object_name", label: "Product Name", type: "text", placeholder: "My Product" },
      { key: "max_items", label: "Max Items", type: "number", placeholder: "20" },
      { key: "schedule_interval_seconds", label: "Schedule Interval (s)", type: "number", placeholder: "21600" },
      { key: "emit_events_on_latest_only", label: "Latest only", type: "boolean" },
    ],
    defaultConfig: { title_field: "title", max_items: 20, schedule_interval_seconds: 21600, emit_events_on_latest_only: true },
    help: "Works with any JSON API returning announcements. Category field auto-classifies update types.",
  },
  {
    id: "custom",
    label: "Custom",
    description: "Manual configuration for a new adapter or custom config shape.",
    sourceType: "page_list",
    adapterKey: "",
    infoType: "price",
    fields: [],
    defaultConfig: {},
    help: "Use this when experimenting beyond the built-in presets.",
  },
];

export function getSourcePresetById(presetId: string): SourcePreset | undefined {
  return sourcePresetOptions.find((p) => p.id === presetId);
}

export function buildSourceConfigFromPreset(
  presetId: string,
  configValues: Record<string, string | number | boolean>,
  customConfigJson?: string,
): Record<string, unknown> {
  const preset = getSourcePresetById(presetId);
  if (!preset) {
    throw new Error(`Unknown preset: ${presetId}`);
  }

  if (presetId === "custom") {
    const parsed = JSON.parse(customConfigJson || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    throw new Error("Config JSON must be an object.");
  }

  const config: Record<string, string | number | boolean> = {};

  for (const field of preset.fields) {
    const rawValue = configValues[field.key];

    if (rawValue === "" || rawValue === null || rawValue === undefined) {
      continue;
    }

    if (field.type === "number") {
      config[field.key] = Number(rawValue);
      continue;
    }

    if (field.type === "boolean") {
      config[field.key] = Boolean(rawValue);
      continue;
    }

    config[field.key] = String(rawValue);
  }

  return config;
}
