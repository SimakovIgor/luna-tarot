package com.lunatarot.backend.api.dto;

/**
 * Ответ на POST /api/compatibility/invite — slug приглашения + готовая
 * Telegram-ссылка, которую инициатор отправляет другу.
 */
public record CompatibilityInviteResponseDto(
    String slug,
    /** Полная Telegram-ссылка вида https://t.me/.../?startapp=compat_xxx. */
    String shareUrl
) {
}
