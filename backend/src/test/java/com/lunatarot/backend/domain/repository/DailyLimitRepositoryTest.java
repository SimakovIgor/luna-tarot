package com.lunatarot.backend.domain.repository;

import com.lunatarot.backend.domain.model.DailyLimitEntity;
import com.lunatarot.backend.domain.model.DailyLimitId;
import com.lunatarot.backend.domain.model.UserEntity;
import com.lunatarot.backend.it.BaseIT;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class DailyLimitRepositoryTest extends BaseIT {

    @Autowired
    private DailyLimitRepository dailyLimitRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    void increment_persists_count_for_user_and_day() {
        UserEntity user = userRepository.save(UserEntity.builder()
            .tgUserId(7L)
            .name("Tester")
            .build());

        LocalDate today = LocalDate.of(2026, 5, 16);
        DailyLimitId pk = new DailyLimitId(user.getId(), today);

        DailyLimitEntity entity = DailyLimitEntity.builder()
            .id(pk)
            .readingsCount(1)
            .build();
        dailyLimitRepository.saveAndFlush(entity);

        DailyLimitEntity loaded = dailyLimitRepository.findById(pk).orElseThrow();
        assertThat(loaded.getReadingsCount()).isEqualTo(1);

        loaded.setReadingsCount(loaded.getReadingsCount() + 1);
        dailyLimitRepository.saveAndFlush(loaded);

        assertThat(dailyLimitRepository.findById(pk).orElseThrow().getReadingsCount()).isEqualTo(2);
    }
}
