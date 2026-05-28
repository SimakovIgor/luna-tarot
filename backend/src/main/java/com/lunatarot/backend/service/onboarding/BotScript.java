package com.lunatarot.backend.service.onboarding;

import java.util.List;

/**
 * Скрипт ответа бота: упорядоченная последовательность {@link OnboardingStep}.
 * Большинство хэндлеров возвращают сценарий из одного шага; ритуал расклада —
 * несколько (вступление → typing → "тянутся карты" → фото → интерпретация).
 */
public record BotScript(List<OnboardingStep> steps) {

    public BotScript {
        steps = List.copyOf(steps);
    }

    public static BotScript single(OnboardingStep step) {
        return new BotScript(List.of(step));
    }

    public static BotScript of(OnboardingStep... steps) {
        return new BotScript(List.of(steps));
    }

    /** Удобный геттер для случаев (тестов и т.п.), где скрипт состоит из одного шага. */
    public OnboardingStep onlyStep() {
        if (steps.size() != 1) {
            throw new IllegalStateException("Expected single step, got " + steps.size());
        }
        return steps.get(0);
    }
}
