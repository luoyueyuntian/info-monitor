# Info Monitor 文档

欢迎阅读 Info Monitor 项目文档。

## 目录

### 架构设计

- [通知模型](./notification-model.md) - 通知数据模型、生命周期、偏好、限流和 API
- [事件规则](./event-rules.md) - 事件规则系统扩展指南
- [Shared Contracts](./shared-contracts.md) - 共享类型包使用规范

### 部署运维

- [部署指南](./deployment.md) - 部署方式、环境变量、故障排查

### 开发指南

- [本地开发](#本地开发) - 如何启动本地开发环境
- [测试](#测试) - 如何运行测试
- [数据库](#数据库) - 数据库迁移和管理

## 本地开发

### 环境要求

- Node.js 18+
- Python 3.9+
- Docker (用于 PostgreSQL)

### 启动步骤

1. 克隆项目并安装依赖：

```bash
git clone <repo-url>
cd info-monitor
npm install
```

2. 创建环境配置：

```bash
cp .env.example .env
```

3. 启动预览环境：

```bash
npm run preview
```

这会自动：
- 启动 PostgreSQL 数据库
- 运行数据库迁移
- 填充示例数据
- 启动 API 和前端服务

### 单独启动服务

```bash
# 启动数据库
npm run db:up

# 运行迁移
npm run db:migrate

# 启动 API
npm run dev:api

# 启动前端
npm run dev:frontend
```

## 测试

### 运行所有测试

```bash
# 前端测试
npm run test:frontend

# API 测试
npm run test:api

# Python Worker 测试
npm run test:python-worker
```

### 类型检查

```bash
npm run typecheck
```

### 代码检查

```bash
npm run lint
```

## 数据库

### 迁移

迁移文件位于 `db/migrations/` 目录，按数字顺序执行。

```bash
# 运行迁移
npm run db:migrate
```

### 添加新迁移

1. 在 `db/migrations/` 下创建新的 SQL 文件
2. 文件名格式：`XXXX_description.sql`
3. 编写 SQL 语句

### 种子数据

```bash
# 填充工作台示例数据
npm run db:seed:workbench-demo
```

## 项目结构

```
info-monitor/
├── apps/
│   ├── api/                 # Node.js API 服务
│   ├── frontend/            # Vue.js 前端应用
│   ├── python-worker/       # Python 数据处理 Worker
│   └── python-scheduler/    # Python 定时调度器
├── packages/
│   └── shared-contracts/    # 共享类型定义
├── db/
│   └── migrations/          # 数据库迁移文件
├── docs/                    # 项目文档
└── scripts/                 # 工具脚本
```

## API 概览

### 核心资源

| 资源 | 端点前缀 | 说明 |
|------|----------|------|
| 主题 | `/api/themes` | 监控主题管理 |
| 事件 | `/api/events` | 事件查询和状态更新 |
| 来源 | `/api/sources` | 数据源管理 |
| 通知 | `/api/notifications` | 通知管理 |
| 仪表盘 | `/api/dashboard` | 汇总数据 |

### 通知相关

| 端点 | 说明 |
|------|------|
| `GET /api/notifications` | 通知列表（支持分页、筛选） |
| `POST /api/notifications/batch/read` | 批量标记已读 |
| `POST /api/notifications/:id/retry` | 重试失败通知 |
| `POST /api/notifications/:id/send` | 发送外部通知 |
| `GET /api/notifications/stats` | 通知统计 |
| `GET /api/notification-audit` | 审计日志 |
| `GET /api/notification-preferences` | 通知偏好 |
| `GET /api/rule-configurations` | 规则配置 |
| `GET /api/sources/health` | 来源健康监控 |
| `GET /api/sources/operational-metrics` | 运维指标（耗时趋势、失败率、积压、异常聚合） |
| `GET /api/channels` | 支持的通知通道列表 |

## 部署

### 构建

```bash
npm run build
```

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | PostgreSQL 连接字符串（为空时进入 Mock 模式） | - |
| `API_PORT` | API 服务端口 | 3001 |
| `API_HOST` | API 绑定地址 | 0.0.0.0 |
| `CORS_ORIGIN` | CORS 允许的来源 | http://localhost:5173 |

详细配置参见 [部署指南](./deployment.md#环境变量)。

## 常见问题

### 如何添加新的事件规则？

参见 [事件规则扩展指南](./event-rules.md)。

### 如何添加新的通知渠道？

1. 在 `apps/api/src/services/notification-channels.ts` 中实现发送逻辑
2. 在 `ChannelConfig` 类型中添加配置
3. 在 `sendNotification` 函数中添加分发逻辑

### 如何自定义通知模板？

通知模板定义在 `packages/shared-contracts/src/notification-theme.ts` 中的 `NOTIFICATION_TEMPLATES` 对象。

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

### 提交规范

使用 Conventional Commits：

```
feat: 添加新功能
fix: 修复问题
docs: 文档更新
style: 代码格式调整
refactor: 重构
test: 测试相关
chore: 构建/工具链更新
```
