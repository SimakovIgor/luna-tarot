# Правила архитектуры

## Слоистость

```
Telegram Bot adapter ─┐
                      ├─→ Service layer ─→ Repository ─→ Postgres
REST Controller ──────┘                ↘ LLM client ─→ Anthropic (через интерфейс)
```

- **Контроллер / Bot handler** — только: принять входной запрос (HTTP или Telegram update), вызвать сервис(ы), вернуть ответ.
- **Запрещено** инжектировать `*Repository` напрямую в контроллер или bot handler — только сервисы.
- **Запрещено** инжектировать `*Repository` из разных слоёв / фич-пакетов напрямую — ходить через сервис владельца.

```java
// Запрещено — репозиторий в контроллере
@RestController
class ReadingController {
    private final TarotCardRepository cardRepository; // ← нарушение
}

// Обязательно — через сервис
@RestController
class ReadingController {
    private final ReadingService readingService;
}
```

## Развязка Telegram-слоя и REST-слоя

- Bot-адаптер (`bot/`) и REST API (`api/`) **не зависят друг от друга**.
- Оба ходят в **один и тот же** доменный сервис (`service/ReadingService` и т.д.).
- Если хочется фичу «из бота» — добавлять её в сервис, а bot-адаптер просто вызывает.
- Это даёт два бонуса: можно отключить бот и оставить только REST, и наоборот.

## LLM-интеграция через интерфейс

- Сервис, который генерит интерпретацию, зависит от `TarotInterpreter` интерфейса, а не от конкретной реализации.
- Минимум две реализации: `StubInterpreter` (для dev/тестов) и `ClaudeInterpreter` (для prod).
- Переключение — через `LLM_PROVIDER=stub|claude` env переменную + `@ConditionalOnProperty`.
- Никаких прямых вызовов Anthropic API из доменного слоя.

## Размер и сложность классов

- Класс/сервис с `@SuppressWarnings("PMD.GodClass")` или `CyclomaticComplexity` — **требует рефакторинга**.
- Сигналы для выделения отдельного класса:
  - Метод > 100 строк (`MethodLength`);
  - Метод > 15 цикломатическая сложность;
  - Класс > 400–500 строк с разнородными обязанностями.
- Паттерн для рефакторинга: выделить `*Helper`, `*Builder`, отдельный `*Service`.

## Вертикальные слайсы (feature packages)

```
com.lunatarot.backend/
├── LunaTarotApplication.java
├── bot/                   ← Telegram adapter (long-polling)
│   ├── handler/
│   ├── state/             ← conversation state machine
│   └── menu/              ← inline keyboards
├── api/                   ← REST controllers
│   ├── controller/
│   ├── dto/
│   ├── mapper/
│   └── exception/
├── service/               ← бизнес-логика
│   ├── ReadingService
│   ├── CardOfDayService
│   ├── EsotericProfileService
│   ├── DailyLimitGuard
│   └── auth/
├── domain/                ← entities, enums, repositories
│   ├── model/
│   │   ├── enums/
│   │   └── *Entity
│   └── repository/
├── llm/                   ← TarotInterpreter + реализации
│   ├── TarotInterpreter
│   ├── StubInterpreter
│   └── ClaudeInterpreter
└── config/                ← Spring config, properties
```

- Кросс-фичевые зависимости только через сервисы, не через репозитории напрямую.
- Общий слой (`domain/`, `config/`) — не содержит фиче-специфичной логики.

## Транзакции

- Не ставить `@Transactional` на `private`-методах — Spring AOP не может проксировать self-invocations.
- Асинхронные методы (`@Async`, `CompletableFuture`) — транзакцию открывать внутри самого метода, не снаружи.

## Минимизация @SuppressWarnings

- Если статический анализатор жалуется — сначала рефакторить, потом думать про suppress.
- Если suppress неизбежен (технический false-positive) — добавить однострочный комментарий с объяснением.
- Накопление suppressions на одном классе — явный признак, что класс нужно разбить.
