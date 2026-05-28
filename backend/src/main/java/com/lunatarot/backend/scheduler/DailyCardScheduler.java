package com.lunatarot.backend.scheduler;

import com.lunatarot.backend.bot.BotMessageSender;
import com.lunatarot.backend.config.DailyCardProperties;
import com.lunatarot.backend.config.LunaTelegramProperties;
import com.lunatarot.backend.domain.model.UserEntity;
import com.lunatarot.backend.domain.model.enums.BotConversationState;
import com.lunatarot.backend.domain.repository.UserRepository;
import com.lunatarot.backend.service.onboarding.BotScript;
import com.lunatarot.backend.service.onboarding.OnboardingStep;
import com.lunatarot.backend.service.reading.ReadingRitualOrchestrator;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

/**
 * Утренняя push-рассылка «карта дня» всем готовым пользователям.
 *
 * Активируется при {@code luna.daily-card.enabled=true} (по умолчанию).
 * Расписание — {@code luna.daily-card.cron} (по умолчанию 08:00 МСК = 05:00 UTC).
 *
 * Логика:
 * - Если Mini App задан → короткое приглашение в Mini App («твоя карта дня ждёт»).
 * - Иначе → полный ритуал карты дня прямо в боте (старый flow для dev).
 */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "luna.daily-card", name = "enabled", havingValue = "true")
public class DailyCardScheduler {

    private static final ZoneId MOSCOW = ZoneId.of("Europe/Moscow");

    private final UserRepository userRepository;
    private final ReadingRitualOrchestrator readingRitual;
    private final BotMessageSender sender;
    private final LunaTelegramProperties telegramProperties;
    private final Clock clock;

    public DailyCardScheduler(UserRepository userRepository,
                              ReadingRitualOrchestrator readingRitual,
                              BotMessageSender sender,
                              LunaTelegramProperties telegramProperties,
                              DailyCardProperties properties,
                              Clock clock) {
        this.userRepository = userRepository;
        this.readingRitual = readingRitual;
        this.sender = sender;
        this.telegramProperties = telegramProperties;
        this.clock = clock;
        log.info("DailyCardScheduler armed with cron='{}'", properties.cron());
    }

    @Scheduled(cron = "${luna.daily-card.cron}", zone = "UTC")
    public void pushDailyCardToAll() {
        runOnce();
    }

    /** Один проход — выделен в публичный метод для тестов и для ручного триггера. */
    @Transactional
    public int runOnce() {
        List<UserEntity> readyUsers = userRepository.findAllByConversationState(BotConversationState.READY);
        log.info("Daily card push: {} ready users", readyUsers.size());
        int sent = 0;
        for (UserEntity user : readyUsers) {
            try {
                BotScript script = telegramProperties.hasMiniApp()
                    ? miniAppInvitation(user, LocalDate.now(clock.withZone(MOSCOW)))
                    : readingRitual.cardOfDayRitual(user);
                sender.play(user.getTgUserId(), script);
                sent++;
            } catch (RuntimeException e) {
                log.warn("Daily card push failed for user tg={}: {}", user.getTgUserId(), e.getMessage());
            }
        }
        log.info("Daily card push: sent={} of {}", sent, readyUsers.size());
        return sent;
    }

    private static BotScript miniAppInvitation(UserEntity user, LocalDate today) {
        String text = DailyPushTemplates.forUser(user.getTgUserId(), user.getName(), today);
        return BotScript.single(OnboardingStep.sayAndShowMenu(text));
    }
}
