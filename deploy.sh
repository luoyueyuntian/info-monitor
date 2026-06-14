#!/bin/bash

# Info Monitor 部署脚本
# 用于停止旧容器、删除旧镜像、构建并启动新镜像

set -e

echo "🚀 开始部署 Info Monitor..."

# 1. 停止并移除旧容器
echo "⏹  停止旧容器..."
docker compose down

# 2. 删除旧的应用镜像（保留 postgres 镜像）
echo "🗑  删除旧的应用镜像..."
docker images "info-monitor-app" -q | xargs -r docker rmi -f 2>/dev/null || true

# 3. 构建新镜像
echo "🔨 构建新镜像..."
docker compose build --no-cache app

# 4. 启动新容器
echo "▶  启动新容器..."
docker compose up -d

# 5. 等待服务就绪
echo "⏳ 等待服务启动..."
sleep 3

# 6. 检查容器状态
echo "📊 容器状态:"
docker compose ps

# 7. 检查健康状态
echo ""
echo "✅ 部署完成！"
echo "   API 地址: http://localhost:3001"
echo "   查看日志: docker compose logs -f app"
