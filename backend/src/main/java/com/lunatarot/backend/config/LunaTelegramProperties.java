package com.lunatarot.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Конфигурация Telegram-бота. Считывается из {@code luna.telegram.*}.
 *
 * Бот запускается только если {@code enabled=true} И токен не пустой —
 * см. {@link TelegramBotConfig}.
 */
@ConfigurationProperties(prefix = "luna.telegram")
public record LunaTelegramProperties(
    boolean enabled,
    String botToken,
    String botUsername,
    String miniAppUrl
) {
    public boolean isUsable() {
        return enabled && botToken != null && !botToken.isBlank();
    }

    public boolean hasMiniApp() {
        return miniAppUrl != null && !miniAppUrl.isBlank();
    }
}
