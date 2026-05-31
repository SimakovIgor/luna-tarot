package com.lunatarot.backend.api.dto;

import java.time.Instant;

/**
 * Pending-приглашение, отправленное инициатором но ещё не принятое другом.
 * Показывается в Дневнике в секции «ждут ответа».
 */
public record CompatibilityPendingItemDto(
    long id,
    String slug,
    String shareUrl,
    Instant createdAt
) {
}
