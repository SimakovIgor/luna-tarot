package com.lunatarot.backend.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * Telegram Stars донат. Запись создаётся, когда бот получает update
 * {@code successful_payment} от Telegram'а после успешной оплаты юзером.
 */
@Entity
@Table(name = "donations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DonationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tg_user_id", nullable = false)
    private Long tgUserId;

    /** Сколько Stars задонатил пользователь (всегда > 0). */
    @Column(nullable = false)
    private Integer stars;

    /** Уникальный идентификатор платежа от Telegram. */
    @Column(name = "telegram_payment_charge_id", nullable = false, unique = true)
    private String telegramPaymentChargeId;

    /** Провайдерский id (для Stars обычно пустой). */
    @Column(name = "provider_payment_charge_id")
    private String providerPaymentChargeId;

    /** Наш payload из invoice — {@code donate-{userId}-{stars}}. */
    @Column(nullable = false)
    private String payload;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
