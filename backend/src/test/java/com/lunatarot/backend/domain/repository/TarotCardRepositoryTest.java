package com.lunatarot.backend.domain.repository;

import com.lunatarot.backend.domain.model.TarotCardEntity;
import com.lunatarot.backend.domain.model.enums.Arcana;
import com.lunatarot.backend.it.BaseIT;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class TarotCardRepositoryTest extends BaseIT {

    @Autowired
    private TarotCardRepository tarotCardRepository;

    @Test
    void seed_loaded_all_22_major_arcana() {
        List<TarotCardEntity> majors = tarotCardRepository.findAllByArcana(Arcana.MAJOR);

        assertThat(majors).hasSize(22);
        assertThat(majors)
            .extracting(TarotCardEntity::getNumeral)
            .containsExactlyInAnyOrder(
                (short) 0, (short) 1, (short) 2, (short) 3, (short) 4,
                (short) 5, (short) 6, (short) 7, (short) 8, (short) 9,
                (short) 10, (short) 11, (short) 12, (short) 13, (short) 14,
                (short) 15, (short) 16, (short) 17, (short) 18, (short) 19,
                (short) 20, (short) 21
            );
    }

    @Test
    void each_seeded_card_has_three_keywords_and_meaning() {
        List<TarotCardEntity> majors = tarotCardRepository.findAllByArcana(Arcana.MAJOR);

        assertThat(majors).allSatisfy(card -> {
            assertThat(card.getNameRu()).isNotBlank();
            assertThat(card.getNameEn()).isNotBlank();
            assertThat(card.getKeywords()).hasSize(3);
            assertThat(card.getUprightMeaning()).isNotBlank();
        });
    }

    @Test
    void fool_card_has_expected_payload() {
        TarotCardEntity fool = tarotCardRepository.findAllByArcana(Arcana.MAJOR).stream()
            .filter(c -> c.getNumeral() == 0)
            .findFirst()
            .orElseThrow();

        assertThat(fool.getNameRu()).isEqualTo("Шут");
        assertThat(fool.getNameEn()).isEqualTo("The Fool");
        assertThat(fool.getKeywords()).contains("Начало");
    }
}
