package com.lunatarot.backend.service;

import com.lunatarot.backend.domain.model.enums.LunarPhase;
import com.lunatarot.backend.domain.model.enums.ZodiacSign;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class EsotericProfileCalculatorTest {

    private final EsotericProfileCalculator calc = new EsotericProfileCalculator();

    @ParameterizedTest
    @CsvSource({
        "2000-01-19, CAPRICORN",
        "2000-01-20, AQUARIUS",
        "1995-03-15, PISCES",
        "1995-03-21, ARIES",
        "1992-07-22, CANCER",
        "1992-07-23, LEO",
        "1980-12-21, SAGITTARIUS",
        "1980-12-22, CAPRICORN"
    })
    void zodiacFor_returns_classical_sign_at_boundaries(String dateIso, ZodiacSign expected) {
        assertThat(calc.zodiacFor(LocalDate.parse(dateIso))).isEqualTo(expected);
    }

    @ParameterizedTest
    @CsvSource({
        // 1+5 + 0+3 + 1+9+9+5 = 33  → master number, не редуцируется
        "1995-03-15, 33",
        // 0+1 + 0+1 + 2+0+0+0 = 4
        "2000-01-01, 4",
        // 2+9 + 0+2 + 1+9+9+2 = 34 → 3+4 = 7
        "1992-02-29, 7",
        // 1+1 + 1+1 + 1+9+8+5 = 27 → 2+7 = 9
        "1985-11-11, 9",
        // 2+0 + 1+1 + 2+0+2+6 = 14 → 1+4 = 5
        "2026-11-20, 5"
    })
    void lifePathNumberFor_reduces_to_single_digit_or_master_number(String dateIso, int expected) {
        assertThat(calc.lifePathNumberFor(LocalDate.parse(dateIso))).isEqualTo((short) expected);
    }

    @Test
    void lifePathNumberFor_keeps_master_number_11() {
        // 3+0 + 0+7 + 1+9+9+0 = 3 + 7 + 19 = 29 → 2+9 = 11 → master, не редуцируется
        assertThat(calc.lifePathNumberFor(LocalDate.of(1990, 7, 30))).isEqualTo((short) 11);
    }

    @Test
    void lunarPhaseFor_at_reference_new_moon_is_new() {
        // Reference: 2000-01-06 — известная новая луна
        assertThat(calc.lunarPhaseFor(LocalDate.of(2000, 1, 6))).isEqualTo(LunarPhase.NEW);
    }

    @Test
    void lunarPhaseFor_one_week_after_new_moon_is_waxing() {
        assertThat(calc.lunarPhaseFor(LocalDate.of(2000, 1, 13))).isEqualTo(LunarPhase.WAXING);
    }

    @Test
    void lunarPhaseFor_about_two_weeks_after_new_moon_is_full() {
        // ~14.77 дней после reference — полнолуние
        assertThat(calc.lunarPhaseFor(LocalDate.of(2000, 1, 21))).isEqualTo(LunarPhase.FULL);
    }

    @Test
    void lunarPhaseFor_about_three_weeks_after_new_moon_is_waning() {
        assertThat(calc.lunarPhaseFor(LocalDate.of(2000, 1, 28))).isEqualTo(LunarPhase.WANING);
    }

    @Test
    void calculate_returns_full_profile() {
        EsotericProfile profile = calc.calculate(LocalDate.of(1995, 3, 15));

        assertThat(profile.zodiac()).isEqualTo(ZodiacSign.PISCES);
        assertThat(profile.lifePathNumber()).isEqualTo((short) 33);
        assertThat(profile.lunarPhase()).isNotNull();
    }

    @Test
    void calculate_throws_on_null_birth_date() {
        assertThatThrownBy(() -> calc.calculate(null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("birthDate");
    }
}
