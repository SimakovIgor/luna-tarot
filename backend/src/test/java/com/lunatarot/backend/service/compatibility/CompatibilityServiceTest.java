package com.lunatarot.backend.service.compatibility;

import com.lunatarot.backend.domain.model.UserEntity;
import com.lunatarot.backend.domain.model.enums.ZodiacSign;
import com.lunatarot.backend.domain.repository.UserRepository;
import com.lunatarot.backend.it.BaseIT;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDate;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CompatibilityServiceTest extends BaseIT {

    private static final AtomicLong USER_ID_SEED = new AtomicLong(400_000L + System.nanoTime() % 100_000L);

    @Autowired
    private CompatibilityService service;

    @Autowired
    private UserRepository userRepository;

    @Test
    void calculates_zodiacs_and_returns_text() {
        UserEntity me = userRepository.save(UserEntity.builder()
            .tgUserId(USER_ID_SEED.incrementAndGet())
            .name("Игорь")
            .birthDate(LocalDate.of(1990, 8, 5))
            .zodiac(ZodiacSign.LEO)
            .build());

        CompatibilityResult result = service.calculate(new CompatibilityRequest(
            me, "Алиса", LocalDate.of(1995, 3, 15)
        ));

        assertThat(result.myZodiac()).isEqualTo(ZodiacSign.LEO);
        assertThat(result.partnerZodiac()).isEqualTo(ZodiacSign.PISCES);
        assertThat(result.partnerName()).isEqualTo("Алиса");
        assertThat(result.score()).isBetween(1, 100);
        assertThat(result.text()).contains("Игорь").contains("Алиса");
    }

    @Test
    void same_element_same_message_and_high_score() {
        UserEntity me = userRepository.save(UserEntity.builder()
            .tgUserId(USER_ID_SEED.incrementAndGet())
            .name("X")
            .birthDate(LocalDate.of(1990, 4, 10))
            .zodiac(ZodiacSign.ARIES)
            .build());

        CompatibilityResult result = service.calculate(new CompatibilityRequest(
            me, "Y", LocalDate.of(1990, 8, 5)
        ));

        assertThat(result.text()).contains("огонь");
        assertThat(result.score()).isEqualTo(85);
    }

    @Test
    void blank_partner_name_throws() {
        UserEntity me = userRepository.save(UserEntity.builder()
            .tgUserId(USER_ID_SEED.incrementAndGet())
            .name("Z")
            .birthDate(LocalDate.of(1990, 1, 1))
            .zodiac(ZodiacSign.CAPRICORN)
            .build());

        assertThatThrownBy(() -> service.calculate(new CompatibilityRequest(
            me, "   ", LocalDate.of(1990, 1, 1)
        ))).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void null_partner_date_throws() {
        UserEntity me = userRepository.save(UserEntity.builder()
            .tgUserId(USER_ID_SEED.incrementAndGet())
            .name("Z")
            .birthDate(LocalDate.of(1990, 1, 1))
            .zodiac(ZodiacSign.CAPRICORN)
            .build());

        assertThatThrownBy(() -> service.calculate(new CompatibilityRequest(
            me, "Y", null
        ))).isInstanceOf(IllegalArgumentException.class);
    }
}
