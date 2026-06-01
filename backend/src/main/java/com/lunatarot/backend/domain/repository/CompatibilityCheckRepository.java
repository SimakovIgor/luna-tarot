package com.lunatarot.backend.domain.repository;

import com.lunatarot.backend.domain.model.CompatibilityCheckEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CompatibilityCheckRepository extends JpaRepository<CompatibilityCheckEntity, Long> {

    /** Поиск pending-invite по slug (для friend'а который перешёл по ссылке). */
    Optional<CompatibilityCheckEntity> findByInviteSlug(String inviteSlug);

    /**
     * То же, что {@link #findByInviteSlug}, но с pessimistic-локом — нужен для
     * atomic accept: между «прочли PENDING» и «записали COMPLETED» ничего
     * не должно вклиниться. Закрывает race при двойном тапе «Войти и сравнить».
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT c FROM CompatibilityCheckEntity c
        WHERE c.inviteSlug = :slug
        """)
    Optional<CompatibilityCheckEntity> findByInviteSlugForUpdate(@Param("slug") String slug);

    /**
     * Самый свежий PENDING-инвайт инициатора. Используется при createInvite
     * чтобы не плодить дубли при двойном тапе «Создать ссылку».
     */
    @Query("""
        SELECT c FROM CompatibilityCheckEntity c
        WHERE c.status = com.lunatarot.backend.domain.model.enums.CompatibilityStatus.PENDING_INVITE
          AND c.initiatorUserId = :userId
        ORDER BY c.createdAt DESC
        LIMIT 1
        """)
    Optional<CompatibilityCheckEntity> findFirstPendingByInitiator(@Param("userId") long userId);

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

    /** Pending-приглашения инициатора, друг ещё не вошёл. */
    @Query("""
        SELECT c FROM CompatibilityCheckEntity c
        WHERE c.status = com.lunatarot.backend.domain.model.enums.CompatibilityStatus.PENDING_INVITE
          AND c.initiatorUserId = :userId
        ORDER BY c.createdAt DESC
        """)
    List<CompatibilityCheckEntity> findPendingByInitiator(@Param("userId") long userId);
}
