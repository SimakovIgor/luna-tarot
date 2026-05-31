package com.lunatarot.backend.domain.model;

import com.lunatarot.backend.domain.model.enums.CompatibilityStatus;
import com.lunatarot.backend.domain.model.enums.ZodiacSign;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Одна проверка совместимости — solo (заполнили имя/ДР партнёра) или invite
 * (друг вошёл по ссылке). См. V16__create_compatibility_checks.sql.
 */
@Entity
@Table(name = "compatibility_checks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompatibilityCheckEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** users.id того, кто инициировал проверку. */
    @Column(name = "initiator_user_id", nullable = false)
    private Long initiatorUserId;

    /** users.id партнёра (только invite-flow). NULL для solo. */
    @Column(name = "partner_user_id")
    private Long partnerUserId;

    /** Имя партнёра — в solo задаёт юзер, в invite берём из профиля партнёра. */
    @Column(name = "partner_name", nullable = false)
    private String partnerName;

    /** ДР партнёра. В invite берём из профиля партнёра. */
    @Column(name = "partner_birth_date")
    private LocalDate partnerBirthDate;

    /** Знак инициатора на момент проверки (снепшот). */
    @Enumerated(EnumType.STRING)
    @Column(name = "initiator_zodiac", nullable = false)
    private ZodiacSign initiatorZodiac;

    /** Знак партнёра на момент проверки. */
    @Enumerated(EnumType.STRING)
    @Column(name = "partner_zodiac", nullable = false)
    private ZodiacSign partnerZodiac;

    /** Резонанс 1..100. */
    @Column(nullable = false)
    private Integer score;

    /** Текст-разбор от LLM. */
    @Column(name = "result_text", nullable = false, columnDefinition = "TEXT")
    private String resultText;

    /** Случайный slug для deeplink (только PENDING_INVITE). */
    @Column(name = "invite_slug", unique = true)
    private String inviteSlug;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CompatibilityStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
        if (status == null) {
            status = CompatibilityStatus.COMPLETED;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
