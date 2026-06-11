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
   失败 (failed) → 重试 (pending)
```

1. **创建**: Worker 处理事件后创建通知
2. **发送**: 通过指定渠道成功投递
3. **失败**: 投递失败，可手动重试
4. **重试**: 将失败通知重新标记为 pending

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

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/notifications` | 列表（支持分页、筛选） |
| GET | `/api/notifications/:id` | 详情 |
| PATCH | `/api/notifications/:id` | 更新状态 |
| POST | `/api/notifications/batch/read` | 批量标记已读 |
| POST | `/api/notifications/batch/delete` | 批量删除 |
| POST | `/api/notifications/:id/retry` | 重试失败通知 |
| POST | `/api/notifications/:id/send` | 发送外部通知 |
| GET | `/api/notifications/stats` | 统计信息 |
| GET | `/api/notification-audit` | 审计日志 |
| GET | `/api/notification-audit/:id/timeline` | 通知时间线 |
