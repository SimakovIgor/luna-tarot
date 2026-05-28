package com.lunatarot.backend.service.compatibility;

import com.lunatarot.backend.domain.model.enums.ZodiacSign;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.Map;

/**
 * Заглушка: текст по сочетанию элементов знаков. Без LLM — для dev/MVP.
 * Каждая стихия описывает сочетания через отдельный метод, чтобы не плодить
 * один cyclomatic-monstr.
 */
@Component
@ConditionalOnProperty(prefix = "luna.llm", name = "provider", havingValue = "stub", matchIfMissing = true)
public class StubCompatibilityGenerator implements CompatibilityGenerator {

    /** Маппинг знак→стихия. Через EnumMap, чтобы не плодить switch с CyclomaticComplexity. */
    private static final Map<ZodiacSign, Element> ELEMENTS = buildElements();

    private static Map<ZodiacSign, Element> buildElements() {
        Map<ZodiacSign, Element> m = new EnumMap<>(ZodiacSign.class);
        m.put(ZodiacSign.ARIES, Element.FIRE);
        m.put(ZodiacSign.LEO, Element.FIRE);
        m.put(ZodiacSign.SAGITTARIUS, Element.FIRE);
        m.put(ZodiacSign.TAURUS, Element.EARTH);
        m.put(ZodiacSign.VIRGO, Element.EARTH);
        m.put(ZodiacSign.CAPRICORN, Element.EARTH);
        m.put(ZodiacSign.GEMINI, Element.AIR);
        m.put(ZodiacSign.LIBRA, Element.AIR);
        m.put(ZodiacSign.AQUARIUS, Element.AIR);
        m.put(ZodiacSign.CANCER, Element.WATER);
        m.put(ZodiacSign.SCORPIO, Element.WATER);
        m.put(ZodiacSign.PISCES, Element.WATER);
        return m;
    }

    @Override
    public CompatibilityOutput generate(String myName, ZodiacSign myZodiac, Integer myAge,
                                        String partnerName, ZodiacSign partnerZodiac, Integer partnerAge) {
        // Возраст в stub-генераторе не используется — текст шаблонный, без age-логики.
        // Сигнатура единая с Claude, чтобы можно было свободно переключаться по
        // luna.llm.provider.
        Element mine = elementOf(myZodiac);
        Element other = elementOf(partnerZodiac);
        String chemistry = describeChemistry(mine, other);
        int score = scoreFor(mine, other);
        String text = myName + ", вот что говорит Луна о вашей паре с " + partnerName + ":\n\n"
            + chemistry + "\n\n"
            + "✦ Совет Луны: помните, что совместимость — не приговор, а почва. "
            + "Что вырастет — зависит от того, как будете возделывать.";
        return new CompatibilityOutput(score, text);
    }

    /** Базовая оценка совместимости по стихиям. Используется и как fallback в Claude-генераторе. */
    static int scoreFor(Element a, Element b) {
        if (a == b) {
            return 85;
        }
        // Сводим к симметричной паре (упорядочиваем по ordinal), затем простой switch.
        Element first = a.ordinal() <= b.ordinal() ? a : b;
        Element second = a.ordinal() <= b.ordinal() ? b : a;
        return switch (first) {
            case FIRE -> firePairScore(second);
            case EARTH -> earthPairScore(second);
            case AIR -> airPairScore(second);
            case WATER -> 60;
        };
    }

    private static int firePairScore(Element other) {
        return switch (other) {
            case AIR -> 80;
            case WATER -> 45;
            default -> 60;
        };
    }

    private static int earthPairScore(Element other) {
        return switch (other) {
            case WATER -> 80;
            case AIR -> 50;
            default -> 60;
        };
    }

    private static int airPairScore(Element other) {
        // FIRE/EARTH уже отсеяны (они идут первыми по ordinal); остаётся WATER (нейтрально).
        return other == Element.WATER ? 55 : 60;
    }

    static Element classify(ZodiacSign sign) {
        return ELEMENTS.get(sign);
    }

    private static String describeChemistry(Element a, Element b) {
        if (a == b) {
            return sameElement(a);
        }
        return switch (a) {
            case FIRE -> fireWith(b);
            case EARTH -> earthWith(b);
            case AIR -> airWith(b);
            case WATER -> waterWith(b);
        };
    }

    private static String sameElement(Element e) {
        return switch (e) {
            case FIRE -> "Оба огонь — стремительно и страстно. Союз яркий, но требует осторожности: "
                + "одного движения слишком много и пламя обжигает.";
            case EARTH -> "Оба земля — надёжно и обстоятельно. Союз медленный, но крепкий, "
                + "как дом, построенный на скале.";
            case AIR -> "Оба воздух — лёгко и разговорчиво. Союз живой, переменчивый, "
                + "ему важна общая мысль больше чем общий быт.";
            case WATER -> "Оба вода — глубоко и чувственно. Союз эмоциональный; "
                + "иногда вы тонете друг в друге — это и сила, и риск.";
        };
    }

    private static String fireWith(Element other) {
        return switch (other) {
            case AIR -> "Огонь и воздух — воздух раздувает пламя. "
                + "Союз вдохновляющий, полный движения и идей.";
            case EARTH -> "Огонь и земля — пламя обжигает почву, земля душит пламя. "
                + "Союз учит терпению и границам.";
            case WATER -> "Огонь и вода — две стихии в постоянном диалоге. "
                + "Союз эмоционально насыщенный, либо испаряется, либо рождает пар, что движет паровозы.";
            case FIRE -> "";
        };
    }

    private static String earthWith(Element other) {
        return switch (other) {
            case WATER -> "Земля и вода — благодатное сочетание. "
                + "Союз плодородный, спокойный, растущий.";
            case AIR -> "Земля и воздух — земле тяжело уловить лёгкость воздуха. "
                + "Союз учит каждого выходить за свои границы.";
            case FIRE -> "Земля и огонь — огонь обжигает, земля сдерживает. "
                + "Союз требует терпения, но даёт надёжность.";
            case EARTH -> "";
        };
    }

    private static String airWith(Element other) {
        return switch (other) {
            case FIRE -> "Воздух и огонь — воздух питает пламя. "
                + "Союз живой, динамичный, полный вдохновения.";
            case WATER -> "Воздух и вода — вода тяжела для воздуха, воздух непостоянен для воды. "
                + "Союз учит каждого слышать иной язык.";
            case EARTH -> "Воздух и земля — лёгкое встречает основательное. "
                + "Союз учит каждого выходить за свои границы.";
            case AIR -> "";
        };
    }

    private static String waterWith(Element other) {
        return switch (other) {
            case EARTH -> "Вода и земля — вода питает землю. "
                + "Союз благодатный, спокойный, плодородный.";
            case FIRE -> "Вода и огонь — две сильные стихии. "
                + "Союз эмоционально живой, либо испаряется, либо рождает пар, что движет паровозы.";
            case AIR -> "Вода и воздух — каждый говорит своим языком. "
                + "Союз учит обоих слышать неочевидное.";
            case WATER -> "";
        };
    }

    private static Element elementOf(ZodiacSign sign) {
        return ELEMENTS.get(sign);
    }

    enum Element {
        FIRE, EARTH, AIR, WATER
    }
}
