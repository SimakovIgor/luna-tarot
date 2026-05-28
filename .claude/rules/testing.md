# Правила написания тестов

## Базовые принципы

- Все интеграционные тесты наследуют `BaseIT` — один Spring-контекст на весь прогон.
- **Никогда не добавлять `@MockBean` в подклассах `BaseIT`** — это создаёт второй контекст, замедляет прогон и ломает Testcontainers. Все `@MockBean` объявлены только в самом `BaseIT`.
- Именование: `*Test` (не `*IT`), даже для интеграционных тестов.

## Testcontainers — один контейнер на весь прогон

- PostgreSQLContainer объявлен как `static` в `TestConfig` — один экземпляр на JVM независимо от количества Spring-контекстов.
- `withReuse(true)` на контейнере + `testcontainers.reuse.enable=true` в `~/.testcontainers.properties` — при параллельных запусках из нескольких worktrees переиспользуется уже запущенный Docker-контейнер.
- **Запрещено** объявлять `PostgreSQLContainer` как нестатический `@Bean` — при появлении второго Spring-контекста (например, из-за нарушения правила @MockBean) стартует второй контейнер.

```java
// Правильный паттерн в TestConfig
// Имя БД — хэш user.dir: одна БД на worktree, переиспользуется между прогонами.
// Контейнер один на машину благодаря withReuse(true), Flyway проигрывается один раз.
// Параллельный `./gradlew test` из одной директории НЕ запускать — будет deadlock в cleanUpDatabase.
private static final String DB_NAME = "test_"
    + String.format("%06x", Math.abs(System.getProperty("user.dir").hashCode()) % 0x1000000);

@SuppressWarnings("resource")
private static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
    .withDatabaseName(DB_NAME)
    .withUsername("luna")
    .withPassword("luna")
    .withReuse(true);

static { POSTGRES.start(); }

@Bean @ServiceConnection
PostgreSQLContainer<?> postgresContainer() { return POSTGRES; }
```

## Нет моков — только реальные данные

- Не мокировать репозитории, сервисы, базу данных.
- Тестовые данные создавать **через репозитории** (`@Autowired`-поля) в `@BeforeEach`.
- Допустимые моки в `BaseIT`: внешние HTTP-клиенты, которые нельзя поднять в контейнере
  (Telegram Bot API, Anthropic Claude API). На MVP — `@MockBean TarotInterpreter`
  и `@MockBean TelegramClient`.
- Если нужно проверить поведение с конкретным состоянием БД — создать это состояние через `save()`, не через mock `when(...).thenReturn(...)`.

```java
// Запрещено
when(userRepo.findByTgUserId(123L)).thenReturn(Optional.of(user));

// Обязательно
User user = userRepository.save(User.builder()
    .tgUserId(123L)
    .name("Алиса")
    .birthDate(LocalDate.of(1995, 3, 15))
    .build());
```

## AssertJ — единственный фреймворк утверждений

- Использовать только `assertThat(...)` из `org.assertj.core.api.Assertions`.
- Запрещены: `org.junit.jupiter.api.Assertions.*` (assertEquals, assertTrue и т.д.), Hamcrest.
- Тест без содержательных ассертов — не покрытие. `assertTrue(true)` запрещён.

```java
// Запрещено
assertEquals(3, reading.cards().size());
assertTrue(result.isPresent());

// Обязательно
assertThat(reading.cards()).hasSize(3);
assertThat(result).isPresent();
assertThat(user.getName()).isEqualTo("Алиса");
```

## Функциональный стиль в тестах

- Коллекции проверять через AssertJ-цепочки, не через цикл.

```java
// Плохо
for (TarotCard c : cards) {
    assertTrue(c.isMajor());
}

// Хорошо
assertThat(cards).allSatisfy(c -> assertThat(c.isMajor()).isTrue());
// или
assertThat(cards).extracting(TarotCard::isMajor).containsOnly(true);
```

## assertInTransaction для lazy-загрузки

- Если проверяемое поле — `@OneToMany` / `@ManyToMany` (lazy), и запрос уже завершён,
  нужно загрузить его в новой транзакции:

```java
@Autowired
private TransactionTemplate tx;

@Test
void reading_persists_cards() {
    // ... вызов сервиса ...

    tx.executeWithoutResult(status -> {
        Reading reloaded = readingRepository.findById(readingId).orElseThrow();
        assertThat(reloaded.getDrawnCards()).hasSize(3);
    });
}
```

- Не добавлять `FetchType.EAGER` только ради теста — это меняет production-поведение.

## Покрытие

- Новый код, меняющий поведение системы, обязан иметь интеграционный тест в том же PR.
- Проверять: `./gradlew build` (все тесты зелёные).
- Конфликт Flyway в тестах («Found more than one migration with version N») → `./gradlew clean build`.

## E2E (отложено)

E2E-тесты на Playwright появятся в Phase 5 (Mini App). Пока правил по ним нет —
добавим вместе с инфраструктурой E2E.
