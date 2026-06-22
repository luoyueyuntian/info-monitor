#!/bin/bash

# Info Monitor 部署脚本
# 用法:
#   ./deploy.sh              # 部署所有服务
#   ./deploy.sh api          # 只部署 API
#   ./deploy.sh worker       # 只部署 Worker
#   ./deploy.sh scheduler    # 只部署 Scheduler
#   ./deploy.sh --no-cache   # 强制全量重建（不用缓存）

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_CMD="$ROOT_DIR/scripts/docker-compose.sh"
cd "$ROOT_DIR"

NO_CACHE=""
TARGETS=()

# 解析参数
for arg in "$@"; do
  case "$arg" in
    --no-cache)
      NO_CACHE="--no-cache"
      ;;
    api|worker|scheduler|postgres)
      TARGETS+=("$arg")
      ;;
    *)
      echo "❌ 未知参数: $arg"
      echo "用法: ./deploy.sh [--no-cache] [api|worker|scheduler]"
      exit 1
      ;;
  esac
done

# 默认部署所有应用服务（不含 postgres）
if [[ ${#TARGETS[@]} -eq 0 ]]; then
  TARGETS=(api worker scheduler)
fi

echo "🚀 开始部署 Info Monitor..."
echo "   目标服务: ${TARGETS[*]}"
echo ""

# 1. 确保 postgres 在运行
echo "▶  确保 PostgreSQL 运行中..."
"$COMPOSE_CMD" up -d postgres

# 2. 等待 postgres 健康
echo "⏳ 等待 PostgreSQL 就绪..."
timeout=30
until "$COMPOSE_CMD" exec -T postgres pg_isready -U postgres -d info_monitor >/dev/null 2>&1; do
  timeout=$((timeout - 1))
  if [[ $timeout -le 0 ]]; then
    echo "❌ PostgreSQL 未就绪，超时退出"
    exit 1
  fi
  sleep 1
done
echo "   ✓ PostgreSQL 就绪"

# 3. 运行迁移
echo "🔄 运行数据库迁移..."
npm run db:migrate --silent
echo "   ✓ 迁移完成"

# 4. 停止目标容器
echo "⏹  停止旧容器: ${TARGETS[*]}..."
"$COMPOSE_CMD" stop "${TARGETS[@]}" 2>/dev/null || true
"$COMPOSE_CMD" rm -f "${TARGETS[@]}" 2>/dev/null || true

# 5. 删除旧镜像
echo "🗑  删除旧镜像..."
for svc in "${TARGETS[@]}"; do
  image=$("$COMPOSE_CMD" images "$svc" -q 2>/dev/null)
  if [[ -n "$image" ]]; then
    docker rmi -f "$image" 2>/dev/null || true
  fi
done

# 6. 构建新镜像
echo "🔨 构建镜像: ${TARGETS[*]}..."
"$COMPOSE_CMD" build $NO_CACHE "${TARGETS[@]}"

# 7. 启动容器
echo "▶  启动容器: ${TARGETS[*]}..."
"$COMPOSE_CMD" up -d "${TARGETS[@]}"

# 8. 等待服务就绪
echo "⏳ 等待服务启动..."
sleep 3

# 9. 检查状态
echo ""
echo "📊 容器状态:"
"$COMPOSE_CMD" ps "${TARGETS[@]}" postgres

# 10. 健康检查
echo ""
echo "🔍 健康检查:"
for svc in "${TARGETS[@]}"; do
  status=$("$COMPOSE_CMD" ps "$svc" --format "{{.State}}" 2>/dev/null)
  if [[ "$status" == "running" ]]; then
    echo "   ✓ $svc: running"
  else
    echo "   ✗ $svc: $status"
  fi
done

echo ""
echo "✅ 部署完成！"
echo "   API 地址: http://localhost:6780"
echo "   查看日志: $COMPOSE_CMD logs -f ${TARGETS[*]}"
