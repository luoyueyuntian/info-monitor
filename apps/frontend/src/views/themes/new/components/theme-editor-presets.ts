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
      { key: "run_after_time_local", label: "Run After Local Time", type: "text", placeholder: "16:10" },
      { key: "schedule_timezone", label: "Schedule Timezone", type: "text", placeholder: "+08:00" },
      { key: "run_weekdays_only", label: "Weekdays Only", type: "boolean" },
      { key: "holiday_calendar", label: "Holiday Calendar", type: "text", placeholder: "cn_stock_2026" },
      { key: "emit_events_on_latest_only", label: "Emit events on latest record only", type: "boolean" },
    ],
    defaultConfig: {
      secid: "1.600519",
      days: 45,
      schedule_interval_seconds: 86400,
      run_after_time_local: "16:10",
      schedule_timezone: "+08:00",
      run_weekdays_only: true,
      holiday_calendar: "cn_stock_2026",
      emit_events_on_latest_only: true,
    },
    help: "Use `1.600519` for Shanghai-listed Kweichow Moutai. Stock-market analysis is scheduled after the local close on weekdays only, and skips the built-in China market holiday calendar by default.",
  },
  {
    id: "eastmoney-market-overview",
    label: "China / Hong Kong Market Overview",
    description: "Tracks daily A-share and Hong Kong index snapshots plus northbound/southbound fund flow.",
    themeType: "financial_event",
    infoType: "financial_event",
    sourceType: "api",
    adapterKey: "eastmoney_market_overview",
    defaultThemeName: "A股与港股每日市场概览",
    defaultDescription: "Daily market overview for A-shares and Hong Kong equities with fund-flow snapshots.",
    defaultSourceName: "Eastmoney China / Hong Kong Market Overview",
    fields: [
      { key: "include_a_share", label: "Include A-share", type: "boolean" },
      { key: "include_hk", label: "Include Hong Kong", type: "boolean" },
      { key: "schedule_interval_seconds", label: "Schedule Interval Seconds", type: "number", placeholder: "86400" },
      { key: "run_after_time_local", label: "Run After Local Time", type: "text", placeholder: "16:10" },
      { key: "schedule_timezone", label: "Schedule Timezone", type: "text", placeholder: "+08:00" },
      { key: "run_weekdays_only", label: "Weekdays Only", type: "boolean" },
      { key: "holiday_calendar", label: "Holiday Calendar", type: "text", placeholder: "cn_stock_2026" },
      { key: "emit_events_on_latest_only", label: "Emit events on latest close only", type: "boolean" },
    ],
    defaultConfig: {
      include_a_share: true,
      include_hk: true,
      schedule_interval_seconds: 86400,
      run_after_time_local: "16:10",
      schedule_timezone: "+08:00",
      run_weekdays_only: true,
      holiday_calendar: "cn_stock_2026",
      emit_events_on_latest_only: false,
    },
    help: "Fetches major index closes and northbound/southbound fund flow from Eastmoney. By default it only auto-runs after the local close on weekdays and skips the built-in China market holiday calendar.",
  },
  {
    id: "eastmoney-daily-billboard",
    label: "Eastmoney Dragon Tiger List",
    description: "Track daily 龙虎榜上榜个股、净买额和异动强弱线索。",
    themeType: "financial_event",
    infoType: "financial_event",
    sourceType: "api",
    adapterKey: "eastmoney_daily_billboard",
    defaultThemeName: "A股龙虎榜异动跟踪",
    defaultDescription: "Track daily Dragon Tiger List entries to strengthen post-close stock-move attribution.",
    defaultSourceName: "Eastmoney Dragon Tiger List",
    fields: [
      { key: "page_size", label: "Page Size", type: "number", placeholder: "20" },
      { key: "days", label: "Lookback Days", type: "number", placeholder: "1" },
      { key: "schedule_interval_seconds", label: "Schedule Interval Seconds", type: "number", placeholder: "86400" },
      { key: "run_after_time_local", label: "Run After Local Time", type: "text", placeholder: "16:20" },
      { key: "schedule_timezone", label: "Schedule Timezone", type: "text", placeholder: "+08:00" },
      { key: "run_weekdays_only", label: "Weekdays Only", type: "boolean" },
      { key: "holiday_calendar", label: "Holiday Calendar", type: "text", placeholder: "cn_stock_2026" },
      { key: "emit_events_on_latest_only", label: "Emit events on latest only", type: "boolean" },
    ],
    defaultConfig: {
      page_size: 20,
      days: 1,
      schedule_interval_seconds: 86400,
      run_after_time_local: "16:20",
      schedule_timezone: "+08:00",
      run_weekdays_only: true,
      holiday_calendar: "cn_stock_2026",
      emit_events_on_latest_only: true,
    },
    help: "Designed for post-close A-share anomaly review. It complements the broader market overview theme with seat-driven move clues.",
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
      { key: "include_title_keywords", label: "Include Title Keywords", type: "text", placeholder: "iphone,ipad" },
      { key: "exclude_title_keywords", label: "Exclude Title Keywords", type: "text", placeholder: "黄金,基金,金条,纪念币" },
      { key: "schedule_interval_seconds", label: "Schedule Interval Seconds", type: "number", placeholder: "21600" },
      { key: "emit_events_on_latest_only", label: "Emit events on latest record only", type: "boolean" },
    ],
    defaultConfig: {
      title_field: "title",
      price_field: "price",
      currency: "CNY",
      exclude_title_keywords: "黄金,白银,金条,金币,纪念币,基金,ETF,股票,债券,期货,外汇,比特币,投资,理财",
      schedule_interval_seconds: 21600,
      emit_events_on_latest_only: true,
    },
    help: "Works with any JSON API returning price items. Use dot notation for nested fields and exclude keywords to keep investment products out.",
  },
  {
    id: "generic-html-price-list",
    label: "HTML Price List Page",
    description: "Track product prices from a public HTML list page using CSS selectors.",
    themeType: "price",
    infoType: "price",
    sourceType: "page_list",
    adapterKey: "generic_html_price_list",
    defaultThemeName: "Goods Price Watchlist",
    defaultDescription: "Track product prices from a public HTML deals or listing page.",
    defaultSourceName: "HTML Price List Source",
    fields: [
      { key: "url", label: "Page URL", type: "text", placeholder: "https://example.com/deals" },
      { key: "item_selector", label: "Item Selector", type: "text", placeholder: ".deal-card" },
      { key: "title_selector", label: "Title Selector", type: "text", placeholder: ".deal-title" },
      { key: "price_selector", label: "Price Selector", type: "text", placeholder: ".deal-price" },
      { key: "link_selector", label: "Link Selector", type: "text", placeholder: ".deal-title a" },
      { key: "time_selector", label: "Time Selector", type: "text", placeholder: "time" },
      { key: "include_title_keywords", label: "Include Title Keywords", type: "text", placeholder: "iphone,ipad" },
      { key: "exclude_title_keywords", label: "Exclude Title Keywords", type: "text", placeholder: "黄金,基金,金条,纪念币" },
      { key: "schedule_interval_seconds", label: "Schedule Interval Seconds", type: "number", placeholder: "21600" },
      { key: "emit_events_on_latest_only", label: "Emit events on latest record only", type: "boolean" },
    ],
    defaultConfig: {
      currency: "CNY",
      exclude_title_keywords: "黄金,白银,金条,金币,纪念币,基金,ETF,股票,债券,期货,外汇,比特币,投资,理财",
      schedule_interval_seconds: 21600,
      emit_events_on_latest_only: true,
    },
    help: "Good for public deals pages or mirrored HTML pages where prices are already visible in the markup.",
  },
  {
    id: "smzdm-deals-page",
    label: "SMZDM Deals Page",
    description: "Track prices from 什么值得买 deal pages. Official pages may require a proxy or mirrored page.",
    themeType: "price",
    infoType: "price",
    sourceType: "page_list",
    adapterKey: "generic_html_price_list",
    defaultThemeName: "什么值得买好价跟踪",
    defaultDescription: "Track target products from SMZDM deal pages while filtering out investment products.",
    defaultSourceName: "SMZDM Deals Source",
    fields: [
      { key: "url", label: "Page URL", type: "text", placeholder: "https://www.smzdm.com/fenlei/diannao/" },
      { key: "item_selector", label: "Item Selector", type: "text", placeholder: ".feed-row-wide" },
      { key: "title_selector", label: "Title Selector", type: "text", placeholder: ".feed-block-title" },
      { key: "price_selector", label: "Price Selector", type: "text", placeholder: ".z-highlight" },
      { key: "link_selector", label: "Link Selector", type: "text", placeholder: ".feed-block-title a" },
      { key: "include_title_keywords", label: "Include Title Keywords", type: "text", placeholder: "iphone,ipad" },
      { key: "exclude_title_keywords", label: "Exclude Title Keywords", type: "text", placeholder: "黄金,基金,金条,纪念币" },
      { key: "schedule_interval_seconds", label: "Schedule Interval Seconds", type: "number", placeholder: "21600" },
      { key: "emit_events_on_latest_only", label: "Emit events on latest record only", type: "boolean" },
    ],
    defaultConfig: {
      url: "https://www.smzdm.com/fenlei/diannao/",
      item_selector: ".feed-row-wide",
      title_selector: ".feed-block-title",
      price_selector: ".z-highlight",
      link_selector: ".feed-block-title a",
      exclude_title_keywords: "黄金,白银,金条,金币,纪念币,基金,ETF,股票,债券,期货,外汇,比特币,投资,理财",
      schedule_interval_seconds: 21600,
      emit_events_on_latest_only: true,
    },
    help: "SMZDM official pages can trigger anti-bot verification, so a proxy, snapshot page, or mirrored page is often more reliable.",
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
    id: "generic-news-announcement-list",
    label: "Official Announcement API",
    description: "Monitor official or exchange announcements from a JSON API or proxy feed.",
    themeType: "news_announcement",
    infoType: "news_announcement",
    sourceType: "api",
    adapterKey: "generic_news_announcement_list",
    defaultThemeName: "Official Announcement Monitor",
    defaultDescription: "Track official or exchange announcements from a structured JSON feed.",
    defaultSourceName: "Official Announcement Source",
    fields: [
      { key: "url", label: "API URL", type: "text", placeholder: "https://proxy.example.com/api/notices" },
      { key: "items_field", label: "Items Field", type: "text", placeholder: "result.items" },
      { key: "title_field", label: "Title Field", type: "text", placeholder: "title" },
      { key: "time_field", label: "Time Field", type: "text", placeholder: "published_at" },
      { key: "url_field", label: "URL Field", type: "text", placeholder: "url" },
      { key: "publisher", label: "Publisher", type: "text", placeholder: "上海证券交易所" },
      { key: "summary_field", label: "Summary Field", type: "text", placeholder: "summary" },
      { key: "category", label: "Category", type: "text", placeholder: "exchange_announcement" },
      { key: "release_topic", label: "Release Topic", type: "text", placeholder: "listed_company_announcement" },
      { key: "release_topic_label", label: "Release Topic Label", type: "text", placeholder: "上市公司公告" },
      { key: "schedule_interval_seconds", label: "Schedule Interval Seconds", type: "number", placeholder: "21600" },
      { key: "emit_events_on_latest_only", label: "Emit events on latest only", type: "boolean" },
    ],
    defaultConfig: {
      title_field: "title",
      category: "exchange_announcement",
      release_topic: "listed_company_announcement",
      release_topic_label: "上市公司公告",
      schedule_interval_seconds: 21600,
      emit_events_on_latest_only: true,
    },
    help: "Best used with official-announcement proxy APIs or your own announcement aggregator.",
  },
  {
    id: "sse-announcements-proxy",
    label: "SSE Announcements Proxy",
    description: "Track 上交所上市公司公告 through a structured proxy/API feed.",
    themeType: "news_announcement",
    infoType: "news_announcement",
    sourceType: "api",
    adapterKey: "generic_news_announcement_list",
    defaultThemeName: "上交所公告跟踪",
    defaultDescription: "Track SSE listed-company announcements for stock-move attribution and event review.",
    defaultSourceName: "SSE Announcement Feed",
    fields: [
      { key: "url", label: "Proxy API URL", type: "text", placeholder: "https://proxy.example.com/api/sse/announcements" },
      { key: "items_field", label: "Items Field", type: "text", placeholder: "result.items" },
      { key: "title_field", label: "Title Field", type: "text", placeholder: "title" },
      { key: "time_field", label: "Time Field", type: "text", placeholder: "date" },
      { key: "url_field", label: "URL Field", type: "text", placeholder: "url" },
      { key: "summary_field", label: "Summary Field", type: "text", placeholder: "summary" },
      { key: "schedule_interval_seconds", label: "Schedule Interval Seconds", type: "number", placeholder: "21600" },
      { key: "emit_events_on_latest_only", label: "Emit events on latest only", type: "boolean" },
    ],
    defaultConfig: {
      items_field: "result.items",
      title_field: "title",
      time_field: "date",
      url_field: "url",
      publisher: "上海证券交易所",
      category: "exchange_announcement",
      release_topic: "listed_company_announcement",
      release_topic_label: "上交所公告",
      schedule_interval_seconds: 21600,
      emit_events_on_latest_only: true,
    },
    help: "The SSE official page is accessible, but the live announcement query has detailed parameters. A proxy/API is the most stable integration path.",
  },
  {
    id: "szse-announcements-proxy",
    label: "SZSE Announcements Proxy",
    description: "Track 深交所上市公司公告 through a structured proxy/API feed.",
    themeType: "news_announcement",
    infoType: "news_announcement",
    sourceType: "api",
    adapterKey: "generic_news_announcement_list",
    defaultThemeName: "深交所公告跟踪",
    defaultDescription: "Track SZSE listed-company announcements for stock-move attribution and event review.",
    defaultSourceName: "SZSE Announcement Feed",
    fields: [
      { key: "url", label: "Proxy API URL", type: "text", placeholder: "https://proxy.example.com/api/szse/announcements" },
      { key: "items_field", label: "Items Field", type: "text", placeholder: "result.items" },
      { key: "title_field", label: "Title Field", type: "text", placeholder: "title" },
      { key: "time_field", label: "Time Field", type: "text", placeholder: "date" },
      { key: "url_field", label: "URL Field", type: "text", placeholder: "url" },
      { key: "summary_field", label: "Summary Field", type: "text", placeholder: "summary" },
      { key: "schedule_interval_seconds", label: "Schedule Interval Seconds", type: "number", placeholder: "21600" },
      { key: "emit_events_on_latest_only", label: "Emit events on latest only", type: "boolean" },
    ],
    defaultConfig: {
      items_field: "result.items",
      title_field: "title",
      time_field: "date",
      url_field: "url",
      publisher: "深圳证券交易所",
      category: "exchange_announcement",
      release_topic: "listed_company_announcement",
      release_topic_label: "深交所公告",
      schedule_interval_seconds: 21600,
      emit_events_on_latest_only: true,
    },
    help: "The SZSE announcement pages are script-heavy, so a proxy/API feed is the most stable integration path.",
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
