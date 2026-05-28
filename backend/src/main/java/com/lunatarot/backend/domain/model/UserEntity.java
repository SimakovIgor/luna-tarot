package com.lunatarot.backend.domain.model;

import com.lunatarot.backend.domain.model.enums.BotConversationState;
import com.lunatarot.backend.domain.model.enums.Gender;
import com.lunatarot.backend.domain.model.enums.LunarPhase;
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

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tg_user_id", nullable = false, unique = true)
    private Long tgUserId;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Enumerated(EnumType.STRING)
    @Column(length = 32)
    private ZodiacSign zodiac;

    @Column(name = "life_path_number")
    private Short lifePathNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "lunar_phase", length = 32)
    private LunarPhase lunarPhase;

    @Enumerated(EnumType.STRING)
    @Column(name = "conversation_state", nullable = false, length = 48)
    @Builder.Default
    private BotConversationState conversationState = BotConversationState.NEW;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    @Builder.Default
    private Gender gender = Gender.UNSPECIFIED;

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
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
