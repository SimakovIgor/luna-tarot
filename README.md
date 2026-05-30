# 🌙 Luna Tarot

AI-таролог в Telegram. Мистический, на русском, на передовых нейронках.
Бот + Mini App (Telegram WebView с авторским дизайном).

---

## Что внутри

| Поверхность | Что делает |
|---|---|
| **Telegram-бот** [@luna_taro_card_bot](https://t.me/luna_taro_card_bot) | Точка входа. После добавления `TG_MINI_APP_URL` — бот превращается в «приглашатель» с одной кнопкой `✨ Войди в Зеркало Луны`. Без URL — классический бот с раскладами в чате. |
| **Mini App** (Vite + React + TS) | Полноценное приложение внутри Telegram WebView. Hub, ритуальный расклад, карта дня, дневник, шеринг открытки. |
| **Лендинг** (HTML + nginx) | Статическая страница с большой картой и кнопкой «открыть бота». |

**Что юзер может:**
- 🔮 **4 расклада на вопрос** — Путь во времени (3), Любовь (5), Кельтский крест (10), Колесо года (12). Ритуал: вопрос → тасовка колоды → выбор N карт из веера → опция «открыть все» (auto-reveal stagger) или флип по одной → совет Claude + шеринг PNG-открытки.
- 🌙 **Карта дня** + **гороскоп дня** — одна карта на пользователя в день (детерминированно). Утренний push в 08:00 МСК. AI-гороскоп по знаку + лунной фазе.
- 💫 **Совместимость с другим человеком** — ввод имени + ДР партнёра → знак + AI-разбор пары через стихии.
- 📜 **Дневник Луны** — таймлайн раскладов, разворот с layout-визуализацией, **«как сбылось»** (отметить ✨ / 🌗 / 🌑 + заметка).
- 👤 **Профиль** — эзо-данные (зодиак, число судьбы, лунная фаза, ДР, пол), редактирование, FAQ.

**Эзотерический профиль** (по дате рождения): знак зодиака, число судьбы (master numbers 11/22/33), лунная фаза. Передаётся в промпт Claude — Луна обращается лично + согласует роды по полу.

**Cinematic splash → hub** — карта-рубашка крутится при загрузке и плавно остаётся на хабе как карта дня (один React-узел position:fixed, никакого «исчезла-появилась»).

---

## Стек

### Application
| Слой | Технология |
|---|---|
| Backend | Java 21, Spring Boot 3.5, Gradle (Kotlin DSL) |
| DB | PostgreSQL 16, Flyway |
| Бот | `telegrambots-springboot-longpolling-starter` 9.0 (rubenlagus) |
| LLM | Anthropic Claude (Haiku 4.5) через `RestClient`; stub-fallback на dev |
| Mini App | Vite 6 + React 18 + TypeScript + framer-motion |
| Шрифты | Cinzel + Cormorant Garamond + UnifrakturMaguntia |
| Landing | Static HTML / nginx |

### Infrastructure (production)
| Слой | Технология |
|---|---|
| VPS | Hetzner CX22 (2 vCPU, 4GB RAM, Falkenstein) |
| Reverse proxy | Caddy 2.8 (auto-HTTPS через Let's Encrypt) |
| Контейнеризация | Docker + docker-compose (`docker-compose.prod.yml`) |
| DNS | DuckDNS (бесплатный поддомен, A-record на VPS IP) |
| Деплой | scp tarball + `docker compose up -d --build` |
| Bootstrap | `scripts/deploy.sh` (Docker install + firewall на чистом Ubuntu 24.04) |

### Observability
| Сервис | Где живёт | Что мониторит |
|---|---|---|
| **Uptime Kuma** | self-host на VPS (отдельный поддомен) | health-эндпоинты, Telegram-алерты при падении |
| **Sentry Cloud** (sentry.io EU) | SaaS free tier (5K err/мес) | JS-ошибки фронта с stacktrace |
| **PostHog Cloud** (us.posthog.com) | SaaS free tier (1M events/мес) | funnel, retention, session replay, кастомные track-points |
| **Admin dashboard** (`/admin/`) | self-host, HTML+JSON | totals users/readings, breakdown по типам, новые юзеры по дням |

**Track points в PostHog** (см. `src/observability.ts`):
- `app_opened` — каждое открытие Mini App
- `onboarding_completed` — успешное завершение онбординга
- `spread_started` / `spread_completed` — старт/финиш расклада с `spread_id`
- `share_clicked` / `share_completed` — клик и результат шеринга
- Plus автозахват: pageviews, клики (autocapture)

**identify**: при успешном auth биндим Telegram `tgUserId` к Sentry user + PostHog distinct ID — события дальше per-user (funnel, retention, error trace).

### Dev tooling
| Слой | Технология |
|---|---|
| Лок. dev | Cloudflare quick tunnel (`scripts/tunnel.sh`) для проброса в Telegram |
| Тесты бэка | JUnit 5 + AssertJ + Testcontainers (Postgres 16) |
| Статан бэка | Checkstyle 10 + PMD 7 + SpotBugs 4 + JaCoCo |
| Тесты фронта | (пока нет, Phase 5 — Playwright) |
| Lint фронта | ESLint 8 + TypeScript strict |
| Качество | Checkstyle + PMD + SpotBugs + JaCoCo + Testcontainers Postgres |

---

## Структура

```
luna-tarot/
├── backend/                       # Spring Boot
│   ├── src/main/java/com/lunatarot/backend/
│   │   ├── bot/                   # Telegram-адаптер (long-polling)
│   │   ├── api/                   # REST + auth-filter
│   │   ├── service/               # домен (онбординг, чтение, эзо-профиль)
│   │   ├── llm/                   # TarotInterpreter (stub / claude)
│   │   ├── scheduler/             # DailyCardScheduler
│   │   └── domain/                # JPA entities + repositories
│   └── src/main/resources/
│       ├── db/migration/          # Flyway (V1–V10): users / cards / readings / reversed
│       ├── cards/                 # 78 JPG (22 старших + 4×14 младших)
│       └── static/app/            # билд фронта (выезжает после `npm run build:to-backend`)
├── frontend/                      # Vite SPA
│   └── src/
│       ├── components/            # дизайн-система (TarotCard, MoonBackground, ...)
│       ├── pages/                 # HubPage / OnboardingPage / ReadingFlowPage / CardOfDayPage / DiaryPage
│       ├── api/                   # auth, me, reading
│       ├── telegram/              # WebApp SDK wrapper
│       └── util/                  # postcard generator, format helpers
├── landing/                       # nginx + index.html
├── docs/design/                   # handoff-бандл от Claude Design
├── scripts/tunnel.sh              # Cloudflare quick tunnel для теста в реальном TG
├── docker-compose.yml
└── .env.example
```

---

## Локальный запуск

```bash
cp .env.example .env
# в .env уже стоит TG_BOT_TOKEN (получен у @BotFather)
# для Claude — пропиши ANTHROPIC_API_KEY (или оставь LLM_PROVIDER=stub)

docker compose --env-file .env up --build
```

После старта:
- Backend health: `http://localhost:8090/actuator/health` → `{"status":"UP"}`
- Mini App локально (без auth): `http://localhost:8090/app/?design` (дизайн-каталог), `?onboarding`, `?reading`, `?diary`
- Лендинг: `http://localhost:8081`
- Postgres: `localhost:5433` (luna/luna/luna)
- Бот в Telegram: [@luna_taro_card_bot](https://t.me/luna_taro_card_bot) — реально отвечает

---

## Запуск Mini App в реальном Telegram

Telegram WebApp требует **публичный HTTPS-URL**. Самый быстрый способ — Cloudflare quick tunnel (5 секунд, без аккаунта).

**1. Поднять туннель** (в отдельном терминале):

```bash
./scripts/tunnel.sh
```

Скрипт проверит cloudflared, при необходимости поставит через brew, и выведет публичный URL вида `https://abc-def-ghi.trycloudflare.com`.

**2. Прописать URL в `.env`:**

```env
TG_MINI_APP_URL=https://abc-def-ghi.trycloudflare.com/app/
```

И перезапустить backend:

```bash
docker compose --env-file .env up -d --build backend
```

**3. Зарегистрировать Mini App в [@BotFather](https://t.me/BotFather):**

- `/mybots` → выбрать `luna_taro_card_bot`
- `Bot Settings` → `Menu Button` → `Configure menu button`
- Вставить тот же URL
- Подтвердить → у бота снизу появится постоянная кнопка `Открыть`

**4. Открыть бота в Telegram → нажать `Открыть` → Mini App запустится с полным auth flow.**

---

## Команды разработки

```bash
# Backend
cd backend
./gradlew build                # checks + tests
./gradlew test --tests "*"     # отдельный тест

# Frontend
cd frontend
npm run dev                    # vite dev server :5173 + proxy /api → :8090
npm run build:to-backend       # билд + копия в backend/.../static/app/
npm run typecheck

# Compose
docker compose --env-file .env up -d --build      # пересобрать и поднять
docker compose logs -f backend                    # стрим логов
docker compose down                               # остановить
```

---

## Конфигурация

`.env` (примеры — см. `.env.example`):

| Переменная | Что |
|---|---|
| `TG_BOT_TOKEN` | от @BotFather |
| `TG_BOT_USERNAME` | без `@` |
| `TG_MINI_APP_URL` | публичный HTTPS-URL для Mini App. Если пусто — бот в fallback-режиме (расклады прямо в чате). |
| `LLM_PROVIDER` | `claude` или `stub` |
| `ANTHROPIC_API_KEY` | для `provider=claude` |
| `LLM_MODEL` | по умолчанию `claude-haiku-4-5-20251001` |
| `DAILY_CARD_ENABLED` | `true`/`false` — утренний push |
| `DAILY_CARD_CRON` | по умолчанию `0 0 5 * * *` (08:00 МСК) |
| `BACKEND_PORT` / `POSTGRES_PORT` / `LANDING_PORT` | если стандартные 8080/5432/8081 заняты |

---

## Что сделано ✅

| Блок | Что |
|---|---|
| **Foundation** | Spring Boot 3.5 + Gradle, Docker compose, статанализ (Checkstyle/PMD/SpotBugs/JaCoCo 60/50/65), `.claude/rules`, CI workflow |
| **Backend домен** | Flyway V1–V12: users, 78-карточная колода (22 старших + 56 младших) с upright/reversed, readings + reading_cards, daily_limits, reading outcome (V11), daily_horoscopes (V12) |
| **Telegram бот** | long-polling, онбординг (имя+пол+ДР), главное меню. С `TG_MINI_APP_URL` бот = «приглашатель» с одной кнопкой; без него — расклады прямо в чате |
| **REST API** | Telegram initData auth, /api/me, /api/reading + /api/reading/card-of-day, /api/history, /api/reading/{id}/outcome, /api/spreads, /api/horoscope/today, /api/compatibility |
| **LLM** | `TarotInterpreter` / `HoroscopeGenerator` / `CompatibilityGenerator` — каждый с двумя реализациями (Stub / Claude). Параметризованный промпт под произвольный layout спреда. Согласование родов |
| **DailyCardScheduler** | cron 08:00 МСК — карта дня в личку, opt-in переключатель `DAILY_CARD_ENABLED` |
| **4 расклада** | `Spread` каталог (Path-Love-CelticCross-YearWheel), параметризованные позиции + промпты + finalLayout (row/pentagram/celticCross/wheel) |
| **Гороскоп** | `HoroscopeService` idempotent на (user, дата). Текст по знаку + лунной фазе + числу судьбы |
| **Совместимость** | `CompatibilityService` — расчёт знака партнёра по ДР, AI-текст по сочетанию стихий |
| **Дневник** | таймлайн раскладов + механика «как сбылось» (✨ / 🌗 / 🌑 + заметка, индекс на pending) |
| **Mini App** | Vite + React + TS. Splash→hub seamless через единую DayCard (position:fixed). 4 ритуала, профиль с эзо-данными и редактированием, дневник с outcome, страница совместимости с орбитальной анимацией. Cinematic splash + sparkles + лунный glow |

## Что out of scope текущего MVP

- 🚀 **Production deploy** (отложено — пока live на cloudflared quick tunnel)
- 💳 Платежи (Telegram Stars / ЮKassa)
- 🎵 Ambient sound (тихий ветер / огонь)
- 🗣️ Голос Луны через TTS (ElevenLabs / Yandex SpeechKit)
- 🌐 i18n / английская локаль
- 📱 Адаптация лендинга под мобилку
- 📊 Аналитика (Posthog/Mixpanel)
- 🪐 Альтернативные платформы (Max, VK Mini Apps, PWA)

---

## Лицензия

Внутренний MVP. Для коммерческого использования — связаться с автором.
