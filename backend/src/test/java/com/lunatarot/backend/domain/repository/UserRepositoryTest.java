package com.lunatarot.backend.domain.repository;

import com.lunatarot.backend.domain.model.UserEntity;
import com.lunatarot.backend.domain.model.enums.BotConversationState;
import com.lunatarot.backend.domain.model.enums.LunarPhase;
import com.lunatarot.backend.domain.model.enums.ZodiacSign;
import com.lunatarot.backend.it.BaseIT;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class UserRepositoryTest extends BaseIT {

    @Autowired
    private UserRepository userRepository;

    @Test
    void save_and_find_by_tg_user_id() {
        UserEntity saved = userRepository.save(UserEntity.builder()
            .tgUserId(100_500L)
            .name("Алиса")
            .birthDate(LocalDate.of(1995, 3, 15))
            .zodiac(ZodiacSign.PISCES)
            .lifePathNumber((short) 33)
            .lunarPhase(LunarPhase.WAXING)
            .build());

        Optional<UserEntity> found = userRepository.findByTgUserId(100_500L);

        assertThat(found).isPresent();
        assertThat(found.get().getId()).isEqualTo(saved.getId());
        assertThat(found.get().getName()).isEqualTo("Алиса");
        assertThat(found.get().getConversationState()).isEqualTo(BotConversationState.NEW);
    }

    @Test
    void created_at_and_updated_at_populated_on_persist() {
        UserEntity saved = userRepository.saveAndFlush(UserEntity.builder()
            .tgUserId(200L)
            .name("Тест")
            .build());

        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getUpdatedAt()).isNotNull();
    }

    @Test
    void find_by_tg_user_id_returns_empty_when_missing() {
        assertThat(userRepository.findByTgUserId(999_999L)).isEmpty();
    }
}
