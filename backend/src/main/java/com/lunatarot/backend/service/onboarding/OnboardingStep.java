package com.lunatarot.backend.service.onboarding;

import java.util.List;

/**
 * Один шаг ответа бота: текст + опционально клавиатура + вложения + chat-action перед сообщением + пауза.
 *
 * Чистая доменная модель — не знает про Telegram. Bot-адаптер сам разыгрывает:
 *  1) ждёт {@code delayBeforeMs};
 *  2) если {@code chatActionBefore != NONE} — шлёт sendChatAction;
 *  3) шлёт attachments (sendPhoto / sendMediaGroup), поворачивая reversed-карты;
 *  4) если {@code message} не пустое — шлёт sendMessage + клавиатуру.
 *     Исключение: при {@code attachAsCaption=true} и одном attachment текст и
 *     клавиатура уходят как caption+reply_markup того же sendPhoto.
 */
public record OnboardingStep(
    String message,
    Keyboard keyboard,
    List<Attachment> attachments,
    ChatAction chatActionBefore,
    int delayBeforeMs,
    boolean attachAsCaption
) {

    public enum Keyboard {
        NONE,
        MAIN_MENU
    }

    public enum ChatAction {
        NONE,
        TYPING,
        UPLOAD_PHOTO
    }

    public static OnboardingStep say(String message) {
        return new OnboardingStep(message, Keyboard.NONE, List.of(), ChatAction.NONE, 0, false);
    }

    public static OnboardingStep sayAndShowMenu(String message) {
        return new OnboardingStep(message, Keyboard.MAIN_MENU, List.of(), ChatAction.NONE, 0, false);
    }

    /** Тихий шаг — только пауза + chat-action (для ритуала ожидания). */
    public static OnboardingStep pause(int delayMs, ChatAction action) {
        return new OnboardingStep("", Keyboard.NONE, List.of(), action, delayMs, false);
    }

    /** Промежуточное сообщение ритуала (с typing-эффектом перед ним). */
    public static OnboardingStep ritualText(String message, int delayMs) {
        return new OnboardingStep(message, Keyboard.NONE, List.of(), ChatAction.TYPING, delayMs, false);
    }

    /** Финальный шаг: фото карт (возможно перевёрнутые) + текст интерпретации + меню. */
    public static OnboardingStep readingWithCards(String message, List<Attachment> attachments) {
        return new OnboardingStep(
            message, Keyboard.MAIN_MENU, List.copyOf(attachments), ChatAction.UPLOAD_PHOTO, 0, false
        );
    }

    /**
     * Приветственный шаг: одна картинка с caption и кнопкой Mini App — единым сообщением,
     * чтобы пользователь сразу видел и обложку, и продающий текст, и кнопку.
     */
    public static OnboardingStep welcome(String caption, String imagePath) {
        return new OnboardingStep(
            caption, Keyboard.MAIN_MENU, List.of(Attachment.upright(imagePath)),
            ChatAction.UPLOAD_PHOTO, 0, true
        );
    }
}
