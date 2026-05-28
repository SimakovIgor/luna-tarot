package com.lunatarot.backend.service.horoscope;

import com.lunatarot.backend.domain.model.DailyHoroscopeEntity;
import com.lunatarot.backend.domain.model.UserEntity;
import com.lunatarot.backend.domain.repository.DailyHoroscopeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;

/**
 * Idempotent выдача гороскопа: для пары (user, date) — один текст. Если за сегодня
 * уже есть — возвращаем; иначе генерим через {@link HoroscopeGenerator} и сохраняем.
 */
@Service
public class HoroscopeService {

    private final DailyHoroscopeRepository repository;
    private final HoroscopeGenerator generator;
    private final Clock clock;

    public HoroscopeService(DailyHoroscopeRepository repository,
                            HoroscopeGenerator generator,
                            Clock clock) {
        this.repository = repository;
        this.generator = generator;
        this.clock = clock;
    }

    @Transactional
    public DailyHoroscopeEntity getOrCreateToday(UserEntity user) {
        LocalDate today = LocalDate.now(clock);
        return repository.findByUserIdAndHoroDate(user.getId(), today)
            .orElseGet(() -> create(user, today));
    }

    private DailyHoroscopeEntity create(UserEntity user, LocalDate date) {
        String text = generator.generate(user, date);
        DailyHoroscopeEntity entity = DailyHoroscopeEntity.builder()
            .user(user)
            .horoDate(date)
            .text(text)
            .build();
        return repository.saveAndFlush(entity);
    }
}
