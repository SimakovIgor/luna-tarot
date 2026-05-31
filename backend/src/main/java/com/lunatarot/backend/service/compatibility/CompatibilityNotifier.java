package com.lunatarot.backend.service.compatibility;

import com.lunatarot.backend.domain.model.UserEntity;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.telegram.telegrambots.meta.api.methods.send.SendMessage;
import org.telegram.telegrambots.meta.exceptions.TelegramApiException;
import org.telegram.telegrambots.meta.generics.TelegramClient;

/**
 * Шлёт уведомление инициатору в Telegram-бот, когда друг принимает
 * приглашение и результат готов.
 *
 * Не критично если упадёт (юзер всё равно увидит в Дневнике) — просто
 * логируем warning и едем дальше.
 */
@Slf4j
@Component
public class CompatibilityNotifier {

    private final TelegramClient telegramClient;

    public CompatibilityNotifier(TelegramClient telegramClient) {
        this.telegramClient = telegramClient;
    }

    public void notifyAccepted(UserEntity initiator, UserEntity friend, int score) {
        String text = "✦ " + friend.getName() + " приняла твоё приглашение.\n\n"
            + "Луна сверила вас — резонанс " + score + "%. Загляни в Mini App, "
            + "там полный разбор: что связывает, что разводит и совет Луны.";
        try {
            telegramClient.execute(SendMessage.builder()
                .chatId(initiator.getTgUserId())
                .text(text)
                .build());
            log.info("Compatibility-notify sent: initiator={} friend={}", initiator.getId(), friend.getId());
        } catch (TelegramApiException e) {
            log.warn("Не удалось отправить compat-notify инициатору {}: {}",
                initiator.getId(), e.getMessage());
        }
    }
}
