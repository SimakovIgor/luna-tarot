package com.lunatarot.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Конфиг утренней push-рассылки «карта дня».
 *
 * @param enabled включён ли cron вообще (в тестах = false)
 * @param cron    Spring cron-выражение (по умолчанию 08:00 МСК = 05:00 UTC ежедневно)
 */
@ConfigurationProperties(prefix = "luna.daily-card")
public record DailyCardProperties(boolean enabled, String cron) {

    public DailyCardProperties {
        if (cron == null || cron.isBlank()) {
            cron = "0 0 5 * * *";
        }
    }
}
