package com.lunatarot.backend.service.reading;

import com.lunatarot.backend.domain.model.ReadingCardEntity;
import com.lunatarot.backend.domain.model.ReadingCardId;
import com.lunatarot.backend.domain.model.ReadingEntity;
import com.lunatarot.backend.domain.model.UserEntity;
import com.lunatarot.backend.domain.model.enums.ReadingType;
import com.lunatarot.backend.domain.repository.ReadingRepository;
import com.lunatarot.backend.domain.spread.Spread;
import com.lunatarot.backend.domain.spread.SpreadCatalog;
import com.lunatarot.backend.llm.ReadingContext;
import com.lunatarot.backend.llm.TarotInterpreter;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Создаёт расклад любого типа: тянет {@code spread.cardCount()} карт (с шансом перевёрнутости),
 * вызывает интерпретатор, сохраняет в БД.
 */
@Service
public class ReadingService {

    private final SpreadCatalog spreadCatalog;
    private final CardDrawService cardDrawService;
    private final TarotInterpreter interpreter;
    private final ReadingRepository readingRepository;

    public ReadingService(SpreadCatalog spreadCatalog,
                          CardDrawService cardDrawService,
                          TarotInterpreter interpreter,
                          ReadingRepository readingRepository) {
        this.spreadCatalog = spreadCatalog;
        this.cardDrawService = cardDrawService;
        this.interpreter = interpreter;
        this.readingRepository = readingRepository;
    }

    @Transactional
    public ReadingEntity createReading(UserEntity user, ReadingType type, String rawQuestion) {
        Spread spread = spreadCatalog.get(type);
        // Чистим мусор (пустой/«ооо»/абракадабра) → нейтральный общий вопрос,
        // чтобы Claude не сочинял повод вокруг бессмысленного ввода.
        String question = QuestionSanitizer.sanitize(rawQuestion);
        List<DrawnCard> drawn = cardDrawService.drawWithReversal(spread.cardCount());
        String interpretation = interpreter.interpret(
            new ReadingContext(user, spread, question, drawn)
        );

        ReadingEntity reading = ReadingEntity.builder()
            .user(user)
            .type(spread.type())
            .question(question)
            .interpretation(interpretation)
            .build();
        for (int i = 0; i < drawn.size(); i++) {
            reading.getCards().add(buildCard(reading, (short) i, drawn.get(i)));
        }
        return readingRepository.saveAndFlush(reading);
    }

    @Transactional
    public ReadingEntity createThreeCardReading(UserEntity user, String question) {
        return createReading(user, ReadingType.THREE_CARD, question);
    }

    private static ReadingCardEntity buildCard(ReadingEntity reading, short position, DrawnCard drawn) {
        ReadingCardId pk = new ReadingCardId();
        pk.setPosition(position);
        return ReadingCardEntity.builder()
            .id(pk)
            .reading(reading)
            .card(drawn.card())
            .reversed(drawn.reversed())
            .build();
    }
}
