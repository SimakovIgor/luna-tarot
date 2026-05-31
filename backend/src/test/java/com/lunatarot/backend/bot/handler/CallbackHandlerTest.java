package com.lunatarot.backend.bot.handler;

import com.lunatarot.backend.it.BaseIT;
import com.lunatarot.backend.service.onboarding.OnboardingStep;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Бот = «приглашатель», поэтому любой callback (включая null/unknown/legacy)
 * заканчивается тем же welcome-скриптом с кнопкой Mini App.
 */
class CallbackHandlerTest extends BaseIT {

    private static final long TG_USER = 880_000L;

    @Autowired
    private CallbackHandler handler;

    @Test
    void any_callback_returns_welcome() {
        OnboardingStep step = handler.handle("menu:three-card", TG_USER).onlyStep();

        assertThat(step.keyboard()).isEqualTo(OnboardingStep.Keyboard.MAIN_MENU);
        assertThat(step.attachments()).hasSize(1);
        assertThat(step.message()).contains("Лун");
    }

    @Test
    void null_callback_also_returns_welcome() {
        OnboardingStep step = handler.handle(null, TG_USER + 1).onlyStep();

        assertThat(step.keyboard()).isEqualTo(OnboardingStep.Keyboard.MAIN_MENU);
    }
}
