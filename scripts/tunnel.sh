#!/usr/bin/env bash
# Поднимает Cloudflare quick tunnel к локальному backend (8090) и выдаёт https-URL,
# который надо вставить в .env как TG_MINI_APP_URL + зарегистрировать у @BotFather.
#
# Что делает:
#   1. Проверяет cloudflared. Если нет — предлагает поставить через brew.
#   2. Запускает quick tunnel: cloudflared tunnel --url http://localhost:8090
#   3. Из вывода извлекает https URL, печатает большим и удобным.
#
# Использование:
#   ./scripts/tunnel.sh
# Затем добавь в .env:
#   TG_MINI_APP_URL=https://<твой-уникальный-домен>.trycloudflare.com/app/
# И перезапусти backend:
#   docker compose --env-file .env up -d --build backend

set -e

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared не установлен."
  echo "Установить через Homebrew (один раз):"
  echo "  brew install cloudflared"
  echo
  read -r -p "Установить сейчас? [y/N] " ans
  if [[ "$ans" =~ ^[Yy]$ ]]; then
    brew install cloudflared
  else
    echo "Альтернатива — ngrok: brew install ngrok && ngrok http 8090"
    exit 1
  fi
fi

echo "🌙 Поднимаю Cloudflare tunnel к http://localhost:8090 ..."
echo "   Жди ~5 секунд, потом увидишь https://<...>.trycloudflare.com"
echo
echo "После того, как URL появится:"
echo "  1) Скопируй его и добавь в .env:"
echo "       TG_MINI_APP_URL=https://<...>.trycloudflare.com/app/"
echo "  2) Открой @BotFather → /mybots → luna_taro_card_bot → Bot Settings → Menu Button →"
echo "     Configure menu button → введи тот же URL"
echo "  3) docker compose --env-file .env up -d --build backend"
echo "  4) Открой бот в Telegram — у него внизу будет кнопка-меню «Открыть»"
echo
echo "Чтобы остановить туннель — Ctrl+C"
echo "═══════════════════════════════════════════════════════════════"

cloudflared tunnel --url http://localhost:8090
