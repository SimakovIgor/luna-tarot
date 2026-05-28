package com.lunatarot.backend.bot.menu;

import com.lunatarot.backend.config.LunaTelegramProperties;
import org.springframework.stereotype.Component;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.InlineKeyboardMarkup;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.buttons.InlineKeyboardButton;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.buttons.InlineKeyboardRow;
import org.telegram.telegrambots.meta.api.objects.webapp.WebAppInfo;

import java.util.List;

/**
 * Главное меню бота — одна WebApp-кнопка в Mini App.
 * Бот = «приглашатель»: вся функциональность (имя/ДР/расклады/гороскоп) живёт в Mini App.
 *
 * Если {@code luna.telegram.mini-app-url} не задан (dev/staging), возвращается пустая
 * клавиатура — кнопка не нарисуется, пользователь увидит только текст приглашения.
 */
@Component
public class MainMenuBuilder {

    public static final String BUTTON_TEXT = "✨ Войти в Зеркало";

    private final LunaTelegramProperties properties;

    public MainMenuBuilder(LunaTelegramProperties properties) {
        this.properties = properties;
    }

    public InlineKeyboardMarkup build() {
        if (!properties.hasMiniApp()) {
            return InlineKeyboardMarkup.builder().keyboard(List.of()).build();
        }
        return InlineKeyboardMarkup.builder()
            .keyboard(List.of(new InlineKeyboardRow(InlineKeyboardButton.builder()
                .text(BUTTON_TEXT)
                .webApp(WebAppInfo.builder().url(properties.miniAppUrl()).build())
                .build())))
            .build();
    }
}
