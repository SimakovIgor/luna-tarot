package com.lunatarot.backend.bot;

import lombok.extern.slf4j.Slf4j;
import org.telegram.telegrambots.longpolling.interfaces.LongPollingUpdateConsumer;
import org.telegram.telegrambots.longpolling.starter.SpringLongPollingBot;
import org.telegram.telegrambots.meta.api.objects.Update;

/**
 * Long-polling Telegram-бот. Делегирует обработку {@link UpdateRouter}.
 * Регистрируется как @Bean только когда {@code luna.telegram.enabled=true}
 * и токен задан — см. {@link com.lunatarot.backend.config.TelegramBotConfig}.
 */
@Slf4j
public class LunaBot implements SpringLongPollingBot {

    private final String botToken;
    private final UpdateRouter router;

    public LunaBot(String botToken, UpdateRouter router) {
        this.botToken = botToken;
        this.router = router;
        log.info("Luna Telegram bot initialized");
    }

    @Override
    public String getBotToken() {
        return botToken;
    }

    @Override
    public LongPollingUpdateConsumer getUpdatesConsumer() {
        return updates -> updates.forEach(this::consume);
    }

    private void consume(Update update) {
        router.route(update);
    }
}
