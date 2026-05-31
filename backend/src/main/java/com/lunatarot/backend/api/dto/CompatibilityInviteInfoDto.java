package com.lunatarot.backend.api.dto;

import com.lunatarot.backend.domain.model.enums.ZodiacSign;

/**
 * Информация о приглашении для friend'а, который перешёл по deeplink.
 * Имя и знак инициатора нужны чтобы экран invitee показал «{Имя} зовёт тебя
 * в Зеркало» (по дизайну compat-flow.jsx).
 */
public record CompatibilityInviteInfoDto(
    String slug,
    String initiatorName,
    ZodiacSign initiatorZodiac,
    String status
) {
}
