package com.lunatarot.backend.api.dto;

import com.lunatarot.backend.domain.model.enums.ZodiacSign;

/**
 * Информация о приглашении для friend'а, который перешёл по deeplink.
 * Имя и знак инициатора нужны чтобы экран invitee показал «{Имя} зовёт тебя
 * к Луне».
 *
 * Если запись уже COMPLETED и текущий юзер — участник, populate
 * {@code result} — фронт сразу покажет финальный экран без повторного accept'а.
 * Это закрывает кейс «принял → закрыл app до отрисовки → вернулся по ссылке».
 *
 * @param result null если PENDING_INVITE или если юзер не имеет прав видеть результат.
 */
public record CompatibilityInviteInfoDto(
    String slug,
    String initiatorName,
    ZodiacSign initiatorZodiac,
    String status,
    CompatibilityResponseDto result
) {
}
