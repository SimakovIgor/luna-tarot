package com.lunatarot.backend.service.compatibility;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.telegram.telegrambots.meta.api.methods.send.SendMessage;
import org.telegram.telegrambots.meta.generics.TelegramClient;

/**
 * Шлёт уведомление инициатору в Telegram-бот, когда друг принимает
 * приглашение и результат готов.
 *
 * Срабатывает AFTER_COMMIT — DB-транзакция уже закрыта, поэтому любые
 * проблемы с Telegram API (медленный ответ, заблокированный бот, network)
 * не блокируют row-lock и не откатывают сохранение записи. Если упадёт —
 * пользователь всё равно увидит результат в Дневнике.
 */
@Slf4j
@Component
public class CompatibilityNotifier {

    private final TelegramClient telegramClient;

    public CompatibilityNotifier(TelegramClient telegramClient) {
        this.telegramClient = telegramClient;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onAccepted(CompatibilityAcceptedEvent event) {
        String text = "✦ " + event.friendName() + " приняла твоё приглашение.\n\n"
            + "Луна сверила вас — резонанс " + event.score() + "%. Загляни в Mini App, "
            + "там полный разбор: что связывает, что разводит и совет Луны.";
        try {
            telegramClient.execute(SendMessage.builder()
                .chatId(event.initiatorTgUserId())
                .text(text)
                .build());
            log.info("Compatibility-notify sent: initiatorTg={}", event.initiatorTgUserId());
        } catch (Exception e) {
            // Любая ошибка — лог, без проброса: транзакция уже зафиксирована,
            // нет смысла валить ответ пользователю из-за upstream issue.
            log.warn("Не удалось отправить compat-notify инициатору tg={}: {}",
                event.initiatorTgUserId(), e.getMessage());
        }
    }
}
