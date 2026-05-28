package com.lunatarot.backend.domain.repository;

import com.lunatarot.backend.domain.model.ReadingCardEntity;
import com.lunatarot.backend.domain.model.ReadingCardId;
import com.lunatarot.backend.domain.model.ReadingEntity;
import com.lunatarot.backend.domain.model.TarotCardEntity;
import com.lunatarot.backend.domain.model.UserEntity;
import com.lunatarot.backend.domain.model.enums.Arcana;
import com.lunatarot.backend.domain.model.enums.ReadingType;
import com.lunatarot.backend.it.BaseIT;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ReadingRepositoryTest extends BaseIT {

    @Autowired
    private ReadingRepository readingRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TarotCardRepository tarotCardRepository;

    @Test
    void save_three_card_reading_with_positions() {
        UserEntity user = userRepository.save(UserEntity.builder()
            .tgUserId(42L)
            .name("Алиса")
            .build());

        List<TarotCardEntity> majors = tarotCardRepository.findAllByArcana(Arcana.MAJOR);

        ReadingEntity reading = ReadingEntity.builder()
            .user(user)
            .type(ReadingType.THREE_CARD)
            .question("Что меня ждёт?")
            .interpretation("Карты говорят о пути.")
            .build();

        reading.getCards().add(buildCard(reading, (short) 0, majors.get(17)));
        reading.getCards().add(buildCard(reading, (short) 1, majors.get(5)));
        reading.getCards().add(buildCard(reading, (short) 2, majors.get(16)));

        ReadingEntity saved = readingRepository.saveAndFlush(reading);

        List<ReadingEntity> history = readingRepository
            .findRecentByUserId(user.getId(), PageRequest.of(0, 10));

        assertThat(history).hasSize(1);
        ReadingEntity loaded = history.get(0);
        assertThat(loaded.getId()).isEqualTo(saved.getId());
        assertThat(loaded.getType()).isEqualTo(ReadingType.THREE_CARD);
        assertThat(loaded.getCards()).hasSize(3);
        assertThat(loaded.getCards())
            .extracting(rc -> rc.getId().getPosition())
            .containsExactly((short) 0, (short) 1, (short) 2);
    }

    private static ReadingCardEntity buildCard(ReadingEntity reading, short position, TarotCardEntity card) {
        ReadingCardId rcId = new ReadingCardId();
        rcId.setPosition(position);
        return ReadingCardEntity.builder()
            .id(rcId)
            .reading(reading)
            .card(card)
            .build();
    }
}
