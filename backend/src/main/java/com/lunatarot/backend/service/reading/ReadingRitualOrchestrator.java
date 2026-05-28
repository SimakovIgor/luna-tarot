package com.lunatarot.backend.service.reading;

import com.lunatarot.backend.domain.model.ReadingEntity;
import com.lunatarot.backend.domain.model.UserEntity;
import com.lunatarot.backend.service.onboarding.Attachment;
import com.lunatarot.backend.service.onboarding.BotScript;
import com.lunatarot.backend.service.onboarding.OnboardingStep;
import com.lunatarot.backend.service.onboarding.OnboardingStep.ChatAction;
import com.lunatarot.backend.service.onboarding.RussianGrammar;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Собирает «ритуальный» сценарий для расклада: несколько коротких сообщений с typing/upload-photo
 * паузами перед финальной выдачей карт и интерпретации. Перевёрнутые карты прилетают
 * перевёрнутыми (поворот изображения — в {@code BotMessageSender}).
 */
@Service
public class ReadingRitualOrchestrator {

    private static final int PRELUDE_PAUSE_MS = 1_500;
    private static final int CARDS_PULL_PAUSE_MS = 1_500;

    private final ReadingService readingService;
    private final CardOfDayService cardOfDayService;

    public ReadingRitualOrchestrator(ReadingService readingService, CardOfDayService cardOfDayService) {
        this.readingService = readingService;
        this.cardOfDayService = cardOfDayService;
    }

    public BotScript threeCardRitual(UserEntity user, String question) {
        OnboardingStep prelude = OnboardingStep.ritualText(
            "🌙 " + user.getName() + ", " + RussianGrammar.ready(user.getGender())
                + " услышать ответ?\nЯ слышу твой вопрос: «" + question + "».",
            0
        );
        OnboardingStep pulling = OnboardingStep.ritualText(
            "✨ Карты тянутся к свету... Прошлое, Настоящее, Будущее проступают сквозь дым.",
            PRELUDE_PAUSE_MS
        );
        OnboardingStep uploadHint = OnboardingStep.pause(CARDS_PULL_PAUSE_MS, ChatAction.UPLOAD_PHOTO);

        // Claude-вызов происходит здесь, во время паузы перед photo upload.
        ReadingEntity reading = readingService.createThreeCardReading(user, question);

        OnboardingStep cardsAndText = OnboardingStep.readingWithCards(
            "🔮 Расклад на вопрос:\n\n" + reading.getInterpretation(),
            attachmentsFor(reading)
        );
        return BotScript.of(prelude, pulling, uploadHint, cardsAndText);
    }

    public BotScript cardOfDayRitual(UserEntity user) {
        OnboardingStep prelude = OnboardingStep.ritualText(
            "🌙 " + user.getName() + ", твоя карта дня уже выбрана судьбой...",
            0
        );
        OnboardingStep uploadHint = OnboardingStep.pause(CARDS_PULL_PAUSE_MS, ChatAction.UPLOAD_PHOTO);

        ReadingEntity reading = cardOfDayService.getOrCreateCardOfDay(user);

        OnboardingStep finalStep = OnboardingStep.readingWithCards(
            reading.getInterpretation(),
            attachmentsFor(reading)
        );
        return BotScript.of(prelude, uploadHint, finalStep);
    }

    private static List<Attachment> attachmentsFor(ReadingEntity reading) {
        return reading.getCards().stream()
            .filter(rc -> rc.getCard().getImagePath() != null && !rc.getCard().getImagePath().isBlank())
            .map(rc -> new Attachment(rc.getCard().getImagePath(), rc.isReversed()))
            .toList();
    }
}
