#!/usr/bin/env bash
# 在服务器项目目录内执行：一键构建并启动
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .env.docker ]; then
  cp .env.docker.example .env.docker 2>/dev/null || true
fi

echo "==> 构建并启动容器..."
if command -v docker-compose >/dev/null 2>&1; then
  docker-compose up -d --build
else
  docker compose up -d --build
fi

echo ""
echo "==> 状态"
docker ps --filter name=campus- --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "访问: http://服务器IP:8080"
echo "演示账号: demo / 123456"
