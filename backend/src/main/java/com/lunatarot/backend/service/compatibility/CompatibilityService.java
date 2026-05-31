package com.lunatarot.backend.service.compatibility;

import com.lunatarot.backend.config.LunaTelegramProperties;
import com.lunatarot.backend.domain.model.CompatibilityCheckEntity;
import com.lunatarot.backend.domain.model.UserEntity;
import com.lunatarot.backend.domain.model.enums.CompatibilityStatus;
import com.lunatarot.backend.domain.model.enums.ZodiacSign;
import com.lunatarot.backend.domain.repository.CompatibilityCheckRepository;
import com.lunatarot.backend.service.EsotericProfile;
import com.lunatarot.backend.service.EsotericProfileCalculator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.LocalDate;
import java.time.Period;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

/**
 * Рассчитывает совместимость и сохраняет результат как запись в Дневник.
 * Поддерживает solo-режим (имя+ДР партнёра вручную) и invite-flow
 * (друг входит по ссылке — добавит в Этапе 2).
 */
@Service
public class CompatibilityService {

    /** Партнёр младше 16 лет — это не та совместимость, которую мы считаем. */
    static final int MIN_ADULT_AGE = 16;
    private static final int MIN_NAME = 1;
    private static final int MAX_NAME = 64;
    private static final int HISTORY_LIMIT = 50;

    /** Длина slug'а в символах. 12 hex-символов = 48 бит — ~1e14 вариантов. */
    private static final int SLUG_LENGTH = 12;
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String SLUG_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

    private final EsotericProfileCalculator calculator;
    private final CompatibilityGenerator generator;
    private final CompatibilityCheckRepository repository;
    private final CompatibilityNotifier notifier;
    private final LunaTelegramProperties telegramProperties;
    private final Clock clock;

    public CompatibilityService(EsotericProfileCalculator calculator,
                                CompatibilityGenerator generator,
                                CompatibilityCheckRepository repository,
                                CompatibilityNotifier notifier,
                                LunaTelegramProperties telegramProperties,
                                Clock clock) {
        this.calculator = calculator;
        this.generator = generator;
        this.repository = repository;
        this.notifier = notifier;
        this.telegramProperties = telegramProperties;
        this.clock = clock;
    }

    /**
     * Solo-режим: получаем результат + СРАЗУ сохраняем как COMPLETED-запись
     * в Дневник инициатора.
     */
    @Transactional
    public CompatibilityResult calculate(CompatibilityRequest request) {
        validate(request);
        Integer partnerAge = ageFrom(request.partnerBirthDate());
        if (partnerAge != null && partnerAge < MIN_ADULT_AGE) {
            throw new IllegalArgumentException(
                "Совместимость считается для взрослых. Если этот человек младше "
                    + MIN_ADULT_AGE + " — пока без расклада."
            );
        }
        ZodiacSign myZodiac = request.me().getZodiac();
        if (myZodiac == null) {
            // Если у юзера ещё не посчитан знак (не должно быть после онбординга) —
            // считаем из его ДР.
            if (request.me().getBirthDate() == null) {
                throw new IllegalStateException("Сначала укажи свою дату рождения в профиле");
            }
            EsotericProfile myProfile = calculator.calculate(request.me().getBirthDate());
            myZodiac = myProfile.zodiac();
        }
        Integer myAge = ageFrom(request.me().getBirthDate());
        EsotericProfile partnerProfile = calculator.calculate(request.partnerBirthDate());
        String partnerName = request.partnerName().strip();
        CompatibilityOutput output = generator.generate(
            request.me().getName(), myZodiac, myAge,
            partnerName, partnerProfile.zodiac(), partnerAge
        );
        // Сохраняем запись для Дневника. partner_user_id=NULL — solo-режим.
        CompatibilityCheckEntity entity = CompatibilityCheckEntity.builder()
            .initiatorUserId(request.me().getId())
            .partnerUserId(null)
            .partnerName(partnerName)
            .partnerBirthDate(request.partnerBirthDate())
            .initiatorZodiac(myZodiac)
            .partnerZodiac(partnerProfile.zodiac())
            .score(output.score())
            .resultText(output.text())
            .status(CompatibilityStatus.COMPLETED)
            .build();
        repository.save(entity);
        return new CompatibilityResult(
            myZodiac, partnerProfile.zodiac(), partnerName, output.score(), output.text()
        );
    }

    /** История совместимостей юзера (инициированные им + те, куда его пригласили). */
    public List<CompatibilityCheckEntity> historyFor(long userId) {
        return repository.findHistoryByUser(userId, HISTORY_LIMIT);
    }

    // ── Invite-flow ─────────────────────────────────────────────

    /**
     * Создать PENDING_INVITE запись с уникальным slug-ом. Инициатор отправит
     * Telegram-ссылку другу; когда тот войдёт — {@link #acceptInvite}.
     */
    @Transactional
    public CompatibilityCheckEntity createInvite(UserEntity initiator) {
        if (initiator.getZodiac() == null) {
            throw new IllegalStateException(
                "Сначала укажи свою дату рождения в профиле — без этого Луна не посчитает совместимость."
            );
        }
        String slug = generateUniqueSlug();
        // PENDING-запись: партнёра ещё нет, score/text заполним при accept.
        // partner_name временно «—» (NOT NULL), знак — снимок инициатора (НЕ
        // партнёра — partner_zodiac заполнится при accept).
        CompatibilityCheckEntity entity = CompatibilityCheckEntity.builder()
            .initiatorUserId(initiator.getId())
            .partnerName("—")
            .initiatorZodiac(initiator.getZodiac())
            .partnerZodiac(initiator.getZodiac()) // placeholder, перезапишется
            .score(50) // placeholder, перезапишется
            .resultText("")
            .inviteSlug(slug)
            .status(CompatibilityStatus.PENDING_INVITE)
            .build();
        return repository.save(entity);
    }

    /** Поиск PENDING-приглашения по slug — для friend'а, перешедшего по ссылке. */
    public Optional<CompatibilityCheckEntity> findPendingInvite(String slug) {
        return repository.findByInviteSlug(slug)
            .filter(c -> c.getStatus() == CompatibilityStatus.PENDING_INVITE);
    }

    /**
     * Friend перешёл по deeplink и идентифицирован как user.
     * Заполняем partner_*, генерируем score+text, переключаем на COMPLETED.
     * После этого запись видна обоим в Дневнике.
     */
    @Transactional
    public CompatibilityCheckEntity acceptInvite(String slug,
                                                 UserEntity friend,
                                                 UserEntity initiator) {
        CompatibilityCheckEntity entity = repository.findByInviteSlug(slug)
            .orElseThrow(() -> new IllegalArgumentException("Приглашение не найдено или уже использовано"));
        if (entity.getStatus() != CompatibilityStatus.PENDING_INVITE) {
            throw new IllegalArgumentException("Это приглашение уже завершено");
        }
        if (entity.getInitiatorUserId().equals(friend.getId())) {
            throw new IllegalArgumentException("Нельзя сравнивать себя с собой");
        }
        ZodiacSign friendZodiac = friend.getZodiac();
        if (friendZodiac == null) {
            if (friend.getBirthDate() == null) {
                throw new IllegalStateException("Сначала укажи свою дату рождения в профиле");
            }
            friendZodiac = calculator.calculate(friend.getBirthDate()).zodiac();
        }
        Integer friendAge = ageFrom(friend.getBirthDate());
        Integer initiatorAge = ageFrom(initiator.getBirthDate());
        CompatibilityOutput output = generator.generate(
            initiator.getName(), initiator.getZodiac(), initiatorAge,
            friend.getName(), friendZodiac, friendAge
        );
        entity.setPartnerUserId(friend.getId());
        entity.setPartnerName(friend.getName());
        entity.setPartnerBirthDate(friend.getBirthDate());
        entity.setPartnerZodiac(friendZodiac);
        entity.setScore(output.score());
        entity.setResultText(output.text());
        entity.setStatus(CompatibilityStatus.COMPLETED);
        // Slug больше не нужен, освобождаем чтоб не висел в уникальном индексе.
        entity.setInviteSlug(null);
        CompatibilityCheckEntity saved = repository.save(entity);
        // Уведомляем инициатора в боте — он не следит за приложением постоянно.
        notifier.notifyAccepted(initiator, friend, output.score());
        return saved;
    }

    /** Список pending-приглашений инициатора (друг ещё не вошёл). */
    public List<CompatibilityCheckEntity> pendingFor(long userId) {
        return repository.findPendingByInitiator(userId);
    }

    /** Telegram-ссылка вида https://t.me/{bot}?startapp=compat_{slug}. */
    public String buildShareUrl(String slug) {
        String bot = telegramProperties.botUsername();
        return "https://t.me/" + bot + "?startapp=compat_" + slug;
    }

    private String generateUniqueSlug() {
        // 5 попыток на случай коллизии (хотя при 36^12 это вряд ли понадобится).
        for (int attempt = 0; attempt < 5; attempt++) {
            String candidate = randomSlug();
            if (repository.findByInviteSlug(candidate).isEmpty()) {
                return candidate;
            }
        }
        throw new IllegalStateException("Не удалось сгенерировать уникальный slug");
    }

    private String randomSlug() {
        StringBuilder sb = new StringBuilder(SLUG_LENGTH);
        for (int i = 0; i < SLUG_LENGTH; i++) {
            sb.append(SLUG_ALPHABET.charAt(RANDOM.nextInt(SLUG_ALPHABET.length())));
        }
        return sb.toString();
    }

    private Integer ageFrom(LocalDate birthDate) {
        if (birthDate == null) {
            return null;
        }
        LocalDate today = LocalDate.now(clock.withZone(ZoneOffset.UTC));
        int years = Period.between(birthDate, today).getYears();
        return Math.max(0, years);
    }

    private static void validate(CompatibilityRequest request) {
        if (request.partnerName() == null) {
            throw new IllegalArgumentException("Имя партнёра обязательно");
        }
        String trimmed = request.partnerName().strip();
        if (trimmed.length() < MIN_NAME || trimmed.length() > MAX_NAME) {
            throw new IllegalArgumentException("Имя — от " + MIN_NAME + " до " + MAX_NAME + " символов");
        }
        if (request.partnerBirthDate() == null) {
            throw new IllegalArgumentException("Дата рождения партнёра обязательна");
        }
    }
}
