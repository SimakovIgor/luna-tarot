# Рабочий процесс: параллельная разработка через worktrees

## Когда использовать worktree

Worktree создавать для **любой задачи**, которая:
- Занимает больше одной сессии, или
- Может идти параллельно с другой задачей, или
- Требует изоляции (эксперименты, рефакторинг, hotfix).

Это позволяет вести несколько фич одновременно без переключения веток в основной директории.

## Как создать worktree

```bash
# Создать новую ветку и worktree в одной команде
git worktree add ../luna-tarot-<feature-name> -b feat/<feature-name>

# Или через Claude Code (предпочтительно — автоматически управляет жизненным циклом)
/worktree feat/<feature-name>
```

Worktree создаётся рядом с основным репозиторием: `../luna-tarot-<feature-name>/`.

## Правила параллельной работы

- Каждая активная задача — в своём worktree на отдельной ветке.
- В основной директории (`main`) только стабильный код — не вести там активную разработку.
- Перед созданием worktree убедиться, что `main` актуален (`git pull`).
- После merge → удалить worktree: `git worktree remove ../luna-tarot-<feature-name>`.

## Тесты в worktree — изоляция между worktrees

`./gradlew test` **можно запускать параллельно из разных worktrees** — каждый worktree
получает свою БД внутри одного контейнера. **Параллельный запуск из одной директории
в двух shell-сессиях недопустим** — обе сессии разделят одну БД и упрутся в deadlock-и
в `cleanUpDatabase`.

**Как это работает:**

- `withReuse(true)` + `testcontainers.reuse.enable=true` → один Docker-контейнер PostgreSQL на всю машину.
- Имя базы данных = хэш `user.dir`:
  - `luna-tarot/` → `test_a3f1c2`
  - `luna-tarot-feat-x/` → `test_7b09e1`
- Повторный прогон из того же worktree → та же БД → Flyway не проигрывается заново,
  старт мгновенный.
- Параллельный `./gradlew bootRun` использует **другую БД** (`localhost:5432/luna`
  из `application.yml`), не пересекается с тестами.

## Включить Testcontainers reuse (один раз на машину)

```bash
echo 'testcontainers.reuse.enable=true' >> ~/.testcontainers.properties
```
