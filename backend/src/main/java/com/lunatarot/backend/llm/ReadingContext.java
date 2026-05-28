package com.lunatarot.backend.llm;

import com.lunatarot.backend.domain.model.UserEntity;
import com.lunatarot.backend.domain.spread.Spread;
import com.lunatarot.backend.service.reading.DrawnCard;

import java.util.List;

/**
 * Контекст для генерации интерпретации. Snapshot без зависимостей от Spring/JPA-сессии.
 *
 * @param user     пользователь со своим эзо-профилем
 * @param spread   метаданные расклада (тип, позиции, лейблы) — единственный источник истины
 *                 для интерпретатора, никаких хардкодов по типу
 * @param question вопрос пользователя (для CARD_OF_DAY = null)
 * @param cards    выпавшие карты в порядке позиций; каждая знает, прямая она или перевёрнутая
 */
public record ReadingContext(
    UserEntity user,
    Spread spread,
    String question,
    List<DrawnCard> cards
) {
}
