#!/usr/bin/env bash
# Быстрый редеплой без перекачки 78-картовой колоды.
#
# Что НЕ передаём: backend/src/main/resources/cards/* (статичные изображения,
# уже лежат на сервере) + backend/src/main/resources/static/app/cards/*
# (vite-копия тех же картинок, тоже не меняется).
#
# Что передаём: исходники backend (Java + sql миграции) + новый frontend
# бандл (backend/src/main/resources/static/app/{index.html,assets/*.js,
# assets/*.css}) + конфиги. Это ~3-5 MB вместо 80 MB.
#
# Использование (из корня репо):
#   ./scripts/quick-deploy.sh
set -euo pipefail

REPO_DIR="/Users/igorsimakov/IdeaProjects/luna-tarot"
PARENT_DIR="/Users/igorsimakov/IdeaProjects"
SSH_HOST="luna"
REMOTE_DIR="/opt/luna-tarot"
TARBALL="/tmp/luna-quick.tgz"

cd "$PARENT_DIR"

echo "▸ pack (без карт)..."
COPYFILE_DISABLE=1 tar \
    --exclude='node_modules' \
    --exclude='.gradle' \
    --exclude='build' \
    --exclude='dist' \
    --exclude='.env' \
    --exclude='.git' \
    --exclude='.idea' \
    --exclude='luna-tarot/backend/src/main/resources/cards' \
    --exclude='luna-tarot/backend/src/main/resources/static/app/cards' \
    -czf "$TARBALL" \
    luna-tarot/

SIZE=$(du -h "$TARBALL" | cut -f1)
LOCAL_MD5=$(md5 -q "$TARBALL")
echo "  размер: $SIZE  md5: $LOCAL_MD5"

echo "▸ scp..."
scp -q "$TARBALL" "$SSH_HOST:/tmp/luna-quick.tgz"

REMOTE_MD5=$(ssh "$SSH_HOST" 'md5sum /tmp/luna-quick.tgz | cut -d" " -f1')
if [[ "$LOCAL_MD5" != "$REMOTE_MD5" ]]; then
    echo "  ✗ md5 mismatch: local=$LOCAL_MD5 remote=$REMOTE_MD5"
    exit 1
fi
echo "  md5 совпали"

echo "▸ extract + rebuild backend..."
ssh "$SSH_HOST" "cd $REMOTE_DIR && \
    cp .env /tmp/luna.env.bak && \
    tar --strip-components=1 -xzf /tmp/luna-quick.tgz 2>/dev/null && \
    cp /tmp/luna.env.bak .env && \
    docker compose -f docker-compose.prod.yml --env-file .env up -d --build backend 2>&1 | tail -4"

echo "▸ health check..."
sleep 6
HEALTH=$(curl -s https://lunatarot.duckdns.org/actuator/health)
BUNDLE=$(curl -s https://lunatarot.duckdns.org/app/ | grep -oE 'index-[A-Za-z0-9_-]+\.(js|css)' | sort -u | tr '\n' ' ')
echo "  health: $HEALTH"
echo "  bundle: $BUNDLE"
echo "✓ deploy done"
