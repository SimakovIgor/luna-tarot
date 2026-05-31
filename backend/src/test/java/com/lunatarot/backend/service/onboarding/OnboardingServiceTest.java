package com.lunatarot.backend.service.onboarding;

import com.lunatarot.backend.domain.model.UserEntity;
import com.lunatarot.backend.domain.model.enums.BotConversationState;
import com.lunatarot.backend.domain.repository.UserRepository;
import com.lunatarot.backend.it.BaseIT;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;

class OnboardingServiceTest extends BaseIT {

    private static final AtomicLong USER_ID_SEED = new AtomicLong(555_000L + System.nanoTime() % 100_000L);

    @Autowired
    private OnboardingService onboardingService;

    @Autowired
    private UserRepository userRepository;

    @Test
    void handle_start_creates_user_and_returns_welcome_with_image_and_main_menu() {
        long tg = nextTg();

        OnboardingStep step = onboardingService.handleStart(tg).onlyStep();

        assertThat(step.keyboard()).isEqualTo(OnboardingStep.Keyboard.MAIN_MENU);
        assertThat(step.attachments()).hasSize(1);
        assertThat(step.attachAsCaption()).isTrue();
        assertThat(step.message()).contains("Лун");

        UserEntity user = userRepository.findByTgUserId(tg).orElseThrow();
        assertThat(user.getConversationState()).isEqualTo(BotConversationState.NEW);
    }

    @Test
    void handle_start_is_idempotent_for_existing_user() {
        long tg = nextTg();
        onboardingService.handleStart(tg);

        OnboardingStep step = onboardingService.handleStart(tg).onlyStep();

        assertThat(step.keyboard()).isEqualTo(OnboardingStep.Keyboard.MAIN_MENU);
        assertThat(userRepository.findByTgUserId(tg)).isPresent();
    }

    @Test
    void handle_text_returns_same_welcome_invitation() {
        long tg = nextTg();

        OnboardingStep step = onboardingService.handleText(tg).onlyStep();

        assertThat(step.keyboard()).isEqualTo(OnboardingStep.Keyboard.MAIN_MENU);
        assertThat(step.attachments()).hasSize(1);
        assertThat(step.message()).contains("Лун");
    }

    private static long nextTg() {
        return USER_ID_SEED.incrementAndGet();
    }
}
