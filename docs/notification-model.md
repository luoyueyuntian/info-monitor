# 通知模型

本文档描述了 Info Monitor 系统中通知的数据模型和生命周期。

## 核心概念

### 通知 (Notification)

通知是系统向用户传递事件信息的载体。每条通知关联一个事件，并通过特定渠道投递。

```typescript
type NotificationItem = {
  id: string;                    // 唯一标识
  eventId: string;               // 关联事件 ID
  channel: NotificationChannel;  // 投递渠道
  status: NotificationStatus;    // 投递状态
  title: string;                 // 标题
  summary: string;               // 摘要
  signal: EventSignal;           // 信号类型
  sentAt: string | null;         // 发送时间
  createdAt: string;             // 创建时间
};
```

数据库还跟踪重试信息：

```sql
retry_count   INTEGER NOT NULL DEFAULT 0,  -- 已重试次数
last_retry_at TIMESTAMP WITH TIME ZONE,     -- 上次重试时间
next_retry_at TIMESTAMP WITH TIME ZONE,     -- 下次重试时间（指数退避）
max_retries   INTEGER NOT NULL DEFAULT 3,   -- 最大重试次数
```

### 投递渠道 (NotificationChannel)

```typescript
type NotificationChannel = "in_app" | "email" | "webhook" | "telegram";
```

| 渠道 | 说明 | 状态 |
|------|------|------|
| `in_app` | 应用内通知 | ✅ 已实现 |
| `webhook` | Webhook 推送 | ✅ 已实现 |
| `telegram` | Telegram 机器人 | ✅ 已实现 |
| `email` | 邮件通知 | 🚧 待实现 |

### 投递状态 (NotificationStatus)

```typescript
type NotificationStatus = "pending" | "sent" | "failed";
```

| 状态 | 说明 |
|------|------|
| `pending` | 待发送 |
| `sent` | 已发送 |
| `failed` | 发送失败 |

## 生命周期

```
创建 (pending) → 发送 (sent)
      ↓
   失败 (failed) → 重试 (pending) → 发送 (sent)
      ↓
   超过最大重试次数 → 保持 failed
```

1. **创建**: Worker 处理事件后创建通知
2. **发送**: 通过指定渠道成功投递
3. **失败**: 投递失败，可手动或自动重试
4. **重试**: 使用指数退避策略重新投递

### 指数退避重试

重试延迟公式：`delay = baseDelay × 2^retryCount + jitter`

| 重试次数 | 大约延迟 |
|---------|---------|
| 1 | 1-2 秒 |
| 2 | 2-3 秒 |
| 3 | 4-5 秒 |

超过 `max_retries`（默认 3）后不再自动重试。

## 通知偏好

用户可以配置通知偏好，决定哪些通知需要投递：

```typescript
type NotificationPreference = {
  id: string;
  userId: string;
  themeId: string | null;    // 主题级偏好
  sourceId: string | null;   // 来源级偏好
  signal: string | null;     // 信号级偏好
  channel: string;           // 渠道
  isEnabled: boolean;        // 是否启用
  isMuted: boolean;          // 是否静音
  priorityOnly: boolean;     // 仅高优先级
};
```

### 偏好优先级

偏好按特异性排序：`来源级 > 主题级 > 信号级`

发送前会检查：
1. 对应渠道/主题/信号的偏好是否启用
2. 是否处于静音模式
3. 如果 `priorityOnly=true`，检查规则配置的 `notificationLevel`

## 限流

每个渠道有独立的速率限制：

| 渠道 | 默认限制 |
|------|---------|
| webhook | 60 次/分钟 |
| telegram | 30 次/分钟 |
| email | 100 次/分钟 |
| in_app | 无限制 |

可通过 API 动态调整：

```
PUT /api/channels/:channel/rate-limit
{ "maxRequests": 30, "windowMs": 60000 }
```

## 数据库约束

### 唯一性约束

- `event_id + channel`: 同一事件在同一渠道只能有一条通知
- 重复事件会更新现有通知的 payload 并重置状态为 pending

### 状态约束

```sql
CHECK (status IN ('pending', 'sent', 'failed'))
CHECK (channel IN ('in_app', 'email', 'webhook', 'telegram'))
```

## 去重策略

当同一事件重复触发时：

1. 查找是否已存在相同 `event_id + channel` 的通知
2. 如果存在，更新 payload 并重置状态为 `pending`
3. 如果不存在，创建新通知

这确保了：
- 用户不会收到重复通知
- 事件内容更新时会重新触发通知
- 已读状态会被重置

## 审计日志

所有通知状态变更都会记录到审计日志：

```typescript
type AuditLogEntry = {
  id: string;
  notificationId: string;
  action: "created" | "sent" | "failed" | "read" | "retried" | "deleted";
  fromStatus: string | null;
  toStatus: string | null;
  actor: string;  // "system" 或用户 ID
  metadata: Record<string, unknown>;
  createdAt: string;
};
```

审计日志记录的关键事件：
- `created`: 通知创建
- `sent`: 发送成功（含渠道信息）
- `failed`: 发送失败（含错误信息）
- `retried`: 重试尝试（含重试次数）
- `read`: 用户标记已读
- `deleted`: 删除

## 运维指标

### 来源健康 (`GET /api/sources/health`)

返回来源健康总览：健康/警告/暂停数量、24h 运行统计、平均耗时、最近错误。

### 运维指标 (`GET /api/sources/operational-metrics`)

返回详细运维数据：
- `runDurationTrend`: 7 天运行耗时趋势
- `failureRateTrend`: 7 天失败率趋势
- `backlog`: 待处理任务积压（pending/running 数量、最老 pending 年龄）
- `recentExceptions`: 最近异常聚合（错误消息、次数、涉及来源）
- `hourlyDistribution`: 24 小时运行分布

## API 端点

### 通知管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/notifications` | 列表（支持分页、筛选） |
| GET | `/api/notifications/:notificationId` | 详情 |
| PATCH | `/api/notifications/:notificationId` | 更新状态 |
| POST | `/api/notifications/batch/read` | 批量标记已读 |
| POST | `/api/notifications/batch/delete` | 批量删除 |
| POST | `/api/notifications/batch/clear-unread/:themeId` | 清除主题未读 |
| POST | `/api/notifications/:notificationId/retry` | 重试失败通知 |
| POST | `/api/notifications/:notificationId/send` | 发送外部通知 |
| GET | `/api/notifications/stats` | 统计信息 |
| GET | `/api/notifications/due-retries` | 待重试通知列表 |

### 审计日志

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/notification-audit` | 审计日志列表 |
| GET | `/api/notification-audit/:notificationId/timeline` | 通知时间线 |

### 通知偏好

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/notification-preferences` | 列表 |
| GET | `/api/notification-preferences/:preferenceId` | 详情 |
| POST | `/api/notification-preferences` | 创建 |
| PATCH | `/api/notification-preferences/:preferenceId` | 更新 |
| DELETE | `/api/notification-preferences/:preferenceId` | 删除 |

### 规则配置

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/rule-configurations` | 列表 |
| GET | `/api/rule-configurations/:configId` | 详情 |
| POST | `/api/rule-configurations` | 创建 |
| PATCH | `/api/rule-configurations/:configId` | 更新 |
| DELETE | `/api/rule-configurations/:configId` | 删除 |

### 通道配置

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/channels` | 支持的通道列表 |
| POST | `/api/channels/validate` | 验证通道配置 |
| GET | `/api/channels/:channel/rate-limit` | 获取限流状态 |
| PUT | `/api/channels/:channel/rate-limit` | 更新限流配置 |

### 运维监控

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/sources/health` | 来源健康状态 |
| GET | `/api/sources/operational-metrics` | 运维指标 |
