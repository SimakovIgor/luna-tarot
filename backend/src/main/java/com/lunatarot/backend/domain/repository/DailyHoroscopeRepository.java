package com.lunatarot.backend.domain.repository;

import com.lunatarot.backend.domain.model.DailyHoroscopeEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface DailyHoroscopeRepository extends JpaRepository<DailyHoroscopeEntity, Long> {

    Optional<DailyHoroscopeEntity> findByUserIdAndHoroDate(Long userId, LocalDate horoDate);
}
