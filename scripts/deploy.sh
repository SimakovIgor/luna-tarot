#!/usr/bin/env bash
# С нуля до работающего прода: провижен сервера, затем полная выкатка.
# Запускать на маке: ./scripts/deploy.sh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SSH_HOST="${SSH_HOST:-luna-is}"
REMOTE_DIR="/opt/luna-tarot"

cd "$REPO_DIR"

echo "▸ 1/3 доступ на $SSH_HOST"
if ! ssh -o BatchMode=yes -o ConnectTimeout=10 "$SSH_HOST" 'echo ok' >/dev/null 2>&1; then
    echo "  входа по ключу нет"
    echo "  сделай: ssh-copy-id -i ~/.ssh/id_ed25519.pub root@<IP>"
    echo "  и проверь алиас $SSH_HOST в ~/.ssh/config"
    exit 1
fi

echo "▸ 2/3 провижен сервера"
scp -q scripts/provision-ishosting.sh "$SSH_HOST:/root/"
ssh "$SSH_HOST" 'bash /root/provision-ishosting.sh'

if ! ssh "$SSH_HOST" "test -f $REMOTE_DIR/.env"; then
    echo
    echo "На сервере нет $REMOTE_DIR/.env, без него стек не поднимется."
    echo "Список переменных и откуда их брать: docs/DEPLOY.md, раздел «Состав .env на сервере»."
    echo "Заполни файл и запусти скрипт снова."
    exit 1
fi

echo "▸ 3/3 выкатка"
exec ./scripts/deploy-slim.sh
