package com.lunatarot.backend.bot;

import com.lunatarot.backend.bot.handler.CallbackHandler;
import com.lunatarot.backend.bot.handler.CommandHandler;
import com.lunatarot.backend.service.donation.DonationService;
import com.lunatarot.backend.service.onboarding.BotScript;
import com.lunatarot.backend.service.onboarding.OnboardingService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.telegram.telegrambots.meta.api.methods.AnswerCallbackQuery;
import org.telegram.telegrambots.meta.api.methods.AnswerPreCheckoutQuery;
import org.telegram.telegrambots.meta.api.methods.send.SendMessage;
import org.telegram.telegrambots.meta.api.objects.CallbackQuery;
import org.telegram.telegrambots.meta.api.objects.Update;
import org.telegram.telegrambots.meta.api.objects.message.Message;
import org.telegram.telegrambots.meta.api.objects.payments.PreCheckoutQuery;
import org.telegram.telegrambots.meta.api.objects.payments.SuccessfulPayment;
import org.telegram.telegrambots.meta.exceptions.TelegramApiException;
import org.telegram.telegrambots.meta.generics.TelegramClient;

/**
 * Маршрутизирует Telegram-апдейты:
 *  - text "/..." → CommandHandler;
 *  - произвольный текст → welcome-скрипт (бот = приглашатель Mini App);
 *  - callback_query → CallbackHandler;
 *  - pre_checkout_query → автоматически подтверждаем (донат-инвойс уже валидирован);
 *  - successful_payment → сохраняем донат + шлём тёплое «спасибо».
 *
 * Сам ответ проигрывает {@link BotMessageSender}.
 */
@Slf4j
@Component
public class UpdateRouter {

    private final OnboardingService onboardingService;
    private final CommandHandler commandHandler;
    private final CallbackHandler callbackHandler;
    private final DonationService donationService;
    private final BotMessageSender sender;
    private final TelegramClient telegramClient;

    public UpdateRouter(OnboardingService onboardingService,
                        CommandHandler commandHandler,
                        CallbackHandler callbackHandler,
                        DonationService donationService,
                        BotMessageSender sender,
                        TelegramClient telegramClient) {
        this.onboardingService = onboardingService;
        this.commandHandler = commandHandler;
        this.callbackHandler = callbackHandler;
        this.donationService = donationService;
        this.sender = sender;
        this.telegramClient = telegramClient;
    }

    public void route(Update update) {
        try {
            if (update.hasPreCheckoutQuery()) {
                handlePreCheckout(update.getPreCheckoutQuery());
            } else if (update.hasMessage() && update.getMessage().hasSuccessfulPayment()) {
                handleSuccessfulPayment(update.getMessage());
            } else if (update.hasCallbackQuery()) {
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

    /**
     * Telegram спрашивает «можно ли провести оплату» — у нас Stars-инвойсы валидируются
     * на этапе создания (фиксированные суммы), поэтому всегда подтверждаем.
     * Ответить нужно в течение 10 секунд, иначе оплата отменяется.
     */
    private void handlePreCheckout(PreCheckoutQuery pcq) {
        try {
            telegramClient.execute(AnswerPreCheckoutQuery.builder()
                .preCheckoutQueryId(pcq.getId())
                .ok(true)
                .build());
            log.info("pre_checkout_query approved: id={} payload={} amount={} {}",
                pcq.getId(), pcq.getInvoicePayload(), pcq.getTotalAmount(), pcq.getCurrency());
        } catch (TelegramApiException e) {
            log.error("answerPreCheckoutQuery failed: id={}", pcq.getId(), e);
        }
    }

    private void handleSuccessfulPayment(Message message) {
        long tgUserId = message.getFrom().getId();
        long chatId = message.getChatId();
        SuccessfulPayment payment = message.getSuccessfulPayment();
        donationService.recordSuccessfulPayment(tgUserId, payment);
        sendThankYou(chatId, payment.getTotalAmount());
    }

    private void sendThankYou(long chatId, int stars) {
        String text = "✨ Луна получила твой свет\n\n"
            + "Спасибо за " + stars + " звёзд — это очень помогает Луне жить и расти.\n"
            + "Я рядом, когда снова понадоблюсь 🌙";
        try {
            telegramClient.execute(SendMessage.builder()
                .chatId(chatId)
                .text(text)
                .build());
        } catch (TelegramApiException e) {
            log.warn("Failed to send thank-you to chat {}: {}", chatId, e.getMessage());
        }
    }

    private void ack(String callbackQueryId) {
        try {
            telegramClient.execute(AnswerCallbackQuery.builder().callbackQueryId(callbackQueryId).build());
        } catch (TelegramApiException e) {
            log.debug("answerCallbackQuery {} failed: {}", callbackQueryId, e.getMessage());
        }
    }
}
