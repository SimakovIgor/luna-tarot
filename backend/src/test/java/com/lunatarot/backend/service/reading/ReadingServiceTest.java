package com.lunatarot.backend.service.reading;

import com.lunatarot.backend.domain.model.ReadingEntity;
import com.lunatarot.backend.domain.model.UserEntity;
import com.lunatarot.backend.domain.model.enums.ReadingType;
import com.lunatarot.backend.domain.repository.UserRepository;
import com.lunatarot.backend.it.BaseIT;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDate;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;

class ReadingServiceTest extends BaseIT {

    private static final AtomicLong USER_ID_SEED = new AtomicLong(123_000L + System.nanoTime() % 100_000L);

    @Autowired
    private ReadingService readingService;

    @Autowired
    private UserRepository userRepository;

    @Test
    void three_card_reading_persists_with_three_distinct_cards() {
        UserEntity user = newUser("Тест");

        ReadingEntity reading = readingService.createThreeCardReading(user, "Что меня ждёт?");

        assertThat(reading.getId()).isNotNull();
        assertThat(reading.getType()).isEqualTo(ReadingType.THREE_CARD);
        assertThat(reading.getCards()).hasSize(3);
        assertThat(reading.getCards())
            .extracting(rc -> rc.getCard().getId())
            .doesNotHaveDuplicates();
        assertThat(reading.getInterpretation()).isNotBlank();
    }

    @Test
    void interpretation_contains_card_names_and_advice() {
        UserEntity user = newUser("Алиса");

        ReadingEntity reading = readingService.createThreeCardReading(user, "Любовь?");

        assertThat(reading.getInterpretation()).contains("Совет Luna");
        for (var rc : reading.getCards()) {
            assertThat(reading.getInterpretation()).contains(rc.getCard().getNameRu());
        }
    }

    @Test
    void love_spread_draws_five_distinct_cards_and_tags_type_love() {
        UserEntity user = newUser("Игорь");

        ReadingEntity reading = readingService.createReading(user, ReadingType.LOVE, "Что между нами?");

        assertThat(reading.getType()).isEqualTo(ReadingType.LOVE);
        assertThat(reading.getCards()).hasSize(5);
        assertThat(reading.getCards())
            .extracting(rc -> rc.getCard().getId())
            .doesNotHaveDuplicates();
    }

    @Test
    void celtic_cross_draws_ten_cards() {
        UserEntity user = newUser("Маша");

        ReadingEntity reading = readingService.createReading(user, ReadingType.CELTIC_CROSS, "Стоит ли менять работу?");

        assertThat(reading.getType()).isEqualTo(ReadingType.CELTIC_CROSS);
        assertThat(reading.getCards()).hasSize(10);
        assertThat(reading.getCards())
            .extracting(rc -> rc.getCard().getId())
            .doesNotHaveDuplicates();
    }

    @Test
    void year_wheel_draws_twelve_cards_in_order() {
        UserEntity user = newUser("Лена");

        ReadingEntity reading = readingService.createReading(user, ReadingType.YEAR_WHEEL, "Каким будет год?");

        assertThat(reading.getType()).isEqualTo(ReadingType.YEAR_WHEEL);
        assertThat(reading.getCards()).hasSize(12);
        assertThat(reading.getCards())
            .extracting(rc -> (int) rc.getId().getPosition())
            .containsExactly(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11);
    }

    private UserEntity newUser(String name) {
        return userRepository.save(UserEntity.builder()
            .tgUserId(USER_ID_SEED.incrementAndGet())
            .name(name)
            .birthDate(LocalDate.of(1995, 3, 15))
            .build());
    }
}
