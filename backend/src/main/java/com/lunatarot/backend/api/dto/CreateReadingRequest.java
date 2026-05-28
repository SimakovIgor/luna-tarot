package com.lunatarot.backend.api.dto;

import com.lunatarot.backend.domain.model.enums.ReadingType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Универсальный запрос на создание расклада. {@code spreadType} = любой из
 * {@link ReadingType}, кроме {@code CARD_OF_DAY} (тот идёт через GET /card-of-day).
 *
 * @param spreadType тип расклада (THREE_CARD / LOVE / CELTIC_CROSS / YEAR_WHEEL)
 * @param question   вопрос пользователя (3-500 символов; для всех спредов кроме CARD_OF_DAY)
 */
public record CreateReadingRequest(
    @NotNull ReadingType spreadType,
    @Size(min = 3, max = 500) String question
) {
}
