package com.lunatarot.backend.domain.model.enums;

/**
 * Как сбылось то, что Луна показала. Пользователь отмечает в дневнике.
 * NULL в БД = ещё не отмечено.
 */
public enum ReadingOutcome {
    /** ✨ всё совпало — расклад попал в цель. */
    CAME_TRUE,
    /** 🌗 частично — что-то откликнулось, что-то нет. */
    PARTIAL,
    /** 🌑 мимо — не совпало. */
    MISSED
}
