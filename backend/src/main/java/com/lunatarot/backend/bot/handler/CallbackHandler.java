package com.lunatarot.backend.bot.handler;

import com.lunatarot.backend.service.onboarding.BotScript;
import com.lunatarot.backend.service.onboarding.OnboardingService;
import org.springframework.stereotype.Component;

/**
 * Бот стал «приглашателем» Mini App: основной CTA — WebApp-кнопка, она не отправляет
 * callback_query. Старые inline-callback'и из истории чата считаем «промахом» и
 * возвращаем welcome-скрипт, чтобы пользователь снова увидел кнопку входа.
 */
@Component
public class CallbackHandler {

    private final OnboardingService onboardingService;

    public CallbackHandler(OnboardingService onboardingService) {
        this.onboardingService = onboardingService;
    }

    public BotScript handle(String callbackData, long tgUserId) {
        return onboardingService.handleStart(tgUserId);
    }
}
