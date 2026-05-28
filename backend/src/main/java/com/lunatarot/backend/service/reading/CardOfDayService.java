package com.lunatarot.backend.service.reading;

import com.lunatarot.backend.domain.model.ReadingCardEntity;
import com.lunatarot.backend.domain.model.ReadingCardId;
import com.lunatarot.backend.domain.model.ReadingEntity;
import com.lunatarot.backend.domain.model.UserEntity;
import com.lunatarot.backend.domain.model.enums.ReadingType;
import com.lunatarot.backend.domain.repository.ReadingRepository;
import com.lunatarot.backend.domain.spread.SpreadCatalog;
import com.lunatarot.backend.llm.ReadingContext;
import com.lunatarot.backend.llm.TarotInterpreter;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

/**
 * Карта дня — детерминированная для пары (user, дата): одна карта в день, всегда upright.
 * Если расклад типа CARD_OF_DAY за сегодня уже создан — возвращаем его (idempotent).
 */
@Service
public class CardOfDayService {

    private final SpreadCatalog spreadCatalog;
    private final CardDrawService cardDrawService;
    private final TarotInterpreter interpreter;
    private final ReadingRepository readingRepository;
    private final Clock clock;

    public CardOfDayService(SpreadCatalog spreadCatalog,
                            CardDrawService cardDrawService,
                            TarotInterpreter interpreter,
                            ReadingRepository readingRepository,
                            Clock clock) {
        this.spreadCatalog = spreadCatalog;
        this.cardDrawService = cardDrawService;
        this.interpreter = interpreter;
        this.readingRepository = readingRepository;
        this.clock = clock;
    }

    @Transactional
    public ReadingEntity getOrCreateCardOfDay(UserEntity user) {
        LocalDate today = LocalDate.now(clock);
        Instant dayStart = today.atStartOfDay(ZoneOffset.UTC).toInstant();
        return findExisting(user.getId(), dayStart).orElseGet(() -> create(user, today));
    }

    private Optional<ReadingEntity> findExisting(Long userId, Instant dayStart) {
        List<ReadingEntity> hits = readingRepository.findOfTypeSince(
            userId, ReadingType.CARD_OF_DAY, dayStart, PageRequest.of(0, 1)
        );
        return hits.isEmpty() ? Optional.empty() : Optional.of(hits.get(0));
    }

    private ReadingEntity create(UserEntity user, LocalDate today) {
        DrawnCard drawn = cardDrawService.drawCardOfDay(user.getId(), today);
        String interpretation = interpreter.interpret(
            new ReadingContext(user, spreadCatalog.get(ReadingType.CARD_OF_DAY), null, List.of(drawn))
        );

        ReadingEntity reading = ReadingEntity.builder()
            .user(user)
            .type(ReadingType.CARD_OF_DAY)
            .question(null)
            .interpretation(interpretation)
            .build();
        ReadingCardId pk = new ReadingCardId();
        pk.setPosition((short) 0);
        reading.getCards().add(ReadingCardEntity.builder()
            .id(pk).reading(reading).card(drawn.card()).reversed(drawn.reversed()).build());
        return readingRepository.saveAndFlush(reading);
    }
}
