package com.lunatarot.backend.service.onboarding;

import com.lunatarot.backend.domain.model.enums.Gender;

/**
 * Утилиты для согласования родов в текстах Luna.
 * Для UNSPECIFIED — нейтральные/«через слэш» формы.
 */
public final class RussianGrammar {

    private RussianGrammar() {
    }

    /** "рад" / "рада" / "рад(а)" */
    public static String gladToMeet(Gender gender) {
        return switch (gender) {
            case MALE -> "рад";
            case FEMALE -> "рада";
            case UNSPECIFIED -> "рад(а)";
        };
    }

    /** "родился" / "родилась" / "родился(-ась)" */
    public static String wasBorn(Gender gender) {
        return switch (gender) {
            case MALE -> "родился";
            case FEMALE -> "родилась";
            case UNSPECIFIED -> "родился(-ась)";
        };
    }

    /** "готов" / "готова" / "готов(а)" */
    public static String ready(Gender gender) {
        return switch (gender) {
            case MALE -> "готов";
            case FEMALE -> "готова";
            case UNSPECIFIED -> "готов(а)";
        };
    }

    /** Для системного промпта Claude: словесное обозначение пола. */
    public static String describeForLlm(Gender gender) {
        return switch (gender) {
            case MALE -> "мужчина";
            case FEMALE -> "женщина";
            case UNSPECIFIED -> "пол не указан";
        };
    }
}
