package com.lunatarot.backend.api.dto;

/**
 * Карта в раскладе: сама карта + положение (прямое / перевёрнутое).
 * reversed=true означает, что лицо повёрнуто на 180°, и в трактовке используется reversedMeaning.
 */
public record ReadingCardDto(TarotCardDto card, boolean reversed) {
}
