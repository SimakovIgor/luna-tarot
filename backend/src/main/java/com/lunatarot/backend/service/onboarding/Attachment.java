package com.lunatarot.backend.service.onboarding;

/**
 * Изображение карты, прикреплённое к шагу: имя файла из {@code classpath:/cards/}
 * + флаг «перевёрнута» (тогда фото развернётся на 180° перед отправкой).
 */
public record Attachment(String imagePath, boolean reversed) {

    public static Attachment upright(String imagePath) {
        return new Attachment(imagePath, false);
    }
}
