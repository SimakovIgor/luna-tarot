package com.lunatarot.backend.service.reading;

import com.lunatarot.backend.domain.model.ReadingEntity;
import com.lunatarot.backend.domain.model.UserEntity;
import com.lunatarot.backend.domain.model.enums.ReadingType;
import com.lunatarot.backend.domain.repository.UserRepository;
import com.lunatarot.backend.it.BaseIT;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;

class CardOfDayServiceTest extends BaseIT {

    @Autowired
    private CardOfDayService cardOfDayService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CardDrawService cardDrawService;

    @Test
    void second_call_within_same_day_returns_same_reading() {
        UserEntity user = userRepository.save(UserEntity.builder()
            .tgUserId(321_001L).name("Тест").build());

        ReadingEntity first = cardOfDayService.getOrCreateCardOfDay(user);
        ReadingEntity second = cardOfDayService.getOrCreateCardOfDay(user);

        assertThat(second.getId()).isEqualTo(first.getId());
        assertThat(second.getType()).isEqualTo(ReadingType.CARD_OF_DAY);
        assertThat(second.getCards()).hasSize(1);
    }

    @Test
    void deterministic_draw_is_stable_for_same_user_and_date() {
        Long userId = 555_555L;
        var date = java.time.LocalDate.of(2026, 5, 16);

        var card1 = cardDrawService.drawCardOfDay(userId, date);
        var card2 = cardDrawService.drawCardOfDay(userId, date);

        assertThat(card2.card().getId()).isEqualTo(card1.card().getId());
        assertThat(card2.reversed()).isFalse();
    }
}
