package com.lunatarot.backend.bot.menu;

import com.lunatarot.backend.config.LunaTelegramProperties;
import org.junit.jupiter.api.Test;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.InlineKeyboardMarkup;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.buttons.InlineKeyboardButton;

import static org.assertj.core.api.Assertions.assertThat;

class MainMenuBuilderTest {

    @Test
    void with_mini_app_url_renders_only_webapp_button() {
        MainMenuBuilder builder = new MainMenuBuilder(
            new LunaTelegramProperties(true, "t", "u", "https://example.com/app")
        );

        InlineKeyboardMarkup markup = builder.build();

        assertThat(markup.getKeyboard()).hasSize(1);
        InlineKeyboardButton webAppButton = markup.getKeyboard().get(0).get(0);
        assertThat(webAppButton.getText()).isEqualTo(MainMenuBuilder.BUTTON_TEXT);
        assertThat(webAppButton.getWebApp()).isNotNull();
        assertThat(webAppButton.getWebApp().getUrl()).isEqualTo("https://example.com/app");
        assertThat(webAppButton.getCallbackData()).isNull();
    }

    @Test
    void without_mini_app_url_returns_empty_keyboard() {
        MainMenuBuilder builder = new MainMenuBuilder(
            new LunaTelegramProperties(true, "t", "u", null)
        );

        InlineKeyboardMarkup markup = builder.build();

        assertThat(markup.getKeyboard()).isEmpty();
    }
}
