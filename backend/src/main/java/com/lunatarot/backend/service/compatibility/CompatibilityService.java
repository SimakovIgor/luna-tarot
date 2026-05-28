package com.lunatarot.backend.service.compatibility;

import com.lunatarot.backend.domain.model.enums.ZodiacSign;
import com.lunatarot.backend.service.EsotericProfile;
import com.lunatarot.backend.service.EsotericProfileCalculator;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.Period;
import java.time.ZoneOffset;

/**
 * Рассчитывает совместимость: высчитывает знак партнёра по ДР, дёргает генератор.
 * Без persistence (это разовая фича, не идёт в дневник).
 */
@Service
public class CompatibilityService {

    /** Партнёр младше 16 лет — это не та совместимость, которую мы считаем. */
    static final int MIN_ADULT_AGE = 16;
    private static final int MIN_NAME = 1;
    private static final int MAX_NAME = 64;

    private final EsotericProfileCalculator calculator;
    private final CompatibilityGenerator generator;
    private final Clock clock;

    public CompatibilityService(EsotericProfileCalculator calculator,
                                CompatibilityGenerator generator,
                                Clock clock) {
        this.calculator = calculator;
        this.generator = generator;
        this.clock = clock;
    }

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
        return new CompatibilityResult(
            myZodiac, partnerProfile.zodiac(), partnerName, output.score(), output.text()
        );
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
