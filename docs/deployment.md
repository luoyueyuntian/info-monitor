# 部署指南

本文档描述 Info Monitor 的部署方式和环境变量配置。

## 快速开始

### Docker Compose（推荐）

最简单的部署方式是使用 Docker Compose，它会启动所有服务。仓库脚本会自动兼容
`docker compose` 和 `docker-compose` 两种命令形式：

```bash
# 复制并编辑环境变量
cp .env.example .env
# 编辑 .env 填入必要配置

# 启动所有服务
npm run docker:up

# 查看日志
npm run docker:logs
```

服务启动后：
- 前端: http://localhost:3000
- API: http://localhost:3000/api
- PostgreSQL: localhost:5432

### 本地开发

```bash
# 安装依赖
npm install

# 启动 PostgreSQL（需要本地安装或使用 Docker）
npm run db:up

# 运行数据库迁移
npm run db:migrate

# 启动开发服务器
npm run dev
```

本地开发时：
- API 默认运行在 http://localhost:3001
- 前端默认运行在 http://localhost:5173
- 前端通过 Vite 代理将 `/api` 请求转发到 API 服务

## 架构组件

| 组件 | 说明 | 默认端口 |
|------|------|----------|
| frontend | Vue 3 SPA (Vite dev server) | 5173 |
| api | Fastify API 服务 | 3001 |
| python-worker | 数据采集/标准化/事件处理 | - |
| python-scheduler | 调度器，触发采集任务 | - |
| postgres | PostgreSQL 16 数据库 | 5432 |

在 Docker/生产环境中，Nginx 反向代理将前端和 API 统一到 3000 端口。

## 数据库迁移

```bash
# 使用迁移脚本
npm run db:migrate

# 或手动执行 SQL
psql $DATABASE_URL -f db/migrations/0001_initial.sql
psql $DATABASE_URL -f db/migrations/0002_normalized_record_logical_key.sql
# ... 依次执行所有迁移文件
```

迁移文件位于 `db/migrations/` 目录，按编号顺序执行。

## 环境变量

### 必需变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | `postgresql://user:pass@host:5432/db` |

### 可选变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `API_PORT` | API 服务端口 | `3001` |
| `API_HOST` | API 绑定地址 | `0.0.0.0` |
| `CORS_ORIGIN` | CORS 允许的来源 | `http://localhost:5173` |

### 通知通道配置

以下变量用于外部通知通道，通过 API 管理：

| 通道 | 配置项 | 说明 |
|------|--------|------|
| Webhook | `url`, `headers` | HTTP POST 目标 URL 和自定义头 |
| Telegram | `botToken`, `chatId` | Telegram Bot API 凭据 |

通道配置通过 API 端点管理，不通过环境变量：

```
POST /api/channels/validate       -- 验证通道配置
GET  /api/channels                -- 列出支持的通道
GET  /api/channels/:channel/rate-limit  -- 查看限流状态
PUT  /api/channels/:channel/rate-limit  -- 更新限流配置
```

## 数据库要求

API 运行时必须提供 `DATABASE_URL`：
- 启动入口会在缺少 `DATABASE_URL` 时直接失败
- Docker 镜像同样要求显式提供数据库连接
- 本地开发和预览也应通过迁移与 seed 数据准备真实数据库

```bash
# 本地开发前先准备数据库
npm run db:up
npm run db:migrate
npm run db:seed:workbench-demo
```

## 生产部署建议

### 安全

1. 使用强密码的数据库用户
2. 配置 `CORS_ORIGIN` 为实际域名
3. 使用 HTTPS 反向代理（Nginx/Caddy）
4. 定期备份数据库
5. 限流更新端点 (`PUT /api/channels/:channel/rate-limit`) 应添加认证

### 性能

1. 为 PostgreSQL 配置适当的连接池大小
2. 监控 `source_runs` 表增长，定期清理旧数据
3. 配置适当的 `schedule_interval_seconds` 避免频繁采集

### 监控

使用运维指标 API 监控系统状态：

```bash
# 来源健康状态
curl http://localhost:3001/api/sources/health

# 运维指标（含趋势数据）
curl http://localhost:3001/api/sources/operational-metrics

# 通知统计
curl http://localhost:3001/api/notifications/stats

# 待重试通知
curl http://localhost:3001/api/notifications/due-retries
```

## 故障排查

### 数据库连接失败

检查 `DATABASE_URL` 是否正确，PostgreSQL 是否可访问。

### Worker 不处理任务

1. 确认 `source_runs` 表有待处理的 `pending` 记录
2. 检查 worker 日志是否有错误
3. 确认来源配置正确

### 通知未发送

1. 检查通知偏好是否启用：`GET /api/notification-preferences`
2. 检查通道配置是否有效：`POST /api/channels/validate`
3. 检查限流状态：`GET /api/channels/:channel/rate-limit`
4. 查看审计日志：`GET /api/notification-audit`
