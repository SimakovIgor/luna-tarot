package com.lunatarot.backend.llm;

import com.lunatarot.backend.domain.model.TarotCardEntity;
import com.lunatarot.backend.domain.model.UserEntity;
import com.lunatarot.backend.domain.model.enums.Gender;
import com.lunatarot.backend.domain.model.enums.ReadingType;
import com.lunatarot.backend.domain.spread.Spread;
import com.lunatarot.backend.domain.spread.SpreadCatalog;
import com.lunatarot.backend.service.reading.DrawnCard;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Юнит-тест для двух статических промпт-билдеров в {@link ClaudeInterpreter}.
 * HTTP не дёргаем — собираем только текст.
 */
class ClaudePromptBuilderTest {

    private final SpreadCatalog catalog = new SpreadCatalog();

    @Test
    void system_prompt_for_three_card_lists_three_positions() {
        UserEntity user = baseUser();
        Spread spread = catalog.get(ReadingType.THREE_CARD);

        String prompt = ClaudeInterpreter.buildSystemPrompt(user, spread);

        assertThat(prompt).contains("Прошлое — Настоящее — Будущее");
        assertThat(prompt).contains("Прошлое");
        assertThat(prompt).contains("Настоящее");
        assertThat(prompt).contains("Будущее");
        assertThat(prompt).contains("Совет Луны");
        assertThat(prompt).contains("Игорь");
    }

    @Test
    void system_prompt_for_card_of_day_uses_short_structure() {
        UserEntity user = baseUser();
        Spread spread = catalog.get(ReadingType.CARD_OF_DAY);

        String prompt = ClaudeInterpreter.buildSystemPrompt(user, spread);

        assertThat(prompt).contains("«Карта дня»");
        assertThat(prompt).contains("2 коротких абзаца");
        assertThat(prompt).doesNotContain("Прошлое — Настоящее");
    }

    @Test
    void system_prompt_for_celtic_cross_describes_ten_positions() {
        UserEntity user = baseUser();
        Spread spread = catalog.get(ReadingType.CELTIC_CROSS);

        String prompt = ClaudeInterpreter.buildSystemPrompt(user, spread);

        assertThat(prompt).contains("Кельтский крест");
        for (String label : List.of("Суть", "Вызов", "Корень", "Прошлое", "Сознание",
                                    "Ближайшее будущее", "Спрашивающий", "Окружение",
                                    "Надежды и страхи", "Итог")) {
            assertThat(prompt).contains(label);
        }
    }

    @Test
    void user_prompt_for_three_card_lists_question_and_card_names() {
        UserEntity user = baseUser();
        Spread spread = catalog.get(ReadingType.THREE_CARD);
        List<DrawnCard> drawn = List.of(card("Маг"), card("Сила"), card("Звезда"));

        String prompt = ClaudeInterpreter.buildUserPrompt(
            new ReadingContext(user, spread, "что меня ждёт?", drawn)
        );

        assertThat(prompt).contains("что меня ждёт?");
        assertThat(prompt).contains("Маг", "Сила", "Звезда");
        assertThat(prompt).contains("[Прошлое]", "[Настоящее]", "[Будущее]");
    }

    @Test
    void user_prompt_for_card_of_day_skips_question_block() {
        UserEntity user = baseUser();
        Spread spread = catalog.get(ReadingType.CARD_OF_DAY);

        String prompt = ClaudeInterpreter.buildUserPrompt(
            new ReadingContext(user, spread, null, List.of(card("Дурак")))
        );

        assertThat(prompt).contains("Расклад: Карта дня");
        assertThat(prompt).contains("[Карта дня]");
        assertThat(prompt).contains("Дурак");
        assertThat(prompt).doesNotContain("Вопрос пользователя");
    }

    @Test
    void user_prompt_marks_reversed_card() {
        UserEntity user = baseUser();
        Spread spread = catalog.get(ReadingType.THREE_CARD);
        List<DrawnCard> drawn = List.of(
            card("Маг"),
            cardReversed("Сила"),
            card("Звезда")
        );

        String prompt = ClaudeInterpreter.buildUserPrompt(
            new ReadingContext(user, spread, "?", drawn)
        );

        assertThat(prompt).contains("Сила").contains("ПЕРЕВЁРНУТА");
    }

    private static UserEntity baseUser() {
        return UserEntity.builder()
            .tgUserId(1L)
            .name("Игорь")
            .gender(Gender.MALE)
            .build();
    }

    private static DrawnCard card(String name) {
        return new DrawnCard(buildCard(name), false);
    }

    private static DrawnCard cardReversed(String name) {
        return new DrawnCard(buildCard(name), true);
    }

    private static TarotCardEntity buildCard(String name) {
        return TarotCardEntity.builder()
            .id(1L)
            .numeral((short) 0)
            .nameRu(name)
            .nameEn(name)
            .keywords(List.of("k1", "k2"))
            .uprightMeaning("прямой " + name)
            .reversedMeaning("перевёрнутый " + name)
            .build();
    }
}
