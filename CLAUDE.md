# CLAUDE.md

Этот файл содержит инструкции для Claude Code (claude.ai/code) при работе с данным репозиторием.

## Текущий продуктовый фокус

**Май 2026: MVP-продукт «Luna · Зеркало Таро» в Telegram.** Полная карта фич — в [`README.md`](./README.md).

**Что есть сейчас:**
- 5 раскладов Таро (Да/Нет, Три карты, Любовь, Кельтский крест, Колесо года) — параметризованы через `SpreadCatalog`.
- Карта дня (детерминированная) + ежедневный AI-гороскоп.
- Совместимость с другим человеком (синаструнный AI-разбор).
- Дневник с механикой «как сбылось».
- Профиль с эзо-данными и редактированием.
- Mini App: cinematic splash → hub без перемонтажа карты, 4 layout финального экрана (row/pentagram/celticCross/wheel).
- Telegram-бот: long-polling, утренний push карты дня (10 шаблонов, детерминированная ротация по `tgUserId+dayOfYear`).
- **Production deployed** на is\*hosting Lite + DuckDNS-поддомен + Caddy auto-HTTPS. URL: `https://lunatarot.duckdns.org/app/`.
- **Observability**: Sentry Cloud (JS-ошибки) + PostHog Cloud (funnel/retention/session replay) + Uptime Kuma (self-host).
- **Admin dashboard** `/admin/`: totals, daily breakdown, типы раскладов. HTTP Basic auth.
- **MenuButtonSync**: при старте backend синхронизирует Chat Menu Button бота с `TG_MINI_APP_URL` через `setChatMenuButton` API.

**Чего нет:**
- Платежей (Telegram Stars).
- Голоса Луны (TTS).
- Альтернативных платформ.
- Nightly reflection / вечерний push.
- Trends в профиле (выпадавшие за месяц карты, и т.п.).

**Когда меняешь продукт** — обновляй `README.md` секцию «Что сделано», иначе она быстро устаревает.

Дизайн-прототип лежит в `docs/design/` (HTML + JSX). Сейчас уже сильно разошёлся с финальным UI — смотреть как исторический референс, не источник правды.

## Правила (обязательны к соблюдению)

@.claude/rules/definition-of-done.md
@.claude/rules/code-style.md
@.claude/rules/testing.md
@.claude/rules/architecture.md
@.claude/rules/workflow.md

## Структура репозитория

```
luna-tarot/
├── backend/                  # Spring Boot 3.5 — bot + REST API + домен
│   └── src/main/java/.../
│       ├── bot/              # Telegram long-polling adapter
│       ├── api/              # REST controllers + DTO + auth filter
│       ├── service/
│       │   ├── reading/      # ReadingService, OutcomeService, CardOfDayService
│       │   ├── horoscope/    # HoroscopeService + Stub/Claude generators
│       │   ├── compatibility/# CompatibilityService + Stub/Claude generators
│       │   └── onboarding/   # OnboardingService + BotScript
│       ├── domain/
│       │   ├── model/        # JPA entities + enums
│       │   └── spread/       # SpreadCatalog (Path/Love/CelticCross/YearWheel)
│       ├── llm/              # TarotInterpreter (Stub / Claude)
│       └── scheduler/        # DailyCardScheduler
├── frontend/                 # Vite + React + TS Mini App
│   └── src/observability.ts  # Sentry + PostHog init, identify, track, reportError
│   └── src/
│       ├── components/
│       │   ├── DayCard/      # ⭐ единая карта поверх splash и hub (position:fixed)
│       │   ├── IntroSplash/  # cinematic splash без карты — она глобально в App
│       │   ├── SparkleField/ # canvas частицы
│       │   └── ...
│       ├── pages/            # HubPage / ReadingFlowPage / CardOfDayPage / CompatibilityPage / DiaryPage / ProfilePage / OnboardingPage
│       ├── spreads/          # SpreadCatalog + FinalLayout (4 геометрии) + SpreadIcon
│       ├── api/              # auth, me, reading, horoscope, compatibility
│       └── hooks/            # useCardOfDay
├── landing/                  # Статический лендинг + nginx Dockerfile
├── docs/design/              # Дизайн-бандл (HTML/JSX) — исторический
├── scripts/tunnel.sh         # Cloudflare quick tunnel
├── .claude/                  # rules, hooks, settings, local permissions
├── docker-compose.yml
└── .env.example
```

## Команды сборки

```bash
cd backend

# Полная сборка со всеми проверками и тестами
./gradlew clean build

# Сборка без тестов
./gradlew build -x test

# Запустить все тесты
./gradlew test

# Только статический анализ (Checkstyle + PMD + SpotBugs)
./gradlew check -x test

# Запустить один тестовый класс
./gradlew test --tests "com.lunatarot.backend.LunaTarotBackendApplicationTests"
```

Локальный запуск всего стека:

```bash
cp .env.example .env       # один раз, потом отредактировать секреты
docker compose up --build
```

После старта:
- Backend: `http://localhost:8080` (health: `/actuator/health`)
- Landing: `http://localhost:8081`
- Postgres: `localhost:5432` (luna/luna/luna)

## Статический анализ

Запускается автоматически при `./gradlew build`:

- **Checkstyle 10.17.0**: `backend/config/checkstyle/checkstyle.xml`
- **PMD 7.4.0**: `backend/config/pmd/pmd-rules.xml`
- **SpotBugs 4.8.6**: `backend/config/spotbugs/spotbugs-exclude.xml`

Пороги Checkstyle: `MethodLength max=100`, `JavaNCSS methodMaximum=60`, `CyclomaticComplexity max=15`, `LineLength max=199`.
Подавление: `@SuppressWarnings("checkstyle:RuleName")` — через `SuppressWarningsFilter`.
Запрещённые импорты: `javax.transaction.Transactional`, JUnit 4, Hamcrest, `org.junit.jupiter.api.Assertions.*`.

Coverage (JaCoCo) — стартовые пороги (повышаем по мере роста):
- LINE ≥ 60%, BRANCH ≥ 50%, METHOD ≥ 65%.

## Архитектура

**Гибридная структура**: общий слой (`domain`, `config`) + **vertical slices** по фичам.

```
Telegram Bot adapter ─┐
                      ├─→ Service layer ─→ Repository ─→ Postgres
REST Controller ──────┘                ↘ LLM client ─→ Anthropic (через интерфейс)
```

### Целевая структура пакетов (заполняется по мере фаз)

```
com.lunatarot.backend/
├── LunaTarotBackendApplication.java
├── bot/                   ← Telegram adapter (Phase 2)
│   ├── handler/
│   ├── state/             ← conversation state machine
│   └── menu/              ← inline keyboards
├── api/                   ← REST (Phase 3)
│   ├── controller/
│   ├── dto/
│   ├── mapper/
│   └── exception/
├── service/               ← бизнес-логика
│   ├── ReadingService
│   ├── CardOfDayService
│   ├── EsotericProfileService
│   ├── DailyLimitGuard
│   └── auth/              ← TgInitDataValidator
├── domain/                ← entities, enums, repositories
│   ├── model/
│   │   ├── enums/         ← ReadingType, Arcana, BotConversationState, ...
│   │   └── *Entity
│   └── repository/
├── llm/                   ← Phase 4
│   ├── TarotInterpreter
│   ├── StubInterpreter
│   └── ClaudeInterpreter
└── config/                ← Spring config, @ConfigurationProperties
```

## Ключевые принципы

**Развязка bot ↔ REST**: оба слоя ходят в один и тот же доменный сервис. Можно отключить либо бот, либо REST — другой продолжит работать.

**LLM через интерфейс**: `TarotInterpreter` имеет минимум две реализации — `StubInterpreter` (без HTTP-вызовов, для dev/тестов) и `ClaudeInterpreter` (Anthropic). Переключение через `LLM_PROVIDER=stub|claude` + `@ConditionalOnProperty`.

**Freemium с первого дня**: `DailyLimitGuard` — общая точка для лимитов. На MVP — 1 расклад/день. Подписки и платежи появятся после MVP, но точка контроля уже есть.

**Карта дня — детерминированная**: для одного пользователя и одной даты — всегда одна карта (seed = `tg_user_id + date`). Не вызывает LLM при каждом запросе.

**Эзотерический профиль — чистая функция от ДР**: `EsotericProfileService.calc(birthDate)` → `{zodiac, lifePathNumber, lunarPhase}`. Никаких внешних вызовов.

## База данных

PostgreSQL 16 + Flyway. Миграции в `backend/src/main/resources/db/migration/`.

Hibernate DDL установлен в `validate` — все изменения схемы только через Flyway-миграции.

**Конфликт Flyway**: если тесты падают с «Found more than one migration with version N», запустить `./gradlew clean` для очистки артефактов сборки, затем пересобрать.

### Соглашения по именованию индексов

| Тип              | Паттерн                    |
|------------------|----------------------------|
| Индекс           | `idx_<table>_<column>`     |
| Уникальное огр-е | `uq_<table>_<col1>_<col2>` |
| Внешний ключ     | `fk_<table>_<column>`      |

Частичные индексы (`WHERE col IS NOT NULL`) обязательны для nullable-колонок во избежание срабатывания pg-index-health (добавим, когда переключимся на BaseIT с Testcontainers).

## Конфигурация

`backend/src/main/resources/application.yml` — центральная конфигурация.
`backend/src/test/resources/application-test.yml` — переопределения для тестов (H2 + Flyway off).

Переменные окружения (см. `.env.example`):

- `DB_URL`, `DB_USER`, `DB_PASSWORD` — подключение к Postgres
- `TG_BOT_TOKEN`, `TG_BOT_USERNAME`, `TG_MINI_APP_URL` — Telegram-бот
- `LLM_PROVIDER` (`stub`/`claude`), `ANTHROPIC_API_KEY`, `LLM_MODEL` — интерпретатор
- `SERVER_PORT`, `BACKEND_PORT`, `LANDING_PORT`, `POSTGRES_PORT` — порты

`.env` **никогда** не коммитится (в `.gitignore`). `.env.example` — шаблон без секретов.

## Observability

**Production stack:**
- **Sentry Cloud** (region: EU) — JS-ошибки фронта. Init в `frontend/src/observability.ts`, активен только когда `window.location.hostname.endsWith('lunatarot.duckdns.org')`. Dev/localhost не засоряет дашборд.
- **PostHog Cloud** (host: us.i.posthog.com — проект на US-инстансе) — продуктовая аналитика. Track-points в `observability.ts`: `app_opened`, `onboarding_completed`, `spread_started`, `spread_completed`, `share_clicked`, `share_completed`, `donate_initiated/completed/cancelled/failed`. Plus autocapture (клики, pageviews).
- **Uptime Kuma** — self-host контейнер на VPS (отдельный поддомен), мониторит health-эндпоинты, Telegram-алерты.
- **Admin dashboard** `/admin/` — HTML + JSON, HTTP Basic auth (creds в `.env`).
- Actuator: `/actuator/health` (доступен публично).

**`identify`** биндит Telegram `tgUserId` к Sentry user + PostHog distinct ID после успешного auth (`bootstrap().then` в `App.tsx`).

**Когда добавляешь новую фичу с метриками** — track-point в `observability.ts`-стиле через `track('event_name', {...props})`. Не плодить — funnel-точки лучше чем «всё подряд».

## Production deploy

Документация: [`docs/DEPLOY.md`](./docs/DEPLOY.md).

Стек: is\*hosting Lite (Даллас, 1 vCPU / 1 ГБ) + Ubuntu 22.04 + Docker Compose (`docker-compose.slim.yml`: caddy, postgres, backend) + Caddy auto-HTTPS + DuckDNS поддомен.

Обновление кода: `./scripts/deploy-slim.sh`. Gradle на сервере не запускаем, на 1 ГБ сборка падает по OOM: JAR и образы собираются на маке под `linux/amd64` и уезжают через `docker save | ssh docker load`. Только backend быстрее выкатить через `./scripts/quick-deploy.sh`, чистый сервер поднимается одним `./scripts/deploy.sh`. SSH: `ssh luna-is` (config в `~/.ssh/config`).

## Дизайн-артефакты

В `docs/design/` лежит handoff-бандл от Claude Design:
- `project/Luna Tarot.html` — главный дизайн-канвас (React/Babel прототип с 3 экранами бота и 2 лендингами)
- `project/Landing.html` — самостоятельный лендинг, готов к деплою (копия лежит в `landing/index.html`)
- `project/bot-flow.jsx`, `landing.jsx`, `design-canvas.jsx`, `tweaks-panel.jsx` — компоненты прототипа
- `chats/chat1.md` — переписка с дизайн-агентом, где зафиксированы все решения (цвета, стиль карт, шрифты, копирайтинг)

При UI-задаче (особенно в Phase 5) — сначала открыть прототип, потом писать код.
