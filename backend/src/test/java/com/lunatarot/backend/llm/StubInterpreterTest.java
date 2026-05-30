package com.lunatarot.backend.llm;

import com.lunatarot.backend.domain.model.TarotCardEntity;
import com.lunatarot.backend.domain.model.UserEntity;
import com.lunatarot.backend.domain.model.enums.Gender;
import com.lunatarot.backend.domain.model.enums.ReadingType;
import com.lunatarot.backend.domain.spread.SpreadCatalog;
import com.lunatarot.backend.service.reading.DrawnCard;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Юнит-тест StubInterpreter — Spring не нужен. Проверяет, что:
 *  - для CARD_OF_DAY выходит короткий формат «🌙 …»,
 *  - для остальных спредов формат «✦ Позиция — Карта» по каждой позиции + Совет Luna,
 *  - перевёрнутые карты отмечаются «(перевёрнута)».
 */
class StubInterpreterTest {

    private final SpreadCatalog catalog = new SpreadCatalog();
    private final StubInterpreter interpreter = new StubInterpreter();

    @Test
    void card_of_day_uses_short_format() {
        UserEntity user = user("Игорь", Gender.MALE);
        var drawn = List.of(card("Жрица", false));

        String text = interpreter.interpret(new ReadingContext(
            user, catalog.get(ReadingType.CARD_OF_DAY), null, drawn
        ));

        assertThat(text).startsWith("🌙").contains("Жрица").contains("Игорь");
        assertThat(text).doesNotContain("Совет Luna");
    }

    @Test
    void three_card_has_three_positions_and_advice() {
        UserEntity user = user("Алиса", Gender.FEMALE);
        var drawn = List.of(
            card("Маг", false),
            card("Сила", true),
            card("Звезда", false)
        );

        String text = interpreter.interpret(new ReadingContext(
            user, catalog.get(ReadingType.THREE_CARD), "вопрос?", drawn
        ));

        assertThat(text).contains("Прошлое", "Настоящее", "Будущее");
        assertThat(text).contains("Маг", "Сила", "Звезда");
        assertThat(text).contains("(перевёрнута)");
        assertThat(text).contains("Совет Luna");
    }

    @Test
    void love_spread_uses_love_position_labels() {
        UserEntity user = user("Маша", Gender.FEMALE);
        List<DrawnCard> drawn = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            drawn.add(card("Карта" + i, false));
        }

        String text = interpreter.interpret(new ReadingContext(
            user, catalog.get(ReadingType.LOVE), "что между нами?", drawn
        ));

        assertThat(text).contains("Я", "Партнёр", "Связь", "Препятствие", "Исход");
        assertThat(text).contains("О любви");
    }

    private static UserEntity user(String name, Gender gender) {
        return UserEntity.builder().tgUserId(1L).name(name).gender(gender).build();
    }

    private static DrawnCard card(String name, boolean reversed) {
        TarotCardEntity card = TarotCardEntity.builder()
            .id(1L)
            .numeral((short) 0)
            .nameRu(name)
            .nameEn(name)
            .keywords(List.of("k1", "k2"))
            .uprightMeaning("прямой смысл " + name)
            .reversedMeaning("перевёрнутый смысл " + name)
            .build();
        return new DrawnCard(card, reversed);
    }
}
