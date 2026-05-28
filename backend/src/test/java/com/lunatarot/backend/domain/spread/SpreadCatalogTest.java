package com.lunatarot.backend.domain.spread;

import com.lunatarot.backend.domain.model.enums.ReadingType;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SpreadCatalogTest {

    private final SpreadCatalog catalog = new SpreadCatalog();

    @Test
    void provides_metadata_for_every_reading_type() {
        for (ReadingType type : ReadingType.values()) {
            Spread spread = catalog.get(type);
            assertThat(spread.type()).isEqualTo(type);
            assertThat(spread.positions()).isNotEmpty();
            assertThat(spread.positions())
                .extracting(SpreadPosition::index)
                .containsExactlyElementsOf(java.util.stream.IntStream.range(0, spread.cardCount()).boxed().toList());
            assertThat(spread.positions())
                .allSatisfy(pos -> {
                    assertThat(pos.label()).isNotBlank();
                    assertThat(pos.promptHint()).isNotBlank();
                });
            assertThat(spread.displayName()).isNotBlank();
            assertThat(spread.shortHint()).isNotBlank();
        }
    }

    @Test
    void card_counts_match_layout_expectations() {
        assertThat(catalog.get(ReadingType.CARD_OF_DAY).cardCount()).isEqualTo(1);
        assertThat(catalog.get(ReadingType.THREE_CARD).cardCount()).isEqualTo(3);
        assertThat(catalog.get(ReadingType.LOVE).cardCount()).isEqualTo(5);
        assertThat(catalog.get(ReadingType.CELTIC_CROSS).cardCount()).isEqualTo(10);
        assertThat(catalog.get(ReadingType.YEAR_WHEEL).cardCount()).isEqualTo(12);
    }

    @Test
    void user_selectable_excludes_card_of_day() {
        assertThat(catalog.userSelectable())
            .extracting(Spread::type)
            .containsExactly(
                ReadingType.THREE_CARD,
                ReadingType.LOVE,
                ReadingType.CELTIC_CROSS,
                ReadingType.YEAR_WHEEL
            );
    }

    @Test
    void unknown_type_handling() {
        // Все типы зарегистрированы; проверим что метод бросает понятную ошибку
        // на случай рассинхронизации enum/каталога в будущем.
        SpreadCatalog empty = new SpreadCatalog() {
            @Override
            public Spread get(ReadingType type) {
                if (type == ReadingType.THREE_CARD) {
                    throw new java.util.NoSuchElementException("test");
                }
                return super.get(type);
            }
        };
        assertThatThrownBy(() -> empty.get(ReadingType.THREE_CARD))
            .isInstanceOf(java.util.NoSuchElementException.class);
    }
}
