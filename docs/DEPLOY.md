# Деплой Luna Tarot на Hetzner CX22 + DuckDNS

Полная инструкция от нуля до открытого Mini App в Telegram. Реальное время — **~45 минут**.

---

## Шаг 1 — Зарегистрироваться на Hetzner (10 мин)

1. Открой [hetzner.cloud/auth/signup](https://accounts.hetzner.com/signUp)
2. Email + пароль, подтверди по почте
3. Привяжи карту (можно Visa/Mastercard любого банка, в т.ч. российского до санкций — потом проверю)
4. Создай **Project** (название любое, например `luna-tarot`)
5. В проекте: **Servers → Add Server**

**Параметры сервера**:
- **Location**: Falkenstein 1 (Германия, ближе всего к РФ) или Helsinki
- **Image**: Ubuntu 24.04
- **Type**: **CX22** (€4.59/мес, 2 vCPU, 4GB RAM, 40GB SSD)
- **Networking**: оставь дефолт (IPv4 + IPv6)
- **SSH keys**: добавь свой публичный ключ (`~/.ssh/id_ed25519.pub`), если есть. Если нет — Hetzner пришлёт пароль root по email
- **Name**: `luna-prod`

Жми **Create & Buy now**. Через ~30 сек сервер поднят. **Скопируй IPv4-адрес** — он понадобится.

---

## Шаг 2 — Получить DuckDNS-поддомен (2 мин)

1. Открой [duckdns.org](https://www.duckdns.org/)
2. Войди через Google (нужен любой аккаунт Google)
3. На странице будет поле **add domain**: впиши `lunatarot` (или любое свободное имя)
4. Нажми **add domain** → появится строка с `lunatarot.duckdns.org`
5. В поле **current ip** этой строки впиши IP из Hetzner и нажми **update ip**
6. Скопируй **token** сверху страницы — он нужен, если захочешь автообновлять IP (для статичного Hetzner не критично)

**Проверка**: подожди 1-2 минуты, потом в терминале:
```bash
dig +short lunatarot.duckdns.org
# должно вывести IP твоего Hetzner-сервера
```

---

## Шаг 3 — Зайти на сервер по SSH (1 мин)

```bash
ssh root@<IP-hetzner>
# или, если без ключа, ввести пароль из email Hetzner
```

При первом входе Hetzner попросит сменить пароль — сделай это.

---

## Шаг 4 — Залить код на сервер (5 мин)

**Вариант А — через свой GitHub** (рекомендую):
1. У себя на маке: `cd /Users/igorsimakov/IdeaProjects/luna-tarot && git init && git remote add origin git@github.com:<твой-username>/luna-tarot.git && git add . && git commit -m "init" && git push -u origin main`
2. На сервере:
```bash
cd /opt
git clone https://github.com/<твой-username>/luna-tarot.git
cd luna-tarot
```

**Вариант Б — через scp** (если без GitHub):
```bash
# С твоего мака:
cd /Users/igorsimakov/IdeaProjects
tar czf luna.tgz luna-tarot/ --exclude='node_modules' --exclude='.gradle' --exclude='build' --exclude='dist'
scp luna.tgz root@<IP>:/opt/
# На сервере:
cd /opt && tar xzf luna.tgz && cd luna-tarot
```

---

## Шаг 5 — Подготовить окружение (10 мин)

На сервере, в `/opt/luna-tarot/`:

```bash
# Запусти bootstrap-скрипт — поставит Docker, настроит firewall
bash scripts/deploy.sh
```

Скрипт ничего не сломает если что-то уже стоит. По завершении он напомнит что прописать в `.env`.

**Отредактируй `.env`**:
```bash
nano .env
```

Минимум что заполнить:
```env
# Postgres — сильный пароль (можно так: openssl rand -base64 24)
POSTGRES_DB=luna
POSTGRES_USER=luna
POSTGRES_PASSWORD=замени_на_рандом
POSTGRES_PORT=5432

# Backend (не публикуем наружу, но переменная нужна)
BACKEND_PORT=8080
LANDING_PORT=8081

# Telegram — твой бот
TG_BOT_TOKEN=8857346393:AAHx...
TG_BOT_USERNAME=luna_taro_card_bot
TG_MINI_APP_URL=https://lunatarot.duckdns.org/app/

# LLM
LLM_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-...
LLM_MODEL=claude-haiku-4-5-20251001

# Admin (опционально, для /admin/**)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=сильный_пароль

# --- PROD-only ---
LUNA_DOMAIN=lunatarot.duckdns.org
```

Сохрани (`Ctrl+O`, `Enter`, `Ctrl+X`).

---

## Шаг 6 — Поднять стек (10 мин на первую сборку)

```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

Первый раз Caddy скачает Let's Encrypt сертификат — это автоматом, занимает ~30 сек. Потом backend соберётся из Dockerfile (~5-8 мин на первой сборке, потом из кеша).

Прогресс смотри:
```bash
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f caddy
```

---

## Шаг 7 — Проверить что работает

```bash
# С сервера:
curl -sI https://lunatarot.duckdns.org/app/ | head -3
# Должно быть HTTP/2 200

curl -s https://lunatarot.duckdns.org/actuator/health
# {"status":"UP"...}

curl -sI https://lunatarot.duckdns.org/
# Должно быть HTTP/2 200 — landing
```

С твоего мака то же самое — открой [https://lunatarot.duckdns.org](https://lunatarot.duckdns.org) в браузере, должна открыться лендинг-страница.

---

## Шаг 8 — Обновить BotFather (2 мин)

1. @BotFather → `/mybots` → `luna_taro_card_bot`
2. **Bot Settings** → **Menu Button** → **Configure menu button**
3. URL: `https://lunatarot.duckdns.org/app/`
4. Сохрани

В Telegram закрой Mini App полностью (свайп вниз → ✕) и переоткрой через кнопку меню. Должно открыться.

---

## Шаг 9 — Cloudflared тоннель можно выключить

На твоём маке:
```bash
pkill -f cloudflared
```

Туннель больше не нужен — у тебя есть постоянный URL.

---

## Шаг 10 (опционально) — Бэкап Postgres

Добавь в `cron` на сервере:
```bash
crontab -e
# Добавь строку — ежедневный бэкап в 4 утра:
0 4 * * * docker exec luna-postgres pg_dump -U luna luna | gzip > /opt/luna-tarot/backups/luna-$(date +\%Y\%m\%d).sql.gz
# И не забудь создать папку:
mkdir -p /opt/luna-tarot/backups
```

Для удалённого бэкапа в S3/Backblaze — отдельная история, скажу когда понадобится.

---

## Обновление кода (когда выйдет новая версия)

```bash
cd /opt/luna-tarot
git pull
docker compose -f docker-compose.prod.yml up -d --build backend
```

Если меняешь только фронт — backend пересборка нужна, т.к. фронт лежит в JAR.

Если меняешь только Caddyfile:
```bash
docker compose -f docker-compose.prod.yml restart caddy
```

---

## Если что-то сломалось

```bash
# Логи
docker compose -f docker-compose.prod.yml logs --tail=200 backend
docker compose -f docker-compose.prod.yml logs --tail=100 caddy

# Перезапуск отдельного сервиса
docker compose -f docker-compose.prod.yml restart backend

# Полная переустановка (НЕ удаляет данные Postgres):
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml --env-file .env up -d --build

# Опасно — удалит ВСЕ данные включая БД и сертификаты:
docker compose -f docker-compose.prod.yml down -v
```

---

## Стоимость по факту (повторение)

- Hetzner CX22: **€4.59/мес** (~500 ₽)
- DuckDNS: **0 ₽**
- Let's Encrypt: **0 ₽**
- Anthropic Claude (100 юзеров × 5 раскладов): **~$3/мес** (~270 ₽)

**Итого: ~770 ₽/мес** до тысячи пользователей.
