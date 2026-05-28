package com.lunatarot.backend.service.reading;

import com.lunatarot.backend.domain.model.ReadingEntity;
import com.lunatarot.backend.domain.model.UserEntity;
import com.lunatarot.backend.domain.model.enums.ReadingOutcome;
import com.lunatarot.backend.domain.repository.UserRepository;
import com.lunatarot.backend.it.BaseIT;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDate;
import java.util.NoSuchElementException;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OutcomeServiceTest extends BaseIT {

    private static final AtomicLong USER_ID_SEED = new AtomicLong(200_000L + System.nanoTime() % 100_000L);

    @Autowired
    private OutcomeService outcomeService;

    @Autowired
    private ReadingService readingService;

    @Autowired
    private CardOfDayService cardOfDayService;

    @Autowired
    private UserRepository userRepository;

    @Test
    void records_outcome_with_status_note_and_timestamp() {
        UserEntity user = newUser("Лена");
        ReadingEntity reading = readingService.createThreeCardReading(user, "вопрос?");
        assertThat(reading.getOutcomeStatus()).isNull();

        ReadingEntity updated = outcomeService.recordOutcome(
            user.getTgUserId(), reading.getId(), ReadingOutcome.CAME_TRUE, "  сбылось точно как карты говорили  "
        );

        assertThat(updated.getOutcomeStatus()).isEqualTo(ReadingOutcome.CAME_TRUE);
        assertThat(updated.getOutcomeNote()).isEqualTo("сбылось точно как карты говорили");
        assertThat(updated.getOutcomeRecordedAt()).isNotNull();
    }

    @Test
    void allows_overwriting_outcome() {
        UserEntity user = newUser("Маша");
        ReadingEntity reading = readingService.createThreeCardReading(user, "вопрос?");

        outcomeService.recordOutcome(user.getTgUserId(), reading.getId(), ReadingOutcome.MISSED, null);
        ReadingEntity updated = outcomeService.recordOutcome(
            user.getTgUserId(), reading.getId(), ReadingOutcome.PARTIAL, "передумала"
        );

        assertThat(updated.getOutcomeStatus()).isEqualTo(ReadingOutcome.PARTIAL);
        assertThat(updated.getOutcomeNote()).isEqualTo("передумала");
    }

    @Test
    void clear_outcome_nullifies_all_three_fields() {
        UserEntity user = newUser("Игорь");
        ReadingEntity reading = readingService.createThreeCardReading(user, "вопрос?");
        outcomeService.recordOutcome(user.getTgUserId(), reading.getId(), ReadingOutcome.CAME_TRUE, "ага");

        ReadingEntity cleared = outcomeService.clearOutcome(user.getTgUserId(), reading.getId());

        assertThat(cleared.getOutcomeStatus()).isNull();
        assertThat(cleared.getOutcomeNote()).isNull();
        assertThat(cleared.getOutcomeRecordedAt()).isNull();
    }

    @Test
    void blank_note_becomes_null() {
        UserEntity user = newUser("Поля");
        ReadingEntity reading = readingService.createThreeCardReading(user, "вопрос?");

        ReadingEntity updated = outcomeService.recordOutcome(
            user.getTgUserId(), reading.getId(), ReadingOutcome.PARTIAL, "   "
        );

        assertThat(updated.getOutcomeStatus()).isEqualTo(ReadingOutcome.PARTIAL);
        assertThat(updated.getOutcomeNote()).isNull();
    }

    @Test
    void foreign_users_reading_is_invisible_returns_not_found() {
        UserEntity owner = newUser("Owner");
        UserEntity stranger = newUser("Stranger");
        ReadingEntity reading = readingService.createThreeCardReading(owner, "вопрос?");

        assertThatThrownBy(() ->
            outcomeService.recordOutcome(stranger.getTgUserId(), reading.getId(), ReadingOutcome.CAME_TRUE, null)
        ).isInstanceOf(NoSuchElementException.class);
    }

    @Test
    void outcome_on_card_of_day_returns_reading_with_cards_initialized() {
        // Регрессия: ранее DtoMapper падал с LazyInitializationException на reading.getCards()
        // после recordOutcome — потому что OutcomeService.loadOwned не делал JOIN FETCH cards.
        UserEntity user = newUser("ДеньUser");
        var cardOfDay = cardOfDayService.getOrCreateCardOfDay(user);

        ReadingEntity updated = outcomeService.recordOutcome(
            user.getTgUserId(), cardOfDay.getId(), ReadingOutcome.CAME_TRUE, "карта дня попала"
        );

        // Должно работать вне транзакции — иначе вернётся LazyInitializationException.
        assertThat(updated.getCards()).hasSize(1);
        assertThat(updated.getOutcomeStatus()).isEqualTo(ReadingOutcome.CAME_TRUE);
    }

    @Test
    void unknown_reading_throws_not_found() {
        UserEntity user = newUser("Аня");

        assertThatThrownBy(() ->
            outcomeService.recordOutcome(user.getTgUserId(), 9_999_999L, ReadingOutcome.CAME_TRUE, null)
        ).isInstanceOf(NoSuchElementException.class);
    }

    private UserEntity newUser(String name) {
        return userRepository.save(UserEntity.builder()
            .tgUserId(USER_ID_SEED.incrementAndGet())
            .name(name)
            .birthDate(LocalDate.of(1995, 3, 15))
            .build());
    }
}
