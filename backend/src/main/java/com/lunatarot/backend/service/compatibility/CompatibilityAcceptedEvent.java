package com.lunatarot.backend.service.compatibility;

/**
 * Событие «друг принял приглашение и совместимость готова».
 * Публикуется внутри транзакции acceptInvite, обрабатывается AFTER_COMMIT —
 * чтобы Telegram-уведомление не блокировало DB-транзакцию и любая ошибка
 * notifier'а не откатывала сохранение записи.
 *
 * @param initiatorTgUserId chat_id для отправки сообщения в Telegram
 * @param friendName        имя друга (для текста уведомления)
 * @param score             резонанс 1..100
 */
public record CompatibilityAcceptedEvent(
    long initiatorTgUserId,
    String friendName,
    int score
) {
}
