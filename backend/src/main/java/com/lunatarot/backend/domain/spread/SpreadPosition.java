package com.lunatarot.backend.domain.spread;

/**
 * Позиция карты в раскладе.
 *
 * @param index      порядковый номер (0-based), он же {@code reading_cards.position} в БД
 * @param label      короткое русское имя позиции (отображается на UI и в промпте LLM)
 * @param promptHint подсказка для LLM: что значит позиция в контексте этого спреда
 */
public record SpreadPosition(
    int index,
    String label,
    String promptHint
) {
}
