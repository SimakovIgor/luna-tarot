package com.lunatarot.backend.service.reading;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class QuestionSanitizerTest {

    @Test
    void empty_or_null_falls_back() {
        assertThat(QuestionSanitizer.sanitize(null)).isEqualTo(QuestionSanitizer.FALLBACK_GENERAL);
        assertThat(QuestionSanitizer.sanitize("")).isEqualTo(QuestionSanitizer.FALLBACK_GENERAL);
        assertThat(QuestionSanitizer.sanitize("   ")).isEqualTo(QuestionSanitizer.FALLBACK_GENERAL);
    }

    @Test
    void repeating_character_is_gibberish() {
        assertThat(QuestionSanitizer.sanitize("ооо")).isEqualTo(QuestionSanitizer.FALLBACK_GENERAL);
        assertThat(QuestionSanitizer.sanitize("ahhhhh")).isEqualTo(QuestionSanitizer.FALLBACK_GENERAL);
        assertThat(QuestionSanitizer.sanitize("zzzzzz")).isEqualTo(QuestionSanitizer.FALLBACK_GENERAL);
    }

    @Test
    void too_short_is_gibberish() {
        assertThat(QuestionSanitizer.sanitize("люблю")).isEqualTo(QuestionSanitizer.FALLBACK_GENERAL);
        assertThat(QuestionSanitizer.sanitize("hi")).isEqualTo(QuestionSanitizer.FALLBACK_GENERAL);
    }

    @Test
    void no_letters_is_gibberish() {
        assertThat(QuestionSanitizer.sanitize("???!!!??")).isEqualTo(QuestionSanitizer.FALLBACK_GENERAL);
        assertThat(QuestionSanitizer.sanitize("12345678")).isEqualTo(QuestionSanitizer.FALLBACK_GENERAL);
    }

    @Test
    void normal_question_passes_through() {
        String q = "Стоит ли мне принять предложение о работе?";
        assertThat(QuestionSanitizer.sanitize(q)).isEqualTo(q);
    }

    @Test
    void english_random_letters_is_gibberish() {
        // Менее 3 уникальных букв в коротком вводе — мусор. Длинный «asdfghjkl» уже не отсеется,
        // но это уже похоже на попытку что-то сказать — пусть Claude отвечает.
        assertThat(QuestionSanitizer.sanitize("asdf")).isEqualTo(QuestionSanitizer.FALLBACK_GENERAL);
    }

    @Test
    void trims_whitespace() {
        assertThat(QuestionSanitizer.sanitize("  Что меня ждёт завтра?  "))
            .isEqualTo("Что меня ждёт завтра?");
    }
}
