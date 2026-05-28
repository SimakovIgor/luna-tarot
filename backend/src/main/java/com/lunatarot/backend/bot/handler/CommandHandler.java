package com.lunatarot.backend.bot.handler;

import com.lunatarot.backend.service.onboarding.BotScript;
import com.lunatarot.backend.service.onboarding.OnboardingService;
import com.lunatarot.backend.service.onboarding.OnboardingStep;
import org.springframework.stereotype.Component;

@Component
public class CommandHandler {

    private static final String HELP_TEXT =
        "🌙 Luna — ИИ-таролог.\n\n"
            + "Команды:\n"
            + "/start — открыть Зеркало\n"
            + "/help — эта справка\n\n"
            + "Всё происходит внутри Mini App: расклады, карта дня, совместимость, дневник.";

    private final OnboardingService onboardingService;

    public CommandHandler(OnboardingService onboardingService) {
        this.onboardingService = onboardingService;
    }

    public BotScript handle(String command, long tgUserId) {
        return switch (stripBotSuffix(command)) {
            case "/start", "/menu" -> onboardingService.handleStart(tgUserId);
            case "/help" -> BotScript.single(OnboardingStep.sayAndShowMenu(HELP_TEXT));
            default -> onboardingService.handleStart(tgUserId);
        };
    }

    // В групповых чатах команды приходят как "/start@luna_bot" — отрезаем "@..."
    private static String stripBotSuffix(String command) {
        int at = command.indexOf('@');
        return at < 0 ? command : command.substring(0, at);
    }
}
