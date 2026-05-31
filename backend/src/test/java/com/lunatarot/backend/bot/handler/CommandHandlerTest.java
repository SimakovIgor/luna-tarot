package com.lunatarot.backend.bot.handler;

import com.lunatarot.backend.it.BaseIT;
import com.lunatarot.backend.service.onboarding.OnboardingStep;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;

class CommandHandlerTest extends BaseIT {

    private static final long TG_USER = 777_000L;

    @Autowired
    private CommandHandler commandHandler;

    @Test
    void start_command_returns_welcome_with_main_menu() {
        OnboardingStep step = commandHandler.handle("/start", TG_USER).onlyStep();

        assertThat(step.keyboard()).isEqualTo(OnboardingStep.Keyboard.MAIN_MENU);
        assertThat(step.attachments()).hasSize(1);
        assertThat(step.message()).contains("Лун");
    }

    @Test
    void start_with_bot_suffix_is_normalized() {
        OnboardingStep step = commandHandler.handle("/start@luna_taro_card_bot", TG_USER + 1).onlyStep();

        assertThat(step.keyboard()).isEqualTo(OnboardingStep.Keyboard.MAIN_MENU);
    }

    @Test
    void help_returns_short_help_with_menu() {
        OnboardingStep step = commandHandler.handle("/help", TG_USER + 2).onlyStep();

        assertThat(step.message()).contains("/start").contains("Mini App");
        assertThat(step.keyboard()).isEqualTo(OnboardingStep.Keyboard.MAIN_MENU);
    }

    @Test
    void menu_command_returns_welcome() {
        OnboardingStep step = commandHandler.handle("/menu", TG_USER + 3).onlyStep();

        assertThat(step.keyboard()).isEqualTo(OnboardingStep.Keyboard.MAIN_MENU);
    }

    @Test
    void unknown_command_also_returns_welcome() {
        OnboardingStep step = commandHandler.handle("/unknown", TG_USER + 4).onlyStep();

        assertThat(step.keyboard()).isEqualTo(OnboardingStep.Keyboard.MAIN_MENU);
        assertThat(step.message()).contains("Лун");
    }
}
