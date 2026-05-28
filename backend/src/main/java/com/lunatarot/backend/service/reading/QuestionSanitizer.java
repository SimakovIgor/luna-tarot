package com.lunatarot.backend.service.reading;

/**
 * Чистит вопрос пользователя перед отправкой в LLM. Если вопрос — мусор
 * (пустой / очень короткий / повторяющийся один символ / абракадабра без
 * слов) — заменяет на нейтральную форму, чтобы Claude дал общую трактовку,
 * а не сочинял повод. Без этого «ооо» / «asdfgh» приводили к полному раскладу
 * с выдуманным контекстом.
 */
public final class QuestionSanitizer {

    /** Что подставить, если вопрос не похож на осмысленный. */
    static final String FALLBACK_GENERAL = "Общий расклад без конкретного вопроса — что важно увидеть сейчас.";

    private static final int MIN_MEANINGFUL_LENGTH = 8;
    private static final int MIN_UNIQUE_LETTERS = 3;

    private QuestionSanitizer() {
    }

    public static String sanitize(String raw) {
        if (raw == null) {
            return FALLBACK_GENERAL;
        }
        String trimmed = raw.strip();
        if (trimmed.isEmpty()) {
            return FALLBACK_GENERAL;
        }
        if (looksLikeGibberish(trimmed)) {
            return FALLBACK_GENERAL;
        }
        return trimmed;
    }

    /**
     * Эвристика «это мусор»:
     *  - совсем короткий ввод (< 8 символов),
     *  - в нём меньше {@value #MIN_UNIQUE_LETTERS} разных букв
     *    (например, «ооо», «ahhhhh», «zzzzz»),
     *  - вообще нет букв (только пунктуация/цифры).
     */
    static boolean looksLikeGibberish(String input) {
        int letterCount = 0;
        java.util.Set<Character> uniqueLetters = new java.util.HashSet<>();
        for (int i = 0; i < input.length(); i++) {
            char c = Character.toLowerCase(input.charAt(i));
            if (Character.isLetter(c)) {
                letterCount++;
                uniqueLetters.add(c);
            }
        }
        return letterCount == 0
            || input.length() < MIN_MEANINGFUL_LENGTH
            || uniqueLetters.size() < MIN_UNIQUE_LETTERS;
    }
}
