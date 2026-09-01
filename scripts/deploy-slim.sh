#!/usr/bin/env bash
# Деплой урезанного стека (caddy + postgres + backend) на слабый VPS.
# Всё тяжёлое собирается на маке, на сервер уезжают готовые образы.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SSH_HOST="${SSH_HOST:-luna-is}"
REMOTE_DIR="/opt/luna-tarot"
PLATFORM="linux/amd64"

cd "$REPO_DIR"

echo "▸ 1/6 bootJar"
(cd backend && ./gradlew bootJar -x test --no-daemon -q)
ls -lh backend/build/libs/app.jar

echo "▸ 2/6 образ backend ($PLATFORM)"
docker buildx build --platform "$PLATFORM" -t luna-backend:local -f backend/Dockerfile.runtime --load backend/

echo "▸ 3/6 образ caddy ($PLATFORM)"
docker buildx build --platform "$PLATFORM" -t luna-caddy:duckdns -f caddy/Dockerfile --load caddy/

echo "▸ 4/6 выгрузка образов на сервер"
docker save luna-backend:local luna-caddy:duckdns | gzip -1 | ssh "$SSH_HOST" 'gunzip | docker load'

echo "▸ 5/6 конфиги"
ssh "$SSH_HOST" "mkdir -p $REMOTE_DIR"
scp -q docker-compose.slim.yml Caddyfile.slim "$SSH_HOST:$REMOTE_DIR/"

echo "▸ 6/6 up"
ssh "$SSH_HOST" "cd $REMOTE_DIR && docker compose -f docker-compose.slim.yml --env-file .env up -d"

echo "▸ health"
ssh "$SSH_HOST" "cd $REMOTE_DIR && docker compose -f docker-compose.slim.yml ps"
