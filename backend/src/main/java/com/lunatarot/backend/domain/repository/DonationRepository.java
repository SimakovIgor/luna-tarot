package com.lunatarot.backend.domain.repository;

import com.lunatarot.backend.domain.model.DonationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface DonationRepository extends JpaRepository<DonationEntity, Long> {

    Optional<DonationEntity> findByTelegramPaymentChargeId(String chargeId);

    /** Сколько всего звёзд задонатил пользователь — для показа в профиле. */
    @Query("SELECT COALESCE(SUM(d.stars), 0) FROM DonationEntity d WHERE d.tgUserId = :tgUserId")
    long sumStarsByTgUserId(@Param("tgUserId") long tgUserId);
}
