package com.lunatarot.backend.service.compatibility;

import com.lunatarot.backend.config.LunaTelegramProperties;
import com.lunatarot.backend.domain.model.CompatibilityCheckEntity;
import com.lunatarot.backend.domain.model.UserEntity;
import com.lunatarot.backend.domain.model.enums.CompatibilityStatus;
import com.lunatarot.backend.domain.model.enums.ZodiacSign;
import com.lunatarot.backend.domain.repository.CompatibilityCheckRepository;
import com.lunatarot.backend.domain.repository.UserRepository;
import com.lunatarot.backend.service.EsotericProfile;
import com.lunatarot.backend.service.EsotericProfileCalculator;
import org.springframework.context.ApplicationEventPublisher;
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
 * (друг входит по ссылке).
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
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final LunaTelegramProperties telegramProperties;
    private final Clock clock;

    public CompatibilityService(EsotericProfileCalculator calculator,
                                CompatibilityGenerator generator,
                                CompatibilityCheckRepository repository,
                                UserRepository userRepository,
                                ApplicationEventPublisher eventPublisher,
                                LunaTelegramProperties telegramProperties,
                                Clock clock) {
        this.calculator = calculator;
        this.generator = generator;
        this.repository = repository;
        this.userRepository = userRepository;
        this.eventPublisher = eventPublisher;
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
     * Создать PENDING_INVITE запись с уникальным slug-ом. Если у инициатора
     * уже есть свежий PENDING — возвращаем его, чтобы двойной тап «Создать
     * ссылку» не плодил дубли. Инициатор отправит Telegram-ссылку другу;
     * когда тот войдёт — {@link #acceptInvite}.
     */
    @Transactional
    public CompatibilityCheckEntity createInvite(UserEntity initiator) {
        if (initiator.getZodiac() == null) {
            throw new IllegalStateException(
                "Сначала укажи свою дату рождения в профиле — без этого Луна не посчитает совместимость."
            );
        }
        Optional<CompatibilityCheckEntity> existing =
            repository.findFirstPendingByInitiator(initiator.getId());
        if (existing.isPresent()) {
            return existing.get();
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

    /** Поиск pending-invite по slug — для friend'а, перешедшего по ссылке. */
    public Optional<CompatibilityCheckEntity> findPendingInvite(String slug) {
        return repository.findByInviteSlug(slug)
            .filter(c -> c.getStatus() == CompatibilityStatus.PENDING_INVITE);
    }

    /**
     * Поиск инвайта для конкретного юзера: PENDING_INVITE (любой может видеть
     * приглашение, slug — единственный «секрет») или COMPLETED, если юзер —
     * участник (инициатор или партнёр). Используется при возврате по deeplink'у
     * после того, как accept уже прошёл — чтобы участник мог снова увидеть
     * результат, не открывая Дневник.
     */
    public Optional<CompatibilityCheckEntity> findInviteForUser(String slug, long userId) {
        return repository.findByInviteSlug(slug)
            .filter(c -> {
                if (c.getStatus() == CompatibilityStatus.PENDING_INVITE) {
                    return true;
                }
                boolean isInitiator = c.getInitiatorUserId() != null
                    && c.getInitiatorUserId() == userId;
                boolean isPartner = c.getPartnerUserId() != null
                    && c.getPartnerUserId() == userId;
                return isInitiator || isPartner;
            });
    }

    /**
     * Friend перешёл по deeplink и идентифицирован как user.
     * Заполняем partner_*, генерируем score+text, переключаем на COMPLETED.
     * После этого запись видна обоим в Дневнике.
     *
     * Atomic claim через pessimistic lock + повторную проверку статуса:
     * два параллельных тапа не дадут две COMPLETED-записи и два пуша.
     * Telegram-уведомление публикуется как событие AFTER_COMMIT — не висит
     * в открытой транзакции.
     */
    @Transactional
    public CompatibilityCheckEntity acceptInvite(String slug,
                                                 UserEntity friend,
                                                 UserEntity initiator) {
        CompatibilityCheckEntity entity = repository.findByInviteSlugForUpdate(slug)
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
        // Slug НЕ обнуляем — он остаётся ключом для deeplink'а, чтобы участник
        // мог вернуться по ссылке и снова увидеть результат, если закрыл
        // Mini App до момента отрисовки экрана. Партнёр в записи только один,
        // поэтому коллизий по unique-индексу не будет.
        CompatibilityCheckEntity saved = repository.save(entity);
        // Уведомляем инициатора в боте уже после коммита транзакции — иначе
        // медленный Telegram API будет держать row-lock, а его падение откатит
        // accept целиком (см. CompatibilityNotifier).
        eventPublisher.publishEvent(new CompatibilityAcceptedEvent(
            initiator.getTgUserId(),
            friend.getName(),
            output.score()
        ));
        return saved;
    }

    /** Список pending-приглашений инициатора (друг ещё не вошёл). */
    public List<CompatibilityCheckEntity> pendingFor(long userId) {
        return repository.findPendingByInitiator(userId);
    }

    /**
     * Удалить своё pending-приглашение (если друг так и не открыл и оно
     * больше не нужно). Только PENDING_INVITE — completed-записи через
     * этот метод не удаляются.
     */
    @Transactional
    public void cancelInvite(String slug, long initiatorUserId) {
        CompatibilityCheckEntity entity = repository.findByInviteSlug(slug)
            .orElseThrow(() -> new IllegalArgumentException("Приглашение не найдено"));
        if (entity.getStatus() != CompatibilityStatus.PENDING_INVITE) {
            throw new IllegalArgumentException("Это приглашение уже принято — удалить нельзя");
        }
        if (!entity.getInitiatorUserId().equals(initiatorUserId)) {
            throw new IllegalArgumentException("Это не твоё приглашение");
        }
        repository.delete(entity);
    }

    /** Удобный лукап инициатора по записи — для контроллера. */
    public Optional<UserEntity> findInitiator(CompatibilityCheckEntity entity) {
        return userRepository.findById(entity.getInitiatorUserId());
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
