package com.lunatarot.backend.service.compatibility;

import com.lunatarot.backend.domain.model.UserEntity;

import java.time.LocalDate;

/**
 * Запрос на расчёт совместимости. me — текущий пользователь (с уже посчитанным
 * эзо-профилем), partner — данные другого человека из ввода.
 */
public record CompatibilityRequest(
    UserEntity me,
    String partnerName,
    LocalDate partnerBirthDate
) {
}
