package com.lunatarot.backend.domain.model.enums;

/**
 * Статус записи совместимости.
 *
 *  PENDING_INVITE — инициатор создал invite-ссылку, друг ещё не вошёл.
 *  COMPLETED — есть {@code score} и {@code resultText}, можно показывать.
 */
public enum CompatibilityStatus {
    PENDING_INVITE,
    COMPLETED
}
