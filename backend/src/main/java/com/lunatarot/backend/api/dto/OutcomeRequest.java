package com.lunatarot.backend.api.dto;

import com.lunatarot.backend.domain.model.enums.ReadingOutcome;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Запрос на отметку «как сбылось».
 *
 * @param status обязателен: CAME_TRUE / PARTIAL / MISSED
 * @param note   опциональная заметка пользователя (до 1000 символов)
 */
public record OutcomeRequest(
    @NotNull ReadingOutcome status,
    @Size(max = 1000) String note
) {
}
