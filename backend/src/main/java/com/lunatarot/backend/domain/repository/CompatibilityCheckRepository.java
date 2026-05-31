package com.lunatarot.backend.domain.repository;

import com.lunatarot.backend.domain.model.CompatibilityCheckEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CompatibilityCheckRepository extends JpaRepository<CompatibilityCheckEntity, Long> {

    /** Поиск pending-invite по slug (для friend'а который перешёл по ссылке). */
    Optional<CompatibilityCheckEntity> findByInviteSlug(String inviteSlug);

    /**
     * История совместимостей юзера — и те, что он инициировал, и те, куда
     * его пригласили. Только COMPLETED. По убыванию даты.
     *
     * @param userId users.id
     * @param limit  макс. число записей (для пагинации)
     */
    @Query("""
        SELECT c FROM CompatibilityCheckEntity c
        WHERE c.status = com.lunatarot.backend.domain.model.enums.CompatibilityStatus.COMPLETED
          AND (c.initiatorUserId = :userId OR c.partnerUserId = :userId)
        ORDER BY c.createdAt DESC
        LIMIT :limit
        """)
    List<CompatibilityCheckEntity> findHistoryByUser(
        @Param("userId") long userId,
        @Param("limit") int limit
    );
}
