# Правила написания кода

## Функциональный стиль

- Предпочитать потоки (`stream()`, `map()`, `filter()`, `collect()`) императивным циклам.
- Цепочки стримов форматировать в несколько строк — каждый оператор на новой строке с `.` на начале строки (Checkstyle `SeparatorWrap DOT = nl`).
- Лямбды длиннее одной строки выносить в именованный метод или локальную переменную с понятным именем.
- **Method reference вместо лямбды**, если она просто вызывает один метод. PMD-правило `LambdaCanBeMethodReference` блокирует билд при нарушении.

```java
// Плохо
.map(c -> c.getName())
.forEach(u -> System.out.println(u))

// Хорошо
.map(TarotCard::getName)
.forEach(System.out::println)

// Плохо — императивный цикл
List<String> result = new ArrayList<>();
for (TarotCard c : cards) {
    if (c.isMajor()) result.add(c.getName());
}

// Хорошо
List<String> result = cards.stream()
    .filter(TarotCard::isMajor)
    .map(TarotCard::getName)
    .toList();
```

## Импорты и FQN

- Если класс импортирован — использовать его **без** package-префикса. PMD-правило `UnnecessaryFullyQualifiedName` блокирует билд при нарушении.
- Не смешивать в одном файле импорт и FQN того же класса — выбрать одно.

```java
// Плохо — Instant уже импортирован
import java.time.Instant;
...
java.time.Instant.now();

// Хорошо
import java.time.Instant;
...
Instant.now();
```

## Числовые литералы

- Числа >= 10 000 разделять нижними подчёркиваниями по разрядам: `86_400`, `1_000_000`, `0xFF_FF_FF`.
- PMD-правило `UseUnderscoresInNumericLiterals` блокирует билд при нарушении.

## Optional вместо null

- **Запрещено** возвращать `null` как сигнал «не найдено» — использовать `Optional<T>`.
- **Запрещено** `repo.findById(x).orElse(null)` + последующий null-check.
- Разрешённые терминаторы: `.orElseThrow()`, `.map()`, `.ifPresent()`, `.ifPresentOrElse()`, `.orElseGet()`.
- `return null` допустим только в `@Nullable` JSON-полях сущностей или при реализации библиотечных интерфейсов.

```java
// Запрещено
TarotCard card = cardRepo.findById(id).orElse(null);
if (card == null) throw new CardNotFoundException(id);

// Обязательно
TarotCard card = cardRepo.findById(id)
    .orElseThrow(() -> new CardNotFoundException(id));
```

## Структуры данных — только именованные типы

- **Запрещено** использовать `Object[]`, `String[]`, `int[]` для передачи разнородных данных по числовым индексам.
- **Обязательно** `record`-DTO или именованный класс.

```java
// Запрещено
Object[] reading = readingService.draw(userId, question);

// Обязательно
record ThreeCardReading(TarotCard past, TarotCard present, TarotCard future, String interpretation) {}
ThreeCardReading reading = readingService.draw(userId, question);
```

## Checkstyle — ключевые правила

- `LineLength max=199` (импорты и URL исключены).
- `NeedBraces` — фигурные скобки **обязательны** для `if`, `for`, `while`, `else` — всегда.
- `OperatorWrap option=NL` — бинарный оператор переносится на **следующую** строку.
- `SeparatorWrap DOT option=nl` — `.` в цепочках переносится на **следующую** строку.
- `AvoidStarImport` — только явные импорты.
- Порядок импортов: `THIRD_PARTY_PACKAGE` → `STANDARD_JAVA_PACKAGE` → `STATIC`, алфавитно внутри групп, пустая строка между группами.
- Разрешённые аббревиатуры: `ID, DTO, API, MR, IT, DB, URL, UTC, TG, LLM, AI, UI`.

## PMD и SpotBugs — политика подавления

- **@SuppressWarnings — последнее средство**, не первый инструмент.
- Если PMD сигнализирует `MethodLength`, `CyclomaticComplexity`, `NPathComplexity` или `GodClass` — **рефакторить**: разбить метод, выделить вспомогательный класс/сервис.
- Если Checkstyle требует `ParameterNumber` — скорее всего нужен DTO-параметр или builder.
- `@SuppressWarnings` оправдан только когда инструмент ошибается технически (ложно-позитивный результат), и только с комментарием-обоснованием рядом.
- Накопление suppressions на классе/методе — сигнал для рефакторинга, не для добавления ещё одного suppress.

## Категории и статусы — через enum

- **Запрещено** хардкодить категории/типы как строковые литералы в бизнес-логике
  (тип расклада, фаза луны, аркан, состояние сессии бота и т.п.).
- Использовать enum в `domain/model/enums/` (`ReadingType`, `Arcana`, `BotConversationState`, `LunarPhase`, и т.д.).
- Default-значения брать **из enum**, не из магических строковых констант.

## Default-значения JPA-полей

- **Примитивы (`int`/`long`/`boolean`):** не нужны `@Builder.Default` и Java initializer —
  у примитивов всегда есть Java default (0 / false), и он не нарушит NOT NULL constraint.
  Бизнес-default ставится явно в местах создания через `.someField(DEFAULT_X)`.
- **String с NOT NULL:** `@Builder.Default` + Java initializer **обязательны** — без них
  Lombok-builder поставит `null` и Hibernate упадёт на NOT NULL.
- Магические числа/строки-дефолты выносить как `public static final` константы в entity
  с комментарием, что они должны совпадать с миграцией.

## jsonb-колонки

- `@JdbcTypeCode(SqlTypes.JSON)` на `String`-полях, маппящихся в `jsonb` PostgreSQL — без этого Hibernate 6 бросает ошибку типов.
