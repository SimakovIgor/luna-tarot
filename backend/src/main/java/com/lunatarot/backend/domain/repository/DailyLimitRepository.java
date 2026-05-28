package com.lunatarot.backend.domain.repository;

import com.lunatarot.backend.domain.model.DailyLimitEntity;
import com.lunatarot.backend.domain.model.DailyLimitId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DailyLimitRepository extends JpaRepository<DailyLimitEntity, DailyLimitId> {
}
