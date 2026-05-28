package com.lunatarot.backend.config;

import com.lunatarot.backend.bot.LunaBot;
import com.lunatarot.backend.bot.UpdateRouter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.telegram.telegrambots.client.okhttp.OkHttpTelegramClient;
import org.telegram.telegrambots.meta.generics.TelegramClient;

/**
 * Конфигурация Telegram-интеграции.
 *
 * {@link TelegramClient} создаётся всегда (нужен UpdateRouter'у и тестам — лёгкий объект,
 * сам по себе HTTP не дёргает).
 *
 * {@link LunaBot} создаётся только если бот включён И токен задан — иначе rubenlagus-starter
 * упадёт, попытавшись запустить long-polling с пустыми кредами.
 */
@Slf4j
@Configuration(proxyBeanMethods = false)
public class TelegramBotConfig {

    @Bean
    public TelegramClient telegramClient(LunaTelegramProperties properties) {
        String token = properties.botToken() == null ? "" : properties.botToken();
        return new OkHttpTelegramClient(token);
    }

    @Bean
    @ConditionalOnExpression(
        "${luna.telegram.enabled:true} and '${luna.telegram.bot-token:}' != ''"
    )
    public LunaBot lunaBot(LunaTelegramProperties properties, UpdateRouter router) {
        log.info("Starting Luna Telegram bot as @{}", properties.botUsername());
        return new LunaBot(properties.botToken(), router);
    }
}
