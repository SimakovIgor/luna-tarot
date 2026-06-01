package com.lunatarot.backend.service.compatibility;

import com.lunatarot.backend.domain.model.CompatibilityCheckEntity;
import com.lunatarot.backend.domain.model.UserEntity;
import com.lunatarot.backend.domain.model.enums.CompatibilityStatus;
import com.lunatarot.backend.domain.model.enums.ZodiacSign;
import com.lunatarot.backend.domain.repository.CompatibilityCheckRepository;
import com.lunatarot.backend.domain.repository.UserRepository;
import com.lunatarot.backend.it.BaseIT;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDate;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Покрытие invite-flow: создание ссылки, accept, идемпотентность, отмена,
 * корректность видимости COMPLETED для участников/чужих.
 */
class CompatibilityInviteFlowTest extends BaseIT {

    private static final AtomicLong USER_ID_SEED = new AtomicLong(900_000L + System.nanoTime() % 100_000L);

    @Autowired
    private CompatibilityService service;

    @Autowired
    private CompatibilityCheckRepository repository;

    @Autowired
    private UserRepository userRepository;

    @Test
    void createInvite_reuses_existing_pending_for_same_initiator() {
        UserEntity initiator = saveUser("Игорь", LocalDate.of(1990, 8, 5), ZodiacSign.LEO);

        CompatibilityCheckEntity first = service.createInvite(initiator);
        CompatibilityCheckEntity second = service.createInvite(initiator);

        assertThat(second.getId()).isEqualTo(first.getId());
        assertThat(second.getInviteSlug()).isEqualTo(first.getInviteSlug());
        assertThat(repository.findPendingByInitiator(initiator.getId())).hasSize(1);
    }

    @Test
    void createInvite_without_zodiac_throws() {
        UserEntity initiator = saveUser("Безимени", null, null);

        assertThatThrownBy(() -> service.createInvite(initiator))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("дату рождения");
    }

    @Test
    void acceptInvite_happy_path_completes_record_and_keeps_slug() {
        UserEntity initiator = saveUser("Игорь", LocalDate.of(1990, 8, 5), ZodiacSign.LEO);
        UserEntity friend = saveUser("Алиса", LocalDate.of(1995, 3, 15), ZodiacSign.PISCES);
        CompatibilityCheckEntity invite = service.createInvite(initiator);

        CompatibilityCheckEntity accepted = service.acceptInvite(invite.getInviteSlug(), friend, initiator);

        assertThat(accepted.getStatus()).isEqualTo(CompatibilityStatus.COMPLETED);
        assertThat(accepted.getPartnerUserId()).isEqualTo(friend.getId());
        assertThat(accepted.getPartnerName()).isEqualTo("Алиса");
        assertThat(accepted.getPartnerZodiac()).isEqualTo(ZodiacSign.PISCES);
        assertThat(accepted.getScore()).isBetween(1, 100);
        // Slug сохраняется — нужен для возврата по deeplink'у.
        assertThat(accepted.getInviteSlug()).isEqualTo(invite.getInviteSlug());
    }

    @Test
    void acceptInvite_twice_fails_on_second_call() {
        UserEntity initiator = saveUser("Игорь", LocalDate.of(1990, 8, 5), ZodiacSign.LEO);
        UserEntity friend = saveUser("Алиса", LocalDate.of(1995, 3, 15), ZodiacSign.PISCES);
        CompatibilityCheckEntity invite = service.createInvite(initiator);
        String slug = invite.getInviteSlug();

        service.acceptInvite(slug, friend, initiator);

        assertThatThrownBy(() -> service.acceptInvite(slug, friend, initiator))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("завершено");
    }

    @Test
    void acceptInvite_by_initiator_self_throws() {
        UserEntity initiator = saveUser("Игорь", LocalDate.of(1990, 8, 5), ZodiacSign.LEO);
        CompatibilityCheckEntity invite = service.createInvite(initiator);

        assertThatThrownBy(() -> service.acceptInvite(invite.getInviteSlug(), initiator, initiator))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("с собой");
    }

    @Test
    void acceptInvite_friend_without_zodiac_computes_from_birthdate() {
        UserEntity initiator = saveUser("Игорь", LocalDate.of(1990, 8, 5), ZodiacSign.LEO);
        UserEntity friend = saveUser("Алиса", LocalDate.of(1995, 3, 15), null);
        CompatibilityCheckEntity invite = service.createInvite(initiator);

        CompatibilityCheckEntity accepted = service.acceptInvite(invite.getInviteSlug(), friend, initiator);

        assertThat(accepted.getPartnerZodiac()).isEqualTo(ZodiacSign.PISCES);
    }

    @Test
    void acceptInvite_unknown_slug_throws() {
        UserEntity friend = saveUser("Алиса", LocalDate.of(1995, 3, 15), ZodiacSign.PISCES);
        UserEntity initiator = saveUser("Игорь", LocalDate.of(1990, 8, 5), ZodiacSign.LEO);

        assertThatThrownBy(() -> service.acceptInvite("doesnotexist", friend, initiator))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("не найдено");
    }

    @Test
    void findInviteForUser_pending_visible_to_any_user() {
        UserEntity initiator = saveUser("И", LocalDate.of(1990, 8, 5), ZodiacSign.LEO);
        UserEntity stranger = saveUser("X", LocalDate.of(1990, 1, 1), ZodiacSign.CAPRICORN);
        CompatibilityCheckEntity invite = service.createInvite(initiator);

        Optional<CompatibilityCheckEntity> seen = service.findInviteForUser(invite.getInviteSlug(), stranger.getId());

        assertThat(seen).isPresent();
    }

    @Test
    void findInviteForUser_completed_visible_to_participants_only() {
        UserEntity initiator = saveUser("И", LocalDate.of(1990, 8, 5), ZodiacSign.LEO);
        UserEntity friend = saveUser("А", LocalDate.of(1995, 3, 15), ZodiacSign.PISCES);
        UserEntity stranger = saveUser("X", LocalDate.of(1990, 1, 1), ZodiacSign.CAPRICORN);
        CompatibilityCheckEntity invite = service.createInvite(initiator);
        String slug = invite.getInviteSlug();
        service.acceptInvite(slug, friend, initiator);

        assertThat(service.findInviteForUser(slug, initiator.getId())).isPresent();
        assertThat(service.findInviteForUser(slug, friend.getId())).isPresent();
        assertThat(service.findInviteForUser(slug, stranger.getId())).isEmpty();
    }

    @Test
    void cancelInvite_removes_pending() {
        UserEntity initiator = saveUser("И", LocalDate.of(1990, 8, 5), ZodiacSign.LEO);
        CompatibilityCheckEntity invite = service.createInvite(initiator);

        service.cancelInvite(invite.getInviteSlug(), initiator.getId());

        assertThat(repository.findByInviteSlug(invite.getInviteSlug())).isEmpty();
    }

    @Test
    void cancelInvite_by_other_user_throws() {
        UserEntity initiator = saveUser("И", LocalDate.of(1990, 8, 5), ZodiacSign.LEO);
        UserEntity other = saveUser("X", LocalDate.of(1990, 1, 1), ZodiacSign.CAPRICORN);
        CompatibilityCheckEntity invite = service.createInvite(initiator);

        assertThatThrownBy(() -> service.cancelInvite(invite.getInviteSlug(), other.getId()))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("не твоё");
    }

    @Test
    void cancelInvite_after_accept_throws() {
        UserEntity initiator = saveUser("И", LocalDate.of(1990, 8, 5), ZodiacSign.LEO);
        UserEntity friend = saveUser("А", LocalDate.of(1995, 3, 15), ZodiacSign.PISCES);
        CompatibilityCheckEntity invite = service.createInvite(initiator);
        String slug = invite.getInviteSlug();
        service.acceptInvite(slug, friend, initiator);

        assertThatThrownBy(() -> service.cancelInvite(slug, initiator.getId()))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("принято");
    }

    @Test
    void historyFor_returns_both_initiator_and_partner_records() {
        UserEntity initiator = saveUser("И", LocalDate.of(1990, 8, 5), ZodiacSign.LEO);
        UserEntity friend = saveUser("А", LocalDate.of(1995, 3, 15), ZodiacSign.PISCES);
        CompatibilityCheckEntity invite = service.createInvite(initiator);
        service.acceptInvite(invite.getInviteSlug(), friend, initiator);

        assertThat(service.historyFor(initiator.getId()))
            .extracting(CompatibilityCheckEntity::getStatus)
            .containsExactly(CompatibilityStatus.COMPLETED);
        assertThat(service.historyFor(friend.getId()))
            .extracting(CompatibilityCheckEntity::getPartnerUserId)
            .containsExactly(friend.getId());
    }

    @Test
    void buildShareUrl_format() {
        String url = service.buildShareUrl("abc123def456");

        assertThat(url).startsWith("https://t.me/").contains("startapp=compat_abc123def456");
    }

    private UserEntity saveUser(String name, LocalDate birth, ZodiacSign zodiac) {
        return userRepository.save(UserEntity.builder()
            .tgUserId(USER_ID_SEED.incrementAndGet())
            .name(name)
            .birthDate(birth)
            .zodiac(zodiac)
            .build());
    }
}
