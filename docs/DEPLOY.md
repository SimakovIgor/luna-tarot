# Деплой и эксплуатация Luna Tarot

Все явки в одном месте: где живет прод, как туда попасть, как выкатить новую версию.

Секретов тут нет, репозиторий публичный. Где лежит каждый секрет, написано ниже. Сами значения в `docs/ACCESS.local.md`, он в `.gitignore` и в гит не уходит.

---

## Ссылки

| Что | Куда |
|---|---|
| Mini App | https://lunatarot.duckdns.org/app/ |
| Health | https://lunatarot.duckdns.org/actuator/health |
| Админка | https://lunatarot.duckdns.org/admin/ (HTTP Basic) |
| Бот | https://t.me/luna_taro_card_bot |
| Репозиторий | https://github.com/SimakovIgor/luna-tarot |
| Хостинг | https://ishosting.com, тариф Lite - Linux SSD |
| DNS | https://www.duckdns.org/domains |
| Настройки бота | https://t.me/BotFather |
| Ключ LLM | https://console.anthropic.com |

## Аккаунты

| Сервис | Под кем |
|---|---|
| is\*hosting | Миша (Mike Olee), счет и продление у него |
| DuckDNS | `simakoff30@gmail.com`, вход через Google |
| BotFather | телеграм Игоря (`@Igoresha_simakov`) |
| GitHub | `SimakovIgor` |

## Сервер

| | |
|---|---|
| Провайдер | is\*hosting, Lite - Linux SSD |
| IP | `38.180.146.247` |
| Локация | Даллас, Техас, США (AS58061 Scalaxy B.V.) |
| ОС | Ubuntu 22.04 LTS |
| Ресурсы | 1 vCPU, 1 ГБ RAM, 20 ГБ SSD, swap 4 ГБ |
| Каталог | `/opt/luna-tarot` |
| Firewall | ufw, открыты 22, 80, 443 |

Вход по ключу, алиас уже прописан в `~/.ssh/config`:

```bash
ssh luna-is
```

Если ключа нет на новой машине:

```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub root@38.180.146.247
```

Пароль root приходил письмом от is\*hosting и лежит в `docs/ACCESS.local.md`.

---

## Стек на проде

Три контейнера, `docker-compose.slim.yml`:

| Контейнер | Что делает | Лимит RAM |
|---|---|---|
| `luna-caddy` | HTTPS, реверс-прокси, редирект `/` на `/app/` | 96 МБ |
| `luna-postgres` | Postgres 16, тюнинг под 1 ГБ | 224 МБ |
| `luna-backend` | Spring Boot: REST, Mini App, бот на long polling | 512 МБ |

Лендинг и Uptime Kuma выпилены: на 1 ГБ им места нет. Файл `docker-compose.prod.yml` остался для истории, на этом сервере он не поднимется.

TLS через Let's Encrypt, DNS-01 challenge с токеном DuckDNS. Поэтому в `caddy/Dockerfile` собирается свой Caddy с плагином `caddy-dns/duckdns`.

---

## Выкатка новой версии

**Главное правило: Gradle на сервере не запускаем.** На 1 vCPU и 1 ГБ сборка падает по OOM. JAR и образы собираются на маке под `linux/amd64` и уезжают готовыми.

```bash
cd ~/IdeaProjects/luna-tarot
./scripts/deploy-slim.sh
```

Шесть шагов: `bootJar`, образ backend, образ caddy, `docker save | ssh docker load`, заливка конфигов, `up -d`. Примерно две минуты, из них заливка образов около сорока секунд.

Если менял только Java или фронт, быстрее так:

```bash
./scripts/quick-deploy.sh
```

Везет на сервер один JAR (114 МБ), тонкий образ поверх готовой JRE собирается там же. Caddy и postgres не трогаются (`--no-deps`), конфиги не заливаются. В конце сам дожидается `health: UP` и печатает имя выехавшего бандла. Около двух минут против четырех у полной выкатки, почти все время это заливка JAR.

### Все скрипты

| Скрипт | Когда |
|---|---|
| `scripts/deploy.sh` | новый сервер с нуля: проверяет ssh, гоняет провижен, требует `.env`, зовет полную выкатку |
| `scripts/provision-ishosting.sh` | только подготовка сервера: swap, Docker, ufw |
| `scripts/deploy-slim.sh` | полная выкатка: оба образа плюс конфиги |
| `scripts/quick-deploy.sh` | быстрый редеплой одного backend |

Во всех скриптах хост берется из `SSH_HOST`, по умолчанию `luna-is`. Домен для health-проверки из `LUNA_DOMAIN`.

Если правил только `Caddyfile.slim`:

```bash
scp Caddyfile.slim luna-is:/opt/luna-tarot/
ssh luna-is 'cd /opt/luna-tarot && docker compose -f docker-compose.slim.yml --env-file .env restart caddy'
```

### Проверка после выкатки

```bash
curl -s https://lunatarot.duckdns.org/actuator/health
curl -sI https://lunatarot.duckdns.org/app/ | head -1
ssh luna-is 'docker stats --no-stream --format "{{.Name}} {{.MemUsage}}"'
```

---

## Первый запуск на чистом сервере

```bash
./scripts/deploy.sh
```

Проверит вход по ключу, поставит swap 4 ГБ, Docker и ufw, потом сам позовет полную выкатку. Если на сервере еще нет `.env`, остановится и скажет, что заполнить (состав ниже). Заполняешь и запускаешь повторно.

### Состав `.env` на сервере

Файл лежит в `/opt/luna-tarot/.env` с правами `600`. В гит не попадает.

| Переменная | Откуда брать |
|---|---|
| `POSTGRES_DB`, `POSTGRES_USER` | `luna` / `luna` |
| `POSTGRES_PASSWORD` | сгенерирован при развертывании, менять только вместе с волюмом |
| `TG_BOT_ENABLED` | `true` |
| `TG_BOT_TOKEN` | BotFather, `/mybots` → бот → API Token |
| `TG_BOT_USERNAME` | `luna_taro_card_bot` |
| `TG_MINI_APP_URL` | `https://lunatarot.duckdns.org/app/` |
| `LLM_PROVIDER` | `claude` |
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `LLM_MODEL` | `claude-haiku-4-5-20251001` |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | свои, закрывают `/admin/**` |
| `LUNA_DOMAIN` | `lunatarot.duckdns.org` |
| `DUCKDNS_TOKEN` | duckdns.org, сверху страницы |

---

## DNS

Поддомен `lunatarot.duckdns.org` на аккаунте `simakoff30@gmail.com`. IP статический, автообновлялку ставить не нужно.

Если меняется сервер: duckdns.org → строка `lunatarot` → поле current ip → `update ip`. Токен со страницы обязательно прописать в `DUCKDNS_TOKEN`, иначе Caddy не выпустит сертификат.

Проверка:

```bash
dig +short lunatarot.duckdns.org @1.1.1.1
```

---

## Настройки бота

Бот на long polling, вебхук не используется. Кнопку меню приложение синхронизирует само при старте (`MenuButtonSync`).

Что настроено руками через Bot API и BotFather:

| Что | Значение |
|---|---|
| Имя | Luna · Таро |
| Команды | `/start` Открыть Луну, `/help` Справка |
| Кнопка меню | web_app на `https://lunatarot.duckdns.org/app/` |
| Mini App | включен, тот же URL |
| Аватарка | `frontend/public/luna-logo.png` |

Поменять описание без BotFather:

```bash
curl -X POST "https://api.telegram.org/bot$TOKEN/setMyDescription" \
  -H 'Content-Type: application/json' \
  --data-binary @description.json
```

---

## Если что-то сломалось

```bash
ssh luna-is 'cd /opt/luna-tarot && docker compose -f docker-compose.slim.yml ps'
ssh luna-is 'docker logs --tail=200 luna-backend'
ssh luna-is 'docker logs --tail=100 luna-caddy'
ssh luna-is 'free -m; docker stats --no-stream'
```

Перезапуск одного сервиса:

```bash
ssh luna-is 'cd /opt/luna-tarot && docker compose -f docker-compose.slim.yml --env-file .env restart backend'
```

Полный перезапуск без потери данных:

```bash
ssh luna-is 'cd /opt/luna-tarot && docker compose -f docker-compose.slim.yml down && docker compose -f docker-compose.slim.yml --env-file .env up -d'
```

`down -v` не запускать: снесет базу и сертификаты.

---

## Бэкап базы

Бэкапов сейчас нет. При переезде с Hetzner база потерялась целиком, потому что дампа не было. Минимальный вариант, крон на сервере:

```bash
mkdir -p /opt/luna-tarot/backups
crontab -e
0 4 * * * docker exec luna-postgres pg_dump -U luna luna | gzip > /opt/luna-tarot/backups/luna-$(date +\%Y\%m\%d).sql.gz
```

Диска 20 ГБ, старые дампы чистить.

---

## Устаревшее, не запускать

| Файл | Почему |
|---|---|
| `docker-compose.prod.yml` | пятиконтейнерный стек с лендингом и Kuma, в 1 ГБ не влезает |
| `Caddyfile` | конфиг под тот же пятиконтейнерный стек |
| `backend/Dockerfile` | собирает Gradle внутри образа, на сервере падает по OOM. Используется только для локальной сборки |

Хост `luna` в `~/.ssh/config` закомментирован: IP `178.105.198.205` отдан другому клиенту.

---

## Стоимость

| Статья | Сколько |
|---|---|
| is\*hosting Lite | у Миши, см. счет |
| DuckDNS | 0 |
| Let's Encrypt | 0 |
| Anthropic Claude Haiku | по расходу, порядка нескольких долларов в месяц на сотню активных |
