package com.lunatarot.backend.llm;

/**
 * Источник интерпретаций расклада. На MVP реализован {@link StubInterpreter}
 * (без внешних вызовов); в Phase 4 добавляется {@code ClaudeInterpreter}.
 *
 * Переключение — через {@code luna.llm.provider=stub|claude} +
 * {@code @ConditionalOnProperty} на конкретной реализации.
 *
 * Возвращает готовый текст для пользователя — без структурного разбиения по позициям.
 * Если в будущем понадобится — можно завести отдельный метод/контракт.
 */
public interface TarotInterpreter {

    String interpret(ReadingContext context);
}
