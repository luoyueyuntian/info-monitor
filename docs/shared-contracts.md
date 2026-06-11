# Shared Contracts 使用规范

本文档说明 `@info-monitor/shared-contracts` 包的使用规范。

## 概述

`shared-contracts` 是一个纯类型导出包，定义了前端、API 和 Python Worker 之间的共享类型契约。

## 包结构

```
packages/shared-contracts/
├── src/
│   ├── index.ts              # 主入口，导出所有类型
│   ├── validation.ts         # 运行时验证
│   └── notification-theme.ts # 通知主题和色彩系统
├── package.json
└── tsconfig.json
```

## 类型分类

### 基础枚举类型

```typescript
type InfoType = "price" | "content_update" | "news_announcement" | "financial_event";
type EventSignal = "30d_low" | "bullish" | "bearish" | ...;
type EventStatus = "open" | "tracking" | "ignored" | "resolved";
type NotificationChannel = "in_app" | "email" | "webhook" | "telegram";
type NotificationStatus = "pending" | "sent" | "failed";
```

### 领域模型类型

```typescript
type ThemeSummary = { ... };
type EventSummary = { ... };
type EventDetail = EventSummary & { ... };
type SourceStatus = { ... };
type NotificationItem = { ... };
type DashboardSummary = { ... };
```

### 输入/输出类型

```typescript
type NotificationPreferenceInput = { ... };
type RuleConfigurationInput = { ... };
```

## 使用方式

### 在前端使用

```typescript
import type { EventSummary, NotificationItem } from "@info-monitor/shared-contracts";
import { getSignalColors, getSignalLabel } from "@info-monitor/shared-contracts";

// 类型注解
const event: EventSummary = { ... };

// 使用工具函数
const colors = getSignalColors(event.signal);
const label = getSignalLabel(event.signal);
```

### 在 API 中使用

```typescript
import type { NotificationStatus } from "@info-monitor/shared-contracts";
import { INBOX_SECTION_IDS } from "@info-monitor/shared-contracts";

// 类型注解
function listNotifications(status?: NotificationStatus) { ... }

// 使用常量
for (const sectionId of INBOX_SECTION_IDS) { ... }
```

## 运行时验证

当需要验证外部数据是否符合类型时，使用验证工具：

```typescript
import { isEventSummary, validate, validateOrThrow } from "@info-monitor/shared-contracts";

// 安全验证
const result = validate(data, isEventSummary, "EventSummary");
if (result.success) {
  // result.data 类型为 EventSummary
  console.log(result.data.title);
} else {
  console.error(result.error);
}

// 抛出异常的验证
try {
  const event = validateOrThrow(data, isEventSummary, "EventSummary");
} catch (error) {
  if (error instanceof ValidationError) {
    console.error(error.message, error.path);
  }
}

// 布尔检查
if (isEventSummary(data)) {
  // TypeScript 自动推断 data 为 EventSummary
}
```

## 添加新类型

### 1. 定义类型

在 `src/index.ts` 中添加：

```typescript
export type MyNewType = {
  id: string;
  name: string;
  // ...
};
```

### 2. 添加验证器（可选）

在 `src/validation.ts` 中添加：

```typescript
export function isMyNewType(value: unknown): value is MyNewType {
  if (!isRecord(value)) return false;
  return (
    isString(value.id) &&
    isString(value.name)
  );
}
```

### 3. 导出

在 `src/index.ts` 中导出验证器：

```typescript
export { isMyNewType } from "./validation.js";
```

## 设计原则

1. **只导出类型**: 不包含运行时逻辑（除了验证工具）
2. **宽松的联合类型**: 使用 `SomeType | string` 允许扩展
3. **可选字段**: 使用 `?` 和 `| null` 标记非必有字段
4. **向后兼容**: 新增字段使用可选类型

## 注意事项

1. **不要添加业务逻辑**: 只定义类型和验证器
2. **保持向后兼容**: 新增字段使用可选类型
3. **同步更新**: 前后端类型变更都要更新此包
4. **运行时验证**: 外部数据进入系统时进行验证

## 色彩系统

通知和事件的色彩配置：

```typescript
import {
  SIGNAL_COLORS,        // 信号颜色配置
  SIGNAL_PRIORITIES,    // 信号优先级配置
  SIGNAL_LABELS,        // 信号中文标签
  NOTIFICATION_STATUS_COLORS,  // 通知状态颜色
  EVENT_STATUS_COLORS,  // 事件状态颜色
} from "@info-monitor/shared-contracts";

// 使用示例
const signal = "30d_low";
const colors = SIGNAL_COLORS[signal];
// => { background: "bg-emerald-50", text: "text-emerald-700", ... }

const priority = SIGNAL_PRIORITIES[signal];
// => { level: "high", weight: 10, emoji: "📉" }

const label = SIGNAL_LABELS[signal];
// => "价格新低"
```
