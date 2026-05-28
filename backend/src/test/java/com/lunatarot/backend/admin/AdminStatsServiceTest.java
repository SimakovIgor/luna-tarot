package com.lunatarot.backend.admin;

import com.lunatarot.backend.admin.dto.AdminDailyRow;
import com.lunatarot.backend.admin.dto.AdminReadingTypeCount;
import com.lunatarot.backend.admin.dto.AdminStatsResponse;
import com.lunatarot.backend.admin.dto.AdminTotals;
import com.lunatarot.backend.domain.model.ReadingEntity;
import com.lunatarot.backend.domain.model.UserEntity;
import com.lunatarot.backend.domain.model.enums.BotConversationState;
import com.lunatarot.backend.domain.model.enums.ReadingType;
import com.lunatarot.backend.domain.repository.ReadingRepository;
import com.lunatarot.backend.domain.repository.UserRepository;
import com.lunatarot.backend.it.BaseIT;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Тестовая БД переиспользуется между прогонами (Testcontainers reuse) и накапливает
 * остаточные данные от {@code ApiControllersTest} (он стартует реальный Tomcat и пишет
 * мимо роллбэка @Transactional). Поэтому проверяем дельты, а не абсолютные значения.
 */
class AdminStatsServiceTest extends BaseIT {

    private static final ZoneId MSK = ZoneId.of("Europe/Moscow");

    @Autowired
    private AdminStatsService statsService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ReadingRepository readingRepository;

    @Autowired
    private Clock clock;

    @Autowired
    private EntityManager entityManager;

    @Test
    void aggregates_totals_daily_breakdown_and_by_type() {
        LocalDate today = LocalDate.now(clock.withZone(MSK));
        LocalDate yesterday = today.minusDays(1);
        Instant todayMorning = today.atTime(9, 0).atZone(MSK).toInstant();
        Instant yesterdayMorning = yesterday.atTime(9, 0).atZone(MSK).toInstant();

        AdminStatsResponse before = statsService.collect(30);
        AdminTotals beforeTotals = before.totals();
        long threeCardBefore = countByType(before, ReadingType.THREE_CARD);
        long loveBefore = countByType(before, ReadingType.LOVE);
        long cardOfDayBefore = countByType(before, ReadingType.CARD_OF_DAY);
        long newUsersTodayBefore = findDay(before.byDay(), today).newUsers();
        long readingsTodayBefore = findDay(before.byDay(), today).readings();
        long activeTodayBefore = findDay(before.byDay(), today).activeUsers();
        long newUsersYesterdayBefore = findDay(before.byDay(), yesterday).newUsers();

        UserEntity alice = saveUser(900_001L, "Алиса", BotConversationState.READY, yesterdayMorning);
        UserEntity bob = saveUser(900_002L, "Боб", BotConversationState.READY, todayMorning);
        saveUser(900_003L, "Новенький", BotConversationState.NEW, todayMorning);

        saveReading(alice, ReadingType.THREE_CARD, yesterdayMorning);
        saveReading(alice, ReadingType.LOVE, todayMorning);
        saveReading(bob, ReadingType.THREE_CARD, todayMorning);
        saveReading(bob, ReadingType.CARD_OF_DAY, todayMorning);

        entityManager.flush();

        AdminStatsResponse after = statsService.collect(30);

        assertThat(after.totals().users() - beforeTotals.users()).isEqualTo(3);
        assertThat(after.totals().usersReady() - beforeTotals.usersReady()).isEqualTo(2);
        assertThat(after.totals().readings() - beforeTotals.readings()).isEqualTo(4);

        assertThat(after.byDay()).hasSize(30);
        assertThat(after.byDay().get(0).date()).isEqualTo(today);
        assertThat(after.byDay().get(29).date()).isEqualTo(today.minusDays(29));

        AdminDailyRow todayRow = findDay(after.byDay(), today);
        assertThat(todayRow.newUsers() - newUsersTodayBefore).isEqualTo(2);
        assertThat(todayRow.readings() - readingsTodayBefore).isEqualTo(3);
        assertThat(todayRow.activeUsers() - activeTodayBefore).isEqualTo(2);

        AdminDailyRow yesterdayRow = findDay(after.byDay(), yesterday);
        assertThat(yesterdayRow.newUsers() - newUsersYesterdayBefore).isEqualTo(1);

        assertThat(countByType(after, ReadingType.THREE_CARD) - threeCardBefore).isEqualTo(2);
        assertThat(countByType(after, ReadingType.LOVE) - loveBefore).isEqualTo(1);
        assertThat(countByType(after, ReadingType.CARD_OF_DAY) - cardOfDayBefore).isEqualTo(1);
    }

    @Test
    void clamps_window_to_one_day() {
        AdminStatsResponse stats = statsService.collect(1);
        assertThat(stats.byDay()).hasSize(1);
        assertThat(stats.byDay().get(0).date())
            .isEqualTo(LocalDate.now(clock.withZone(MSK)));
    }

    private UserEntity saveUser(long tgId, String name, BotConversationState state, Instant createdAt) {
        return userRepository.saveAndFlush(UserEntity.builder()
            .tgUserId(tgId)
            .name(name)
            .conversationState(state)
            .createdAt(createdAt)
            .updatedAt(createdAt)
            .build());
    }

    private void saveReading(UserEntity user, ReadingType type, Instant createdAt) {
        readingRepository.saveAndFlush(ReadingEntity.builder()
            .user(user)
            .type(type)
            .question("?")
            .interpretation("stub")
            .createdAt(createdAt)
            .build());
    }

    private static AdminDailyRow findDay(List<AdminDailyRow> rows, LocalDate date) {
        return rows.stream()
            .filter(r -> r.date().equals(date))
            .findFirst()
            .orElseThrow();
    }

    private static long countByType(AdminStatsResponse stats, ReadingType type) {
        return stats.readingsByType().stream()
            .filter(r -> type.name().equals(r.type()))
            .mapToLong(AdminReadingTypeCount::count)
            .findFirst()
            .orElse(0L);
    }
}
