package com.lunatarot.backend.bot;

import com.lunatarot.backend.bot.handler.CallbackHandler;
import com.lunatarot.backend.bot.handler.CommandHandler;
import com.lunatarot.backend.service.onboarding.BotScript;
import com.lunatarot.backend.service.onboarding.OnboardingService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.telegram.telegrambots.meta.api.methods.AnswerCallbackQuery;
import org.telegram.telegrambots.meta.api.objects.CallbackQuery;
import org.telegram.telegrambots.meta.api.objects.Update;
import org.telegram.telegrambots.meta.api.objects.message.Message;
import org.telegram.telegrambots.meta.exceptions.TelegramApiException;
import org.telegram.telegrambots.meta.generics.TelegramClient;

/**
 * Маршрутизирует Telegram-апдейты:
 *  - text "/..." → CommandHandler;
 *  - произвольный текст → welcome-скрипт (бот = приглашатель Mini App);
 *  - callback_query → CallbackHandler.
 *
 * Сам ответ проигрывает {@link BotMessageSender}.
 */
@Slf4j
@Component
public class UpdateRouter {

    private final OnboardingService onboardingService;
    private final CommandHandler commandHandler;
    private final CallbackHandler callbackHandler;
    private final BotMessageSender sender;
    private final TelegramClient telegramClient;

    public UpdateRouter(OnboardingService onboardingService,
                        CommandHandler commandHandler,
                        CallbackHandler callbackHandler,
                        BotMessageSender sender,
                        TelegramClient telegramClient) {
        this.onboardingService = onboardingService;
        this.commandHandler = commandHandler;
        this.callbackHandler = callbackHandler;
        this.sender = sender;
        this.telegramClient = telegramClient;
    }

    public void route(Update update) {
        try {
            if (update.hasCallbackQuery()) {
                handleCallback(update.getCallbackQuery());
            } else if (update.hasMessage() && update.getMessage().hasText()) {
                handleTextMessage(update.getMessage());
            }
        } catch (RuntimeException ex) {
            log.error("Failed to process update id={}", update.getUpdateId(), ex);
        }
    }

    private void handleTextMessage(Message message) {
        long tgUserId = message.getFrom().getId();
        long chatId = message.getChatId();
        String text = message.getText();
        BotScript script = text.startsWith("/")
            ? commandHandler.handle(text, tgUserId)
            : onboardingService.handleText(tgUserId);
        sender.play(chatId, script);
    }

    private void handleCallback(CallbackQuery cq) {
        long chatId = cq.getMessage().getChatId();
        long tgUserId = cq.getFrom().getId();
        BotScript script = callbackHandler.handle(cq.getData(), tgUserId);
        ack(cq.getId());
        sender.play(chatId, script);
    }

    private void ack(String callbackQueryId) {
        try {
            telegramClient.execute(AnswerCallbackQuery.builder().callbackQueryId(callbackQueryId).build());
        } catch (TelegramApiException e) {
            log.debug("answerCallbackQuery {} failed: {}", callbackQueryId, e.getMessage());
        }
    }
}
