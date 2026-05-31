package com.lunatarot.backend.api.dto;

import com.lunatarot.backend.domain.model.enums.ZodiacSign;

import java.time.Instant;

/**
 * Одна запись истории совместимости для показа в Дневнике.
 *
 * @param role         «INITIATOR» если я её запустил, «PARTNER» если меня пригласили.
 *                     На фронте показываем «с {partnerName}» или «{initiatorName} пригласил».
 */
public record CompatibilityHistoryItemDto(
    long id,
    String role,
    String partnerName,
    ZodiacSign myZodiac,
    ZodiacSign partnerZodiac,
    int score,
    String text,
    Instant createdAt
) {
}
