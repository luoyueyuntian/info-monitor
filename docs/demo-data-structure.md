# Demo 数据结构说明

更新时间：2026-06-12

## 1. 概述

项目中保留两套 demo / preview 数据，分别用于不同场景：

| 数据位置 | 用途 | 运行环境 |
|----------|------|----------|
| `packages/shared-contracts/src/demo-scene-definitions.ts` | 共享定义（ID 常量、类型） | 前端/API 共享 |
| `apps/frontend/src/test-fixtures/demo-fixtures.ts` | 前端测试 / 演示数据资产 | 前端测试与静态示例 |
| `scripts/lib/demo-scene-ids.mjs` | DB 种子脚本共享 ID | Node 脚本 |
| `scripts/db-seed-*.mjs` | DB 种子脚本 | PostgreSQL |

## 2. ID 命名约定

所有 ID 使用 **kebab-case** 命名，格式为 `{type}-{kebab-case-name}`。

| 实体类型 | 格式 | 示例 |
|----------|------|------|
| Theme | `theme-{name}` | `theme-surface-pro-8` |
| Source | `source-{name}` | `source-xianyu-surface` |
| Event | `event-{name}` | `event-surface-low` |
| Record | `record-{name}` | `record-surface-baseline` |
| Run | `run-{name}` | `run-surface-baseline` |
| Snapshot | `snapshot-{name}` | `snapshot-surface-baseline` |
| Change | `change-{name}` | `change-pbc-injection` |
| Notification | `notification-{name}` | `notification-surface-low` |
| Event Status History | `event-status-history-{name}` | `event-status-history-pbc-injection` |

## 3. Demo 场景列表

### 3.1 Surface Pro 8 价格监控

- **主题 ID**: `theme-surface-pro-8`
- **类型**: `price`
- **来源**: 闲鱼 (`source-xianyu-surface`)、转转 (`source-zhuanzhuan-surface`)
- **事件**: 30 天最低价 (`event-surface-low`)

### 3.2 央行公开市场操作

- **主题 ID**: `theme-pbc-open-market`
- **类型**: `financial_event`
- **来源**: 公告列表 (`source-pbc-open-market`)、历史数据 (`source-pbc-open-market-history`)
- **事件**: 流动性回笼 (`event-pbc-withdrawal`)、流动性投放 (`event-pbc-injection`)

### 3.3 统计局 CPI 数据发布

- **主题 ID**: `theme-stats-cpi-releases`
- **类型**: `news_announcement`
- **来源**: 数据发布列表 (`source-stats-cpi-release`)
- **事件**: CPI 发布 (`event-cpi-release`)

### 3.4 Figma 产品更新

- **主题 ID**: `theme-figma-updates`
- **类型**: `content_update`
- **来源**: Release Notes (`source-figma-release-notes`)
- **事件**: 新版本发布 (`event-figma-release`)

### 3.5 茅台每日价格

- **主题 ID**: `theme-eastmoney-moutai`
- **类型**: `price`
- **来源**: 东方财富 K 线 (`source-eastmoney-moutai-kline`)
- **事件**: 无（仅种子数据）

### 3.6 央行新闻发布

- **主题 ID**: `theme-pbc-news`
- **类型**: `news_announcement`
- **来源**: 新闻列表 (`source-pbc-news-list`)
- **事件**: 最新报告 (`event-pbc-news-latest`)

### 3.7 A股与港股每日市场概览

- **主题 ID**: `theme-cn-hk-market-overview`
- **类型**: `financial_event`
- **来源**: 东方财富中港股概览 (`source-cn-hk-market-overview`)
- **事件**: A股偏强信号 (`event-cn-hk-market-bullish`)

## 4. 三套数据的映射关系

### 4.1 ID 映射

前端/API 和 DB 种子脚本使用相同的 ID（已统一为 kebab-case）：

| 前端/API ID | DB 种子 ID |
|-------------|------------|
| `theme-surface-pro-8` | `theme-surface-pro-8` |
| `source-xianyu-surface` | `source-xianyu-surface` |
| `event-surface-low` | `event-surface-low` |

### 4.2 字段差异

| 字段 | 前端 demo-fixtures | DB 种子 |
|------|-------------------|-------------------|---------|
| `eventType` | 有 | 有 | 有 |
| `evidence` | 无 | 有 | 有 |
| `sourceHealth` | 有 | 无 | 无（由查询计算） |
| `latestEventTitle` | 有 | 无 | 无（由查询计算） |

说明：
- 前端的 `sourceHealth`、`latestEventTitle` 等是聚合字段，用于展示
- API 的 `evidence` 字段用于 mock 数据的详细展示
- DB 不存储聚合字段，由查询时计算

### 4.3 Notification 结构

统一使用扁平结构（与 `shared-contracts` 的 `NotificationItem` 一致）：

```typescript
{
  id: string;
  eventId: string;
  channel: string;
  status: string;
  title: string;      // 顶层
  summary: string;    // 顶层
  signal: string;     // 顶层
  sentAt: string | null;
  createdAt: string;
}
```

## 5. 新增 Demo 场景流程

1. 在 `packages/shared-contracts/src/demo-scene-definitions.ts` 中添加 ID 常量和定义
2. 在 `scripts/lib/demo-scene-ids.mjs` 中同步添加 ID 常量
3. 在 `apps/frontend/src/test-fixtures/demo-fixtures.ts` 中添加前端测试或静态演示数据（如仍需要）
4. 在 DB seed 脚本中添加对应的真实预览数据
5. 如需 DB 种子数据，创建或更新 `scripts/db-seed-*.mjs`
6. 更新本文档

## 6. 验证命令

```bash
# 类型检查
npm run typecheck

# 构建
npm run build

# 验证 DB 种子脚本语法
node --check scripts/db-seed-demo.mjs
node --check scripts/db-seed-pbc-open-market-demo.mjs
```
