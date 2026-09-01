#!/usr/bin/env bash
# Быстрый редеплой только backend. На сервер уезжает один JAR, тонкий образ
# поверх готовой JRE собирается там же. Caddy и postgres не трогаются.
# Полная выкатка обоих образов: ./scripts/deploy-slim.sh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SSH_HOST="${SSH_HOST:-luna-is}"
REMOTE_DIR="/opt/luna-tarot"
BUILD_CTX="$REMOTE_DIR/.build"
DOMAIN="${LUNA_DOMAIN:-lunatarot.duckdns.org}"

cd "$REPO_DIR"

echo "▸ 1/4 bootJar"
(cd backend && ./gradlew bootJar -x test --no-daemon -q)
ls -lh backend/build/libs/app.jar

echo "▸ 2/4 заливка JAR"
ssh "$SSH_HOST" "mkdir -p $BUILD_CTX/build/libs"
scp -q backend/Dockerfile.runtime "$SSH_HOST:$BUILD_CTX/Dockerfile"
scp backend/build/libs/app.jar "$SSH_HOST:$BUILD_CTX/build/libs/app.jar"

echo "▸ 3/4 сборка образа на сервере"
ssh "$SSH_HOST" "cd $BUILD_CTX && docker build -q -t luna-backend:local ."

echo "▸ 4/4 рестарт backend"
ssh "$SSH_HOST" "cd $REMOTE_DIR && docker compose -f docker-compose.slim.yml --env-file .env up -d --no-deps --force-recreate backend"

echo "▸ health"
HEALTH=""
for _ in $(seq 1 30); do
    HEALTH=$(curl -s --max-time 3 "https://$DOMAIN/actuator/health" || true)
    if [[ "$HEALTH" == *'"UP"'* ]]; then
        break
    fi
    sleep 2
done
BUNDLE=$(curl -s "https://$DOMAIN/app/" | grep -oE 'index-[A-Za-z0-9_-]+\.(js|css)' | sort -u | tr '\n' ' ')
echo "  health: $HEALTH"
echo "  bundle: $BUNDLE"
