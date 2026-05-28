package com.lunatarot.backend.llm;

import com.lunatarot.backend.domain.model.enums.LunarPhase;
import com.lunatarot.backend.domain.model.enums.ZodiacSign;

import java.util.EnumMap;
import java.util.Map;

/**
 * Перевод доменных enum'ов в русские человекочитаемые формы для подмешивания
 * в LLM-промпт. Раньше в промпте появлялись ARIES/WAXING — Claude переводил
 * сам и непоследовательно («Рыбы», «Рыбий», «две рыбы»). Эти карты-словари
 * фиксируют согласованный стиль ввода.
 */
public final class RussianLocalization {

    private static final Map<ZodiacSign, String> ZODIAC = buildZodiac();
    private static final Map<LunarPhase, String> PHASE = buildPhase();

    private RussianLocalization() {
    }

    /** Зодиак в именительном падеже (для контекстной справки в промпте). */
    public static String zodiacRu(ZodiacSign sign) {
        if (sign == null) {
            return "не указан";
        }
        return ZODIAC.get(sign);
    }

    /** Лунная фаза в развёрнутой форме — Claude'у проще, чем угадывать NEW/WANING. */
    public static String lunarPhaseRu(LunarPhase phase) {
        if (phase == null) {
            return "не указано";
        }
        return PHASE.get(phase);
    }

    private static Map<ZodiacSign, String> buildZodiac() {
        Map<ZodiacSign, String> m = new EnumMap<>(ZodiacSign.class);
        m.put(ZodiacSign.ARIES, "Овен");
        m.put(ZodiacSign.TAURUS, "Телец");
        m.put(ZodiacSign.GEMINI, "Близнецы");
        m.put(ZodiacSign.CANCER, "Рак");
        m.put(ZodiacSign.LEO, "Лев");
        m.put(ZodiacSign.VIRGO, "Дева");
        m.put(ZodiacSign.LIBRA, "Весы");
        m.put(ZodiacSign.SCORPIO, "Скорпион");
        m.put(ZodiacSign.SAGITTARIUS, "Стрелец");
        m.put(ZodiacSign.CAPRICORN, "Козерог");
        m.put(ZodiacSign.AQUARIUS, "Водолей");
        m.put(ZodiacSign.PISCES, "Рыбы");
        return m;
    }

    private static Map<LunarPhase, String> buildPhase() {
        Map<LunarPhase, String> m = new EnumMap<>(LunarPhase.class);
        m.put(LunarPhase.NEW, "новолуние (зерно, замысел)");
        m.put(LunarPhase.WAXING, "растущая луна (рост, набор силы)");
        m.put(LunarPhase.FULL, "полнолуние (вершина, видимость)");
        m.put(LunarPhase.WANING, "убывающая луна (отпускание, завершение)");
        return m;
    }
}
