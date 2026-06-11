export function formatMaybeLabel(value: unknown) {
  if (typeof value === "number") {
    return value.toLocaleString();
  }

  if (value == null || value === "") {
    return "暂无";
  }

  return String(value);
}

function toDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const zhDateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const zhTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const zhDateFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  month: "2-digit",
  day: "2-digit",
});

export function formatDateTimeLabel(value?: string | null) {
  const date = toDate(value);

  if (!date) {
    return "暂无";
  }

  return zhDateTimeFormatter.format(date).replace(/\//g, "-");
}

export function formatRelativeTimeLabel(value?: string | null, nowValue?: Date) {
  const date = toDate(value);

  if (!date) {
    return "暂无";
  }

  const now = nowValue ?? new Date();
  const diffMs = now.getTime() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) {
    return "刚刚";
  }

  if (diffMs < hour) {
    return `${Math.floor(diffMs / minute)}分钟前`;
  }

  if (diffMs < day) {
    return `${Math.floor(diffMs / hour)}小时前`;
  }

  if (diffMs < 2 * day) {
    return `昨天 ${zhTimeFormatter.format(date)}`;
  }

  return `${zhDateFormatter.format(date)} ${zhTimeFormatter.format(date)}`.replace(/\//g, "-");
}

export function formatSmartDateTimeLabel(value?: string | null, nowValue?: Date) {
  const date = toDate(value);

  if (!date) {
    return "暂无";
  }

  const now = nowValue ?? new Date();
  const diffMs = Math.abs(now.getTime() - date.getTime());
  const day = 24 * 60 * 60 * 1000;

  if (diffMs < 3 * day) {
    return formatRelativeTimeLabel(value, now);
  }

  return formatDateTimeLabel(value);
}

export function themeTypeLabel(type?: string | null) {
  switch (type) {
    case "price":
      return "价格";
    case "news_announcement":
      return "公告";
    case "financial_event":
      return "金融事件";
    case "content_update":
      return "内容更新";
    default:
      return type ?? "未知类型";
  }
}

export function sourceTypeLabel(type?: string | null) {
  switch (type) {
    case "api":
      return "API";
    case "page_list":
      return "列表页";
    case "page_detail":
      return "详情页";
    case "rss":
      return "RSS";
    default:
      return type ?? "未知来源";
  }
}

export function sourceHealthLabel(health?: string | null) {
  switch (health) {
    case "healthy":
      return "正常";
    case "warning":
      return "异常";
    default:
      return health ?? "未知";
  }
}

export function themeStatusLabel(status?: string | null) {
  switch (status) {
    case "active":
      return "活跃";
    case "paused":
      return "暂停";
    case "archived":
      return "归档";
    default:
      return status ?? "未知";
  }
}

export function sourceStatusLabel(status?: string | null) {
  switch (status) {
    case "healthy":
      return "正常";
    case "warning":
      return "异常";
    case "active":
      return "启用";
    case "paused":
      return "暂停";
    case "disabled":
      return "禁用";
    default:
      return status ?? "未知";
  }
}

export function runStatusLabel(status?: string | null) {
  switch (status) {
    case "pending":
      return "排队中";
    case "running":
      return "运行中";
    case "completed":
      return "已完成";
    case "failed":
      return "失败";
    default:
      return status ?? "未知";
  }
}

export function eventSignalLabel(signal?: string | null) {
  switch (signal) {
    case "30d_low":
      return "30天新低";
    case "bullish":
      return "偏利好";
    case "bearish":
      return "偏利空";
    case "content_update":
      return "内容更新";
    case "new_announcement":
      return "新公告";
    case "new_financial_event":
      return "新金融事件";
    case "liquidity_injection":
      return "流动性投放";
    case "liquidity_withdrawal":
      return "流动性回笼";
    case "neutral":
      return "中性";
    default:
      return signal ?? "未知信号";
  }
}

export function eventTypeLabel(eventType?: string | null) {
  switch (eventType) {
    case "new_release":
      return "新发布";
    case "price_low":
      return "价格低点";
    default:
      return eventType ?? "未知事件";
  }
}

export function eventStatusLabel(status?: string | null) {
  switch (status) {
    case "open":
      return "待处理";
    case "tracking":
      return "关注中";
    case "ignored":
      return "已忽略";
    default:
      return status ?? "待处理";
  }
}

export function eventReadLabel(isRead?: boolean | null) {
  return isRead ? "已读" : "未读";
}

export function eventBookmarkLabel(isBookmarked?: boolean | null) {
  return isBookmarked ? "已收藏" : "未收藏";
}

export function changeTypeLabel(changeType?: string | null) {
  switch (changeType) {
    case "new_record":
      return "新增记录";
    case "updated_record":
      return "记录更新";
    case "removed_record":
      return "记录移除";
    default:
      return changeType ?? "未知变化";
  }
}

export function timelineKindLabel(kind?: string | null) {
  switch (kind) {
    case "event":
      return "信号";
    case "change":
      return "变化";
    case "run":
      return "运行";
    default:
      return kind ?? "未知";
  }
}

export function pillToneClass(value?: string | null, variant: "default" | "text" = "default") {
  const base =
    variant === "text"
      ? "inline-flex items-center gap-1.5 text-[0.8rem] font-semibold"
      : "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.84rem] font-semibold";

  switch (value) {
    case "positive":
    case "bullish":
      return `${base} ${variant === "text" ? "text-[#1f6a3b]" : "bg-[#d9efe0] text-[#1f6a3b]"}`;
    case "negative":
    case "bearish":
      return `${base} ${variant === "text" ? "text-[#8b2d28]" : "bg-[#f3d9d7] text-[#8b2d28]"}`;
    case "30d_low":
      return `${base} ${variant === "text" ? "text-[#7a4a11]" : "bg-[#e8d8bc] text-[#7a4a11]"}`;
    case "content_update":
      return `${base} ${variant === "text" ? "text-[#8a5b1f]" : "bg-[#f1e4cc] text-[#8a5b1f]"}`;
    case "new_announcement":
      return `${base} ${variant === "text" ? "text-[#1d537f]" : "bg-[#d9e7f2] text-[#1d537f]"}`;
    case "new_financial_event":
      return `${base} ${variant === "text" ? "text-[#4f4178]" : "bg-[#e2ddf1] text-[#4f4178]"}`;
    case "liquidity_injection":
      return `${base} ${variant === "text" ? "text-[#1f6a3b]" : "bg-[#d9efe0] text-[#1f6a3b]"}`;
    case "liquidity_withdrawal":
      return `${base} ${variant === "text" ? "text-[#8b2d28]" : "bg-[#f3d9d7] text-[#8b2d28]"}`;
    case "neutral":
      return `${base} ${variant === "text" ? "text-[#625749]" : "bg-[#e7e4dc] text-[#625749]"}`;
    case "open":
      return `${base} ${variant === "text" ? "text-[#625749]" : "bg-[#e7e4dc] text-[#625749]"}`;
    case "tracking":
      return `${base} ${variant === "text" ? "text-[#1f6a3b]" : "bg-[#d9efe0] text-[#1f6a3b]"}`;
    case "ignored":
      return `${base} ${variant === "text" ? "text-[#8b2d28]" : "bg-[#f3d9d7] text-[#8b2d28]"}`;
    case "healthy":
    case "completed":
    case "active":
      return `${base} ${variant === "text" ? "text-[#1f6a3b]" : "bg-[#d9efe0] text-[#1f6a3b]"}`;
    case "warning":
    case "failed":
      return `${base} ${variant === "text" ? "text-[#8b2d28]" : "bg-[#f3d9d7] text-[#8b2d28]"}`;
    case "pending":
    case "running":
      return `${base} ${variant === "text" ? "text-[#625749]" : "bg-[#e7e4dc] text-[#625749]"}`;
    default:
      return `${base} ${variant === "text" ? "text-[#6a4b14]" : "bg-[#efe2c2] text-[#6a4b14]"}`;
  }
}
