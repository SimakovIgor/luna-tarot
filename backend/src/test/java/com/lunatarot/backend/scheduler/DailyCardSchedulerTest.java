package com.lunatarot.backend.scheduler;

import com.lunatarot.backend.bot.BotMessageSender;
import com.lunatarot.backend.config.DailyCardProperties;
import com.lunatarot.backend.domain.model.UserEntity;
import com.lunatarot.backend.domain.model.enums.BotConversationState;
import com.lunatarot.backend.domain.repository.UserRepository;
import com.lunatarot.backend.it.BaseIT;
import com.lunatarot.backend.service.onboarding.BotScript;
import com.lunatarot.backend.service.reading.ReadingRitualOrchestrator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Scheduler сам по себе в test-профиле отключён (luna.daily-card.enabled=false),
 * но логику {@code runOnce()} мы прогоняем напрямую — поднимая собственный
 * экземпляр шедулера с реальными bean'ами.
 */
class DailyCardSchedulerTest extends BaseIT {

    private static final AtomicLong USER_ID_SEED = new AtomicLong(900_000L + System.nanoTime() % 100_000L);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ReadingRitualOrchestrator readingRitual;

    @Test
    void runOnce_sends_card_only_to_ready_users() {
        UserEntity ready = userRepository.save(UserEntity.builder()
            .tgUserId(nextTg())
            .name("ReadyUser")
            .birthDate(LocalDate.of(1995, 3, 15))
            .conversationState(BotConversationState.READY)
            .build());
        UserEntity notReady = userRepository.save(UserEntity.builder()
            .tgUserId(nextTg())
            .name("NotReady")
            .conversationState(BotConversationState.NEW)
            .build());

        CapturingSender capturingSender = new CapturingSender();
        // hasMiniApp() возвращает false → пойдёт по ветке полного ритуала, как раньше.
        com.lunatarot.backend.config.LunaTelegramProperties tgProps =
            new com.lunatarot.backend.config.LunaTelegramProperties(false, "", "", "");
        DailyCardScheduler scheduler = new DailyCardScheduler(
            userRepository, readingRitual, capturingSender, tgProps,
            new DailyCardProperties(true, "0 0 5 * * *"),
            Clock.system(ZoneOffset.UTC)
        );

        int sent = scheduler.runOnce();

        assertThat(sent).isGreaterThanOrEqualTo(1);
        assertThat(capturingSender.chatIds).contains(ready.getTgUserId());
        assertThat(capturingSender.chatIds).doesNotContain(notReady.getTgUserId());
    }

    private static long nextTg() {
        return USER_ID_SEED.incrementAndGet();
    }

    /** Подменяет BotMessageSender — ничего не шлёт в Telegram, только записывает chatIds. */
    private static final class CapturingSender extends BotMessageSender {
        private final java.util.List<Long> chatIds = new java.util.ArrayList<>();

        CapturingSender() {
            super(null, null, null);
        }

        @Override
        public void play(long chatId, BotScript script) {
            chatIds.add(chatId);
        }
    }
}
