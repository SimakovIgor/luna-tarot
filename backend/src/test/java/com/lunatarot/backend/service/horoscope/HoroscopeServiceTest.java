package com.lunatarot.backend.service.horoscope;

import com.lunatarot.backend.domain.model.DailyHoroscopeEntity;
import com.lunatarot.backend.domain.model.UserEntity;
import com.lunatarot.backend.domain.model.enums.LunarPhase;
import com.lunatarot.backend.domain.model.enums.ZodiacSign;
import com.lunatarot.backend.domain.repository.UserRepository;
import com.lunatarot.backend.it.BaseIT;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDate;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;

class HoroscopeServiceTest extends BaseIT {

    private static final AtomicLong USER_ID_SEED = new AtomicLong(300_000L + System.nanoTime() % 100_000L);

    @Autowired
    private HoroscopeService service;

    @Autowired
    private UserRepository userRepository;

    @Test
    void same_call_in_same_day_returns_same_entity_idempotent() {
        UserEntity user = newUser("Игорь");

        DailyHoroscopeEntity first = service.getOrCreateToday(user);
        DailyHoroscopeEntity second = service.getOrCreateToday(user);

        assertThat(first.getId()).isEqualTo(second.getId());
        assertThat(first.getText()).isEqualTo(second.getText());
    }

    @Test
    void stub_text_contains_user_name() {
        UserEntity user = newUser("Алиса");

        DailyHoroscopeEntity h = service.getOrCreateToday(user);

        assertThat(h.getText()).contains("Алиса");
        assertThat(h.getText()).isNotBlank();
    }

    @Test
    void zodiac_and_phase_lines_appear_when_set() {
        UserEntity user = userRepository.save(UserEntity.builder()
            .tgUserId(USER_ID_SEED.incrementAndGet())
            .name("Лев")
            .birthDate(LocalDate.of(1990, 8, 5))
            .zodiac(ZodiacSign.LEO)
            .lifePathNumber((short) 5)
            .lunarPhase(LunarPhase.FULL)
            .build());

        DailyHoroscopeEntity h = service.getOrCreateToday(user);

        assertThat(h.getText()).contains("Огонь");
        assertThat(h.getText()).contains("Полная Луна");
    }

    private UserEntity newUser(String name) {
        return userRepository.save(UserEntity.builder()
            .tgUserId(USER_ID_SEED.incrementAndGet())
            .name(name)
            .birthDate(LocalDate.of(1995, 3, 15))
            .build());
    }
}
