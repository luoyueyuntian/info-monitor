export type FieldDefinition = {
  key: string;
  label: string;
  type: "text" | "number" | "boolean";
  placeholder?: string;
};

export type ThemePreset = {
  id: string;
  label: string;
  description: string;
  themeType: string;
  infoType: string;
  sourceType: string;
  adapterKey: string;
  defaultThemeName: string;
  defaultDescription: string;
  defaultSourceName: string;
  fields: FieldDefinition[];
  defaultConfig: Record<string, string | number | boolean>;
  help?: string;
};

export const themePresetOptions: ThemePreset[] = [
  {
    id: "demo-price-feed",
    label: "Demo Price Feed",
    description: "Good for validating the 30-day low rule with local example data.",
    themeType: "price",
    infoType: "price",
    sourceType: "page_list",
    adapterKey: "demo_price_feed",
    defaultThemeName: "Surface Pro 8 16G + 512G Price",
    defaultDescription: "Local demo price-monitoring theme backed by a checked-in sample feed.",
    defaultSourceName: "Surface Pro 8 Demo Feed",
    fields: [
      {
        key: "file_path",
        label: "File Path",
        type: "text",
        placeholder: "apps/python-worker/examples/surface-pro-8-price-feed.json",
      },
    ],
    defaultConfig: {
      file_path: "apps/python-worker/examples/surface-pro-8-price-feed.json",
    },
    help: "This preset is best for smoke tests before switching to a live source.",
  },
  {
    id: "eastmoney-price",
    label: "Eastmoney Daily Price",
    description: "Uses Eastmoney historical kline data for a stock-like price theme.",
    themeType: "price",
    infoType: "price",
    sourceType: "api",
    adapterKey: "eastmoney_stock_kline",
    defaultThemeName: "Kweichow Moutai Daily Price",
    defaultDescription: "Real-source daily price theme backed by Eastmoney kline data.",
    defaultSourceName: "Eastmoney Kline: 600519",
    fields: [
      { key: "secid", label: "Security ID", type: "text", placeholder: "1.600519" },
      { key: "days", label: "Lookback Days", type: "number", placeholder: "45" },
      { key: "schedule_interval_seconds", label: "Schedule Interval Seconds", type: "number", placeholder: "86400" },
      { key: "emit_events_on_latest_only", label: "Emit events on latest record only", type: "boolean" },
    ],
    defaultConfig: {
      secid: "1.600519",
      days: 45,
      schedule_interval_seconds: 86400,
      emit_events_on_latest_only: true,
    },
    help: "Use `1.600519` for Shanghai-listed Kweichow Moutai. Adjust the secid for other instruments.",
  },
  {
    id: "pbc-news",
    label: "PBOC News Releases",
    description: "Tracks official news and release items from the People’s Bank of China.",
    themeType: "news_announcement",
    infoType: "news_announcement",
    sourceType: "page_list",
    adapterKey: "pbc_news_list",
    defaultThemeName: "PBOC News Releases",
    defaultDescription: "Official PBOC news and release list for investment information tracking.",
    defaultSourceName: "PBOC News List",
    fields: [
      { key: "path", label: "List Path", type: "text", placeholder: "/goutongjiaoliu/113456/113469/index.html" },
      { key: "schedule_interval_seconds", label: "Schedule Interval Seconds", type: "number", placeholder: "21600" },
      { key: "emit_events_on_latest_only", label: "Emit events on latest release date only", type: "boolean" },
    ],
    defaultConfig: {
      path: "/goutongjiaoliu/113456/113469/index.html",
      schedule_interval_seconds: 21600,
      emit_events_on_latest_only: true,
    },
    help: "The adapter parses the PBOC list page and stores official news/announcement records.",
  },
  {
    id: "pbc-open-market",
    label: "PBOC Open Market Announcements",
    description: "Parses structured open market operation announcements into financial event records.",
    themeType: "financial_event",
    infoType: "financial_event",
    sourceType: "page_list",
    adapterKey: "pbc_open_market_announcements",
    defaultThemeName: "PBOC Open Market Operations",
    defaultDescription: "Official open market operation announcements from the PBOC.",
    defaultSourceName: "PBOC Open Market Announcement List",
    fields: [
      { key: "path", label: "List Path", type: "text", placeholder: "/zhengcehuobisi/125207/125213/125431/125475/index.html" },
      { key: "max_items", label: "Max Items", type: "number", placeholder: "5" },
      { key: "schedule_interval_seconds", label: "Schedule Interval Seconds", type: "number", placeholder: "21600" },
      { key: "emit_events_on_latest_only", label: "Emit events on latest announcement date only", type: "boolean" },
    ],
    defaultConfig: {
      path: "/zhengcehuobisi/125207/125213/125431/125475/index.html",
      max_items: 5,
      schedule_interval_seconds: 21600,
      emit_events_on_latest_only: true,
    },
    help: "This preset extracts announcement number, operation type, amount, term, and rate where available.",
  },
  {
    id: "content-update-page",
    label: "Product Update Feed",
    description: "Tracks feature releases, changelog entries, or marketing updates from a product page or release list.",
    themeType: "content_update",
    infoType: "content_update",
    sourceType: "page_list",
    adapterKey: "generic_content_update_list",
    defaultThemeName: "Figma Product Updates",
    defaultDescription: "Tracks product or release-note updates for an independently operated product or competitor.",
    defaultSourceName: "Figma Release Notes",
    fields: [
      { key: "url", label: "Page URL", type: "text", placeholder: "https://example.com/releases" },
      { key: "item_selector", label: "Item Selector", type: "text", placeholder: ".release-item" },
      { key: "title_selector", label: "Title Selector", type: "text", placeholder: "h2 a" },
      { key: "link_selector", label: "Link Selector", type: "text", placeholder: "h2 a" },
      { key: "time_selector", label: "Time Selector", type: "text", placeholder: "time" },
      { key: "update_type", label: "Update Type", type: "text", placeholder: "feature_release" },
      { key: "schedule_interval_seconds", label: "Schedule Interval Seconds", type: "number", placeholder: "21600" },
      { key: "emit_events_on_latest_only", label: "Emit events on latest update only", type: "boolean" },
    ],
    defaultConfig: {
      url: "https://www.figma.com/release-notes/",
      item_selector: "article",
      title_selector: "h2, h3, a",
      link_selector: "a",
      time_selector: "time",
      update_type: "feature_release",
      schedule_interval_seconds: 21600,
      emit_events_on_latest_only: true,
    },
    help: "Use CSS selectors to extract update cards from a release-note or product-update page.",
  },
  {
    id: "generic-price-list",
    label: "Second-Hand Price API",
    description: "Monitor prices from a JSON API endpoint for second-hand marketplaces or price aggregators.",
    themeType: "price",
    infoType: "price",
    sourceType: "api",
    adapterKey: "generic_price_list",
    defaultThemeName: "Second-Hand Price Monitor",
    defaultDescription: "Track second-hand product prices from a JSON API source.",
    defaultSourceName: "Price API Source",
    fields: [
      { key: "url", label: "API URL", type: "text", placeholder: "https://api.example.com/prices" },
      { key: "items_field", label: "Items Field", type: "text", placeholder: "data.items" },
      { key: "title_field", label: "Title Field", type: "text", placeholder: "title" },
      { key: "price_field", label: "Price Field", type: "text", placeholder: "price" },
      { key: "spec_field", label: "Spec Field", type: "text", placeholder: "spec" },
      { key: "time_field", label: "Time Field", type: "text", placeholder: "created_at" },
      { key: "schedule_interval_seconds", label: "Schedule Interval Seconds", type: "number", placeholder: "21600" },
      { key: "emit_events_on_latest_only", label: "Emit events on latest record only", type: "boolean" },
    ],
    defaultConfig: {
      title_field: "title",
      price_field: "price",
      currency: "CNY",
      schedule_interval_seconds: 21600,
      emit_events_on_latest_only: true,
    },
    help: "Works with any JSON API returning price items. Use dot notation for nested fields (e.g. 'data.items').",
  },
  {
    id: "generic-announcement-list",
    label: "Product Announcement API",
    description: "Monitor product updates, changelogs, or announcements from a JSON API endpoint.",
    themeType: "content_update",
    infoType: "content_update",
    sourceType: "api",
    adapterKey: "generic_announcement_list",
    defaultThemeName: "Product Updates Monitor",
    defaultDescription: "Track product announcements and updates from a JSON API source.",
    defaultSourceName: "Announcement API Source",
    fields: [
      { key: "url", label: "API URL", type: "text", placeholder: "https://api.example.com/announcements" },
      { key: "items_field", label: "Items Field", type: "text", placeholder: "data.items" },
      { key: "title_field", label: "Title Field", type: "text", placeholder: "title" },
      { key: "time_field", label: "Time Field", type: "text", placeholder: "published_at" },
      { key: "summary_field", label: "Summary Field", type: "text", placeholder: "description" },
      { key: "category_field", label: "Category Field", type: "text", placeholder: "category" },
      { key: "object_name", label: "Product Name", type: "text", placeholder: "My Product" },
      { key: "schedule_interval_seconds", label: "Schedule Interval Seconds", type: "number", placeholder: "21600" },
      { key: "emit_events_on_latest_only", label: "Emit events on latest only", type: "boolean" },
    ],
    defaultConfig: {
      title_field: "title",
      schedule_interval_seconds: 21600,
      emit_events_on_latest_only: true,
    },
    help: "Works with any JSON API returning announcements. Category field auto-classifies as feature_release, marketing, or announcement.",
  },
  {
    id: "custom",
    label: "Custom",
    description: "Manual mode for trying a new adapter or custom config shape.",
    themeType: "price",
    infoType: "price",
    sourceType: "page_list",
    adapterKey: "",
    defaultThemeName: "",
    defaultDescription: "",
    defaultSourceName: "",
    fields: [],
    defaultConfig: {},
    help: "Use this when you want to experiment beyond the built-in presets.",
  },
];

export function getThemePresetById(presetId: string): ThemePreset | undefined {
  return themePresetOptions.find((preset) => preset.id === presetId);
}

export function buildThemePresetFormState(presetId: string) {
  const preset = getThemePresetById(presetId);
  if (!preset) {
    throw new Error(`Unknown theme preset: ${presetId}`);
  }

  return {
    themeType: preset.themeType,
    infoType: preset.infoType,
    name: preset.defaultThemeName,
    description: preset.defaultDescription,
    sourceName: preset.defaultSourceName,
    sourceType: preset.sourceType,
    adapterKey: preset.adapterKey,
    config: { ...preset.defaultConfig } as Record<string, string | number | boolean>,
    customConfigJson: preset.id === "custom" ? "{}" : "{}",
  };
}

export function buildThemeSourceConfig(
  presetId: string,
  customConfigJson: string,
  configValues: Record<string, string | number | boolean>,
) {
  const preset = getThemePresetById(presetId);

  if (presetId === "custom") {
    const parsed = JSON.parse(customConfigJson || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }

    throw new Error("Config JSON must be an object.");
  }

  if (!preset) {
    throw new Error(`Unknown theme preset: ${presetId}`);
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
