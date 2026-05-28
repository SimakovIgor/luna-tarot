package com.lunatarot.backend.bot;

import com.lunatarot.backend.bot.menu.MainMenuBuilder;
import com.lunatarot.backend.service.onboarding.Attachment;
import com.lunatarot.backend.service.onboarding.BotScript;
import com.lunatarot.backend.service.onboarding.OnboardingStep;
import com.lunatarot.backend.service.reading.CardImageProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.telegram.telegrambots.meta.api.methods.ActionType;
import org.telegram.telegrambots.meta.api.methods.send.SendChatAction;
import org.telegram.telegrambots.meta.api.methods.send.SendMediaGroup;
import org.telegram.telegrambots.meta.api.methods.send.SendMessage;
import org.telegram.telegrambots.meta.api.methods.send.SendPhoto;
import org.telegram.telegrambots.meta.api.objects.InputFile;
import org.telegram.telegrambots.meta.api.objects.media.InputMedia;
import org.telegram.telegrambots.meta.api.objects.media.InputMediaPhoto;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.InlineKeyboardMarkup;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.ReplyKeyboard;
import org.telegram.telegrambots.meta.exceptions.TelegramApiException;
import org.telegram.telegrambots.meta.generics.TelegramClient;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Проигрывает {@link BotScript} как последовательность сообщений в Telegram-чат.
 * Используется и {@link UpdateRouter} (синхронный ответ на апдейт),
 * и cron-шедулерами (утренняя рассылка карты дня).
 *
 * Между шагами честно ждёт {@code delayBeforeMs} и шлёт sendChatAction для имитации
 * «бот печатает / готовит фото».
 */
@Slf4j
@Service
public class BotMessageSender {

    /** Лимит Telegram на caption у sendPhoto. */
    private static final int CAPTION_LIMIT = 1024;

    private final TelegramClient telegramClient;
    private final CardImageProvider cardImageProvider;
    private final MainMenuBuilder mainMenuBuilder;

    public BotMessageSender(TelegramClient telegramClient,
                            CardImageProvider cardImageProvider,
                            MainMenuBuilder mainMenuBuilder) {
        this.telegramClient = telegramClient;
        this.cardImageProvider = cardImageProvider;
        this.mainMenuBuilder = mainMenuBuilder;
    }

    public void play(long chatId, BotScript script) {
        for (OnboardingStep step : script.steps()) {
            sleepIfNeeded(step.delayBeforeMs());
            applyChatAction(chatId, step.chatActionBefore());
            if (sendAsCaptionedPhoto(chatId, step)) {
                continue;
            }
            sendAttachments(chatId, step.attachments());
            if (step.message() != null && !step.message().isBlank()) {
                sendText(chatId, step);
            }
        }
    }

    /**
     * Для welcome-шага (одно фото + текст + клавиатура) — отправляем единым sendPhoto с
     * caption и reply_markup. Возвращает true, если шаг полностью отыгран.
     */
    private boolean sendAsCaptionedPhoto(long chatId, OnboardingStep step) {
        if (!step.attachAsCaption() || step.attachments().size() != 1) {
            return false;
        }
        String caption = step.message();
        if (caption == null || caption.isBlank() || caption.length() > CAPTION_LIMIT) {
            return false;
        }
        Attachment attachment = step.attachments().get(0);
        String fileName = displayName(attachment);
        try {
            SendPhoto.SendPhotoBuilder<?, ?> builder = SendPhoto.builder()
                .chatId(chatId)
                .photo(new InputFile(
                    cardImageProvider.inputStreamFor(attachment.imagePath(), attachment.reversed()),
                    fileName
                ))
                .caption(caption);
            InlineKeyboardMarkup keyboard = (InlineKeyboardMarkup) keyboardFor(step.keyboard());
            if (keyboard != null && !keyboard.getKeyboard().isEmpty()) {
                builder.replyMarkup(keyboard);
            }
            telegramClient.execute(builder.build());
            return true;
        } catch (TelegramApiException | IOException e) {
            log.warn("sendPhoto (captioned) {} to chat {} failed: {}", fileName, chatId, e.getMessage());
            return true;
        }
    }

    private static void sleepIfNeeded(int ms) {
        if (ms <= 0) {
            return;
        }
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private void applyChatAction(long chatId, OnboardingStep.ChatAction action) {
        ActionType type = switch (action) {
            case TYPING -> ActionType.TYPING;
            case UPLOAD_PHOTO -> ActionType.UPLOAD_PHOTO;
            case NONE -> null;
        };
        if (type == null) {
            return;
        }
        try {
            telegramClient.execute(SendChatAction.builder().chatId(chatId).action(type.toString()).build());
        } catch (TelegramApiException e) {
            log.debug("sendChatAction {} failed: {}", type, e.getMessage());
        }
    }

    private void sendAttachments(long chatId, List<Attachment> attachments) {
        if (attachments == null || attachments.isEmpty()) {
            return;
        }
        if (attachments.size() == 1) {
            sendSinglePhoto(chatId, attachments.get(0));
        } else {
            sendMediaGroup(chatId, attachments);
        }
    }

    private void sendSinglePhoto(long chatId, Attachment attachment) {
        String fileName = displayName(attachment);
        try {
            telegramClient.execute(SendPhoto.builder()
                .chatId(chatId)
                .photo(new InputFile(cardImageProvider.inputStreamFor(attachment.imagePath(), attachment.reversed()), fileName))
                .build());
        } catch (TelegramApiException | IOException e) {
            log.warn("sendPhoto {} to chat {} failed: {}", fileName, chatId, e.getMessage());
        }
    }

    private void sendMediaGroup(long chatId, List<Attachment> attachments) {
        List<InputMedia> media = new ArrayList<>(attachments.size());
        for (Attachment a : attachments) {
            try {
                media.add(new InputMediaPhoto(
                    cardImageProvider.inputStreamFor(a.imagePath(), a.reversed()),
                    displayName(a)
                ));
            } catch (IOException e) {
                log.warn("Failed to attach {} to media group: {}", a.imagePath(), e.getMessage());
            }
        }
        if (media.isEmpty()) {
            return;
        }
        try {
            telegramClient.execute(SendMediaGroup.builder().chatId(chatId).medias(media).build());
        } catch (TelegramApiException e) {
            log.warn("sendMediaGroup to chat {} failed: {}", chatId, e.getMessage());
        }
    }

    private static String displayName(Attachment a) {
        return a.reversed() ? "r-" + a.imagePath() : a.imagePath();
    }

    private void sendText(long chatId, OnboardingStep step) {
        SendMessage.SendMessageBuilder<?, ?> builder = SendMessage.builder()
            .chatId(chatId)
            .text(step.message());
        ReplyKeyboard keyboard = keyboardFor(step.keyboard());
        if (keyboard != null) {
            builder.replyMarkup(keyboard);
        }
        try {
            telegramClient.execute(builder.build());
        } catch (TelegramApiException e) {
            log.warn("sendMessage to chat {} failed: {}", chatId, e.getMessage());
        }
    }

    private ReplyKeyboard keyboardFor(OnboardingStep.Keyboard kind) {
        return switch (kind) {
            case MAIN_MENU -> mainMenuBuilder.build();
            case NONE -> null;
        };
    }
}
