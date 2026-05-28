package com.lunatarot.backend.service.onboarding;

import com.lunatarot.backend.domain.model.UserEntity;
import com.lunatarot.backend.domain.model.enums.BotConversationState;
import com.lunatarot.backend.domain.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Бот стал «приглашателем» в Mini App: имя, пол и дату рождения собирает фронт,
 * а не диалог в чате. Этот сервис лишь гарантирует наличие записи пользователя
 * и возвращает продающий welcome-скрипт с кнопкой входа в Mini App.
 */
@Service
public class OnboardingService {

    static final String WELCOME_IMAGE = "back.jpg";

    private static final String WELCOME_TEXT =
        "🌙 Luna · Зеркало Таро\n\n"
            + "Где-то между сегодня и завтра уже легла твоя карта.\n"
            + "Я её вижу. Хочешь — покажу?\n\n"
            + "Я — Luna, ИИ-таролог. Говорю прямо, без обтекаемого тумана.\n"
            + "Внутри Зеркала тебя ждёт:\n\n"
            + "🔮 Расклад на твой вопрос — три карты по живой ситуации\n"
            + "🌕 Карта дня и личный гороскоп — каждое утро\n"
            + "💞 Совместимость с тем, кто не выходит из головы\n"
            + "📓 Дневник раскладов — видно, как именно сбылось\n\n"
            + "Открой Зеркало — узнаешь, что Луна приготовила сегодня.";

    private final UserRepository userRepository;

    public OnboardingService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional
    public BotScript handleStart(long tgUserId) {
        ensureUser(tgUserId);
        return welcomeScript();
    }

    /** Любой текстовый ввод в боте — это «не туда», подталкиваем пользователя в Mini App. */
    @Transactional
    public BotScript handleText(long tgUserId) {
        ensureUser(tgUserId);
        return welcomeScript();
    }

    private void ensureUser(long tgUserId) {
        if (userRepository.findByTgUserId(tgUserId).isEmpty()) {
            userRepository.save(UserEntity.builder()
                .tgUserId(tgUserId)
                .name("друг")
                .conversationState(BotConversationState.NEW)
                .build());
        }
    }

    private static BotScript welcomeScript() {
        return BotScript.single(OnboardingStep.welcome(WELCOME_TEXT, WELCOME_IMAGE));
    }
}
