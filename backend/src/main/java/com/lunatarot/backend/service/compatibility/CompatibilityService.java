package com.lunatarot.backend.service.compatibility;

import com.lunatarot.backend.domain.model.CompatibilityCheckEntity;
import com.lunatarot.backend.domain.model.enums.CompatibilityStatus;
import com.lunatarot.backend.domain.model.enums.ZodiacSign;
import com.lunatarot.backend.domain.repository.CompatibilityCheckRepository;
import com.lunatarot.backend.service.EsotericProfile;
import com.lunatarot.backend.service.EsotericProfileCalculator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.Period;
import java.time.ZoneOffset;
import java.util.List;

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

    private final EsotericProfileCalculator calculator;
    private final CompatibilityGenerator generator;
    private final CompatibilityCheckRepository repository;
    private final Clock clock;

    public CompatibilityService(EsotericProfileCalculator calculator,
                                CompatibilityGenerator generator,
                                CompatibilityCheckRepository repository,
                                Clock clock) {
        this.calculator = calculator;
        this.generator = generator;
        this.repository = repository;
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
