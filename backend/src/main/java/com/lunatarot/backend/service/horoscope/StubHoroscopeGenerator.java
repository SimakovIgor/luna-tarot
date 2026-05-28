package com.lunatarot.backend.service.horoscope;

import com.lunatarot.backend.domain.model.UserEntity;
import com.lunatarot.backend.domain.model.enums.LunarPhase;
import com.lunatarot.backend.domain.model.enums.ZodiacSign;
import edu.umd.cs.findbugs.annotations.SuppressFBWarnings;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

/**
 * Заглушка гороскопа для dev/MVP без LLM. Шаблонные фразы, рандомизация по дате
 * чтобы тексты не дублировались день в день.
 */
@Component
@ConditionalOnProperty(prefix = "luna.llm", name = "provider", havingValue = "stub", matchIfMissing = true)
public class StubHoroscopeGenerator implements HoroscopeGenerator {

    private static final List<String> OPENINGS = List.of(
        "сегодня воздух пахнет переменой",
        "Луна шепчет о малом, но важном",
        "день держит две дороги в одной руке",
        "сегодня — про тихое внимание",
        "случайностей сегодня не будет"
    );

    private static final List<String> ADVICES = List.of(
        "не торопись с ответом — пусть слово вызреет",
        "позволь себе одно решение, что давно откладывалось",
        "слушай тех, кто говорит мало",
        "сделай шаг в сторону тишины",
        "доверься медленному ходу — он точнее быстрого"
    );

    /** Описание стихии знака — через мап чтобы не плодить switch с CyclomaticComplexity. */
    private static final Map<ZodiacSign, String> ZODIAC_LINES = buildZodiacLines();

    @Override
    @SuppressFBWarnings(value = "DMI_RANDOM_USED_ONLY_ONCE",
        justification = "seeded random для детерминированной генерации текста на (user, date) — пересоздаётся при каждом вызове намеренно")
    public String generate(UserEntity user, LocalDate date) {
        long seed = (long) user.getTgUserId() * 31 + date.toEpochDay();
        Random rng = new Random(seed);
        String opening = OPENINGS.get(rng.nextInt(OPENINGS.size()));
        String advice = ADVICES.get(rng.nextInt(ADVICES.size()));
        String zodiacLine = describeZodiac(user.getZodiac());
        String phaseLine = describePhase(user.getLunarPhase());

        return user.getName() + ", " + opening + ".\n\n"
            + zodiacLine + " " + phaseLine + "\n\n"
            + "✦ " + advice + ".";
    }

    private static Map<ZodiacSign, String> buildZodiacLines() {
        Map<ZodiacSign, String> m = new EnumMap<>(ZodiacSign.class);
        String fire = "Огонь твоего знака даёт силу начать.";
        String earth = "Земля твоего знака напоминает: малое — основание большого.";
        String air = "Воздух твоего знака — ясность; держи мысль лёгкой.";
        String water = "Вода твоего знака — глубина чувств; не отворачивайся от них.";
        m.put(ZodiacSign.ARIES, fire);
        m.put(ZodiacSign.LEO, fire);
        m.put(ZodiacSign.SAGITTARIUS, fire);
        m.put(ZodiacSign.TAURUS, earth);
        m.put(ZodiacSign.VIRGO, earth);
        m.put(ZodiacSign.CAPRICORN, earth);
        m.put(ZodiacSign.GEMINI, air);
        m.put(ZodiacSign.LIBRA, air);
        m.put(ZodiacSign.AQUARIUS, air);
        m.put(ZodiacSign.CANCER, water);
        m.put(ZodiacSign.SCORPIO, water);
        m.put(ZodiacSign.PISCES, water);
        return m;
    }

    private static String describeZodiac(ZodiacSign zodiac) {
        if (zodiac == null) {
            return "Твой знак сегодня молчит — слушай интуицию.";
        }
        return ZODIAC_LINES.get(zodiac);
    }

    private static String describePhase(LunarPhase phase) {
        if (phase == null) {
            return "";
        }
        return switch (phase) {
            case NEW -> "Новая Луна твоего рождения — день для замысла.";
            case WAXING -> "Растущая Луна твоего рождения — день для расширения.";
            case FULL -> "Полная Луна твоего рождения — день для завершения.";
            case WANING -> "Убывающая Луна твоего рождения — день для отпускания.";
        };
    }
}
