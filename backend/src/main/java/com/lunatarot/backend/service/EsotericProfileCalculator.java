package com.lunatarot.backend.service;

import com.lunatarot.backend.domain.model.enums.LunarPhase;
import com.lunatarot.backend.domain.model.enums.ZodiacSign;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.MonthDay;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;

@Component
public class EsotericProfileCalculator {

    // Reference new moon: 2000-01-06 18:14 UTC (известная астрономическая точка).
    private static final long REFERENCE_NEW_MOON_EPOCH_SECOND =
        LocalDateTime.of(2000, 1, 6, 18, 14).toEpochSecond(ZoneOffset.UTC);

    private static final double SYNODIC_MONTH_DAYS = 29.530_588_853;
    private static final double SECONDS_PER_DAY = 86_400d;

    // Master numbers — нумерологическая традиция: 11, 22, 33 не редуцируются.
    private static final Set<Integer> MASTER_NUMBERS = Set.of(11, 22, 33);

    // Стартовые даты знаков, отсортированные по календарю.
    // Для дат ДО первой границы (т.е. январь до 20-го) и ПОСЛЕ последней (декабрь от 22-го)
    // действует Capricorn (wrap-around).
    private static final List<ZodiacBoundary> ZODIAC_BOUNDARIES = List.of(
        new ZodiacBoundary(MonthDay.of(1, 20), ZodiacSign.AQUARIUS),
        new ZodiacBoundary(MonthDay.of(2, 19), ZodiacSign.PISCES),
        new ZodiacBoundary(MonthDay.of(3, 21), ZodiacSign.ARIES),
        new ZodiacBoundary(MonthDay.of(4, 20), ZodiacSign.TAURUS),
        new ZodiacBoundary(MonthDay.of(5, 21), ZodiacSign.GEMINI),
        new ZodiacBoundary(MonthDay.of(6, 21), ZodiacSign.CANCER),
        new ZodiacBoundary(MonthDay.of(7, 23), ZodiacSign.LEO),
        new ZodiacBoundary(MonthDay.of(8, 23), ZodiacSign.VIRGO),
        new ZodiacBoundary(MonthDay.of(9, 23), ZodiacSign.LIBRA),
        new ZodiacBoundary(MonthDay.of(10, 23), ZodiacSign.SCORPIO),
        new ZodiacBoundary(MonthDay.of(11, 22), ZodiacSign.SAGITTARIUS),
        new ZodiacBoundary(MonthDay.of(12, 22), ZodiacSign.CAPRICORN)
    );

    public EsotericProfile calculate(LocalDate birthDate) {
        if (birthDate == null) {
            throw new IllegalArgumentException("birthDate must not be null");
        }
        return new EsotericProfile(zodiacFor(birthDate), lifePathNumberFor(birthDate), lunarPhaseFor(birthDate));
    }

    public ZodiacSign zodiacFor(LocalDate date) {
        MonthDay md = MonthDay.from(date);
        // Идём с конца: первая граница, чьё начало <= md, и есть текущий знак.
        // Если ни одна не подошла (январь до 20-го) — это Capricorn wrap-around.
        for (int i = ZODIAC_BOUNDARIES.size() - 1; i >= 0; i--) {
            ZodiacBoundary boundary = ZODIAC_BOUNDARIES.get(i);
            if (!md.isBefore(boundary.start())) {
                return boundary.sign();
            }
        }
        return ZodiacSign.CAPRICORN;
    }

    public short lifePathNumberFor(LocalDate date) {
        int sum = digitSum(date.getYear()) + digitSum(date.getMonthValue()) + digitSum(date.getDayOfMonth());
        while (sum > 9 && !MASTER_NUMBERS.contains(sum)) {
            sum = digitSum(sum);
        }
        return (short) sum;
    }

    public LunarPhase lunarPhaseFor(LocalDate date) {
        long epochSecond = date.atStartOfDay(ZoneOffset.UTC).toEpochSecond();
        double daysSinceRef = (epochSecond - REFERENCE_NEW_MOON_EPOCH_SECOND) / SECONDS_PER_DAY;
        double cyclePos = (daysSinceRef % SYNODIC_MONTH_DAYS + SYNODIC_MONTH_DAYS) % SYNODIC_MONTH_DAYS;
        double normalized = cyclePos / SYNODIC_MONTH_DAYS;

        // Цикл делим на 4 квадранта по 25%.
        if (normalized < 0.125 || normalized >= 0.875) {
            return LunarPhase.NEW;
        }
        if (normalized < 0.375) {
            return LunarPhase.WAXING;
        }
        if (normalized < 0.625) {
            return LunarPhase.FULL;
        }
        return LunarPhase.WANING;
    }

    private static int digitSum(int value) {
        int n = Math.abs(value);
        int sum = 0;
        while (n > 0) {
            sum += n % 10;
            n /= 10;
        }
        return sum;
    }

    private record ZodiacBoundary(MonthDay start, ZodiacSign sign) {
    }
}
