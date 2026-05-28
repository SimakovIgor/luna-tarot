package com.lunatarot.backend.domain.spread;

import com.lunatarot.backend.domain.model.enums.ReadingType;

import java.util.List;

/**
 * Метаданные расклада: какому {@link ReadingType} соответствует, как называется,
 * сколько и каких позиций имеет. Промпт-движок и UI берут layout отсюда — никаких
 * хардкодов «3 карты / прошлое-настоящее-будущее» в реализациях быть не должно.
 *
 * @param type        дискриминатор, идёт в {@code readings.type}
 * @param displayName имя спреда (для системного промпта и UI)
 * @param shortHint   короткое описание под капотом entry-карточки на хабе
 * @param positions   позиции в порядке выкладки; их размер задаёт число карт
 */
public record Spread(
    ReadingType type,
    String displayName,
    String shortHint,
    List<SpreadPosition> positions
) {
    public int cardCount() {
        return positions.size();
    }
}
