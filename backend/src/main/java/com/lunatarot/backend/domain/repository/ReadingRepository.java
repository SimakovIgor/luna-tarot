package com.lunatarot.backend.domain.repository;

import com.lunatarot.backend.domain.model.ReadingEntity;
import com.lunatarot.backend.domain.model.enums.ReadingType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface ReadingRepository extends JpaRepository<ReadingEntity, Long> {

    /** Один расклад с подгруженными user, cards и карточками — для outcome flow и т.п. */
    @Query("""
        SELECT r FROM ReadingEntity r
        LEFT JOIN FETCH r.user
        LEFT JOIN FETCH r.cards rc
        LEFT JOIN FETCH rc.card
        WHERE r.id = :id
        """)
    Optional<ReadingEntity> findByIdWithCards(@Param("id") Long id);

    /**
     * Recent readings of a user with cards eagerly fetched — нужно для DTO mapping вне транзакции.
     */
    @Query("""
        SELECT DISTINCT r FROM ReadingEntity r
        LEFT JOIN FETCH r.cards rc
        LEFT JOIN FETCH rc.card
        WHERE r.user.id = :userId
        ORDER BY r.createdAt DESC
        """)
    List<ReadingEntity> findRecentByUserId(@Param("userId") Long userId, Pageable pageable);

    @Query("""
        SELECT DISTINCT r FROM ReadingEntity r
        LEFT JOIN FETCH r.cards rc
        LEFT JOIN FETCH rc.card
        WHERE r.user.id = :userId
          AND r.type = :type
          AND r.createdAt >= :since
        ORDER BY r.createdAt DESC
        """)
    List<ReadingEntity> findOfTypeSince(@Param("userId") Long userId,
                                        @Param("type") ReadingType type,
                                        @Param("since") Instant since,
                                        Pageable pageable);

    @Query("""
        SELECT COUNT(r) FROM ReadingEntity r
        WHERE r.user.id = :userId
          AND r.type = :type
          AND r.createdAt >= :after
        """)
    long countSince(@Param("userId") Long userId, @Param("type") ReadingType type, @Param("after") Instant after);
}
