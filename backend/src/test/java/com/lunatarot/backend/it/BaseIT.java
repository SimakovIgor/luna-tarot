package com.lunatarot.backend.it;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

/**
 * Базовый класс для интеграционных тестов.
 * Один Spring-контекст на весь прогон. Все интеграционные тесты наследуют.
 *
 * Не добавлять {@code @MockBean} в подклассах — это создаёт второй контекст и ломает Testcontainers.
 * Если нужно замокать внешний клиент — добавлять в этот класс.
 */
// AbstractClassWithoutAnyMethod: BaseIT — корневой носитель аннотаций (Spring context + Testcontainers),
// а не контракт для подклассов. Абстрактность нужна, чтобы исключить прямую инстанциацию.
@SuppressWarnings("PMD.AbstractClassWithoutAnyMethod")
@SpringBootTest
@ActiveProfiles("it")
@Import(TestConfig.class)
@Transactional
public abstract class BaseIT {
}
