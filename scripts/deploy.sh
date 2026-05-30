#!/usr/bin/env bash
# Bootstrap скрипт для чистого Ubuntu 24.04 на Hetzner CX22.
# Ставит Docker, клонит репо, поднимает production stack.
#
# Использование (выполнять от root на VPS):
#   curl -fsSL https://raw.githubusercontent.com/<твой-репо>/main/scripts/deploy.sh | sudo bash
# или
#   wget <url-репо>/scripts/deploy.sh && chmod +x deploy.sh && sudo ./deploy.sh
#
# После завершения скрипт оставит тебя с готовым стеком, но .env нужно будет
# заполнить руками и пересобрать backend.

set -euo pipefail

LUNA_HOME="/opt/luna-tarot"
REPO_URL="${REPO_URL:-https://github.com/YOUR_USERNAME/luna-tarot.git}"

echo "🌙 Luna Tarot — bootstrap на чистом VPS"
echo "─────────────────────────────────────"

if [[ "$EUID" -ne 0 ]]; then
  echo "❌ Запусти под root: sudo ./deploy.sh"
  exit 1
fi

# 1. Обновляем пакеты, ставим базовое
echo "[1/5] apt update + базовые утилиты…"
apt-get update -qq
apt-get install -y -qq curl git ca-certificates ufw

# 2. Docker + compose plugin
if ! command -v docker >/dev/null 2>&1; then
  echo "[2/5] Ставлю Docker…"
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
else
  echo "[2/5] Docker уже стоит, пропускаю"
fi

# 3. Firewall — открываем только 22 (SSH), 80 (HTTP→HTTPS redirect), 443 (HTTPS)
echo "[3/5] Настраиваю firewall (UFW)…"
ufw --force reset >/dev/null
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

# 4. Клонируем репо
if [[ -d "$LUNA_HOME" ]]; then
  echo "[4/5] Репо уже клонирован, git pull…"
  cd "$LUNA_HOME"
  git pull
else
  echo "[4/5] Клонирую репо в $LUNA_HOME…"
  git clone "$REPO_URL" "$LUNA_HOME"
  cd "$LUNA_HOME"
fi

# 5. Готовим .env, если нет
if [[ ! -f "$LUNA_HOME/.env" ]]; then
  echo "[5/5] Создаю .env из .env.example…"
  cp .env.example .env
  cat >> .env << 'EOF'

# --- Production-only ---
# Домен, на котором будет жить Mini App. Caddy выпустит Let's Encrypt серт.
LUNA_DOMAIN=
EOF
  echo ""
  echo "════════════════════════════════════════════════════════════════"
  echo "✅ Базовая установка завершена!"
  echo ""
  echo "ОБЯЗАТЕЛЬНЫЕ ШАГИ:"
  echo "  1. Отредактируй $LUNA_HOME/.env и заполни:"
  echo "       - LUNA_DOMAIN=lunatarot.duckdns.org   (свой DuckDNS поддомен)"
  echo "       - TG_BOT_TOKEN, TG_BOT_USERNAME       (от @BotFather)"
  echo "       - TG_MINI_APP_URL=https://lunatarot.duckdns.org/app/"
  echo "       - POSTGRES_PASSWORD                   (сгенерируй сильный)"
  echo "       - ANTHROPIC_API_KEY                   (если LLM_PROVIDER=claude)"
  echo "       - LLM_PROVIDER=claude (на проде)"
  echo ""
  echo "  2. Подними стек:"
  echo "       cd $LUNA_HOME"
  echo "       docker compose -f docker-compose.prod.yml --env-file .env up -d --build"
  echo ""
  echo "  3. В DuckDNS укажи IP этого сервера ($(curl -s ifconfig.me 2>/dev/null || echo "<IP>")) — ждать 1-2 мин propagation"
  echo ""
  echo "  4. В @BotFather → Menu Button → \$LUNA_MINI_APP_URL"
  echo "════════════════════════════════════════════════════════════════"
else
  echo "[5/5] .env уже есть. Подними стек:"
  echo "       docker compose -f docker-compose.prod.yml --env-file .env up -d --build"
fi
