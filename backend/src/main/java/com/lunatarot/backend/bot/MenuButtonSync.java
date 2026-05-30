package com.lunatarot.backend.bot;

import com.lunatarot.backend.config.LunaTelegramProperties;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Component;
import org.telegram.telegrambots.meta.api.methods.menubutton.SetChatMenuButton;
import org.telegram.telegrambots.meta.api.objects.menubutton.MenuButtonWebApp;
import org.telegram.telegrambots.meta.api.objects.webapp.WebAppInfo;
import org.telegram.telegrambots.meta.exceptions.TelegramApiException;
import org.telegram.telegrambots.meta.generics.TelegramClient;

/**
 * Синхронизирует <b>Chat Menu Button</b> бота с {@code luna.telegram.mini-app-url}
 * при старте приложения. Это «Открыть приложение» — кнопка, которую Telegram
 * показывает в профиле бота и в поле ввода чата (рядом со скрепкой).
 *
 * Без этого компонента URL пришлось бы каждый раз руками править в BotFather.
 * Теперь же переменная окружения {@code TG_MINI_APP_URL} становится единственным
 * источником правды — и для inline-кнопок в сообщениях, и для глобальной menu-button.
 *
 * Активируется только если бот включён и URL задан (иначе нечего синхронизировать).
 */
@Slf4j
@Component
@ConditionalOnExpression(
    "${luna.telegram.enabled:true} and '${luna.telegram.bot-token:}' != '' and '${luna.telegram.mini-app-url:}' != ''"
)
public class MenuButtonSync {

    private final TelegramClient telegramClient;
    private final LunaTelegramProperties properties;

    public MenuButtonSync(TelegramClient telegramClient, LunaTelegramProperties properties) {
        this.telegramClient = telegramClient;
        this.properties = properties;
    }

    @PostConstruct
    public void syncMenuButton() {
        String url = properties.miniAppUrl();
        String buttonText = "Luna";
        SetChatMenuButton request = SetChatMenuButton.builder()
            // chatId не указываем → дефолтная menu button для ВСЕХ пользователей
            .menuButton(MenuButtonWebApp.builder()
                .text(buttonText)
                .webAppInfo(WebAppInfo.builder().url(url).build())
                .build())
            .build();
        try {
            telegramClient.execute(request);
            log.info("Menu Button бота синхронизирована: text='{}', url={}", buttonText, url);
        } catch (TelegramApiException e) {
            log.warn("Не удалось синхронизировать Menu Button (бот всё равно стартует): {}", e.getMessage());
        }
    }
}
