package com.lunatarot.backend.service.reading;

import com.lunatarot.backend.domain.model.TarotCardEntity;

/**
 * Карта, выпавшая в раскладе. Кроме самой карты содержит положение —
 * прямое (upright) или перевёрнутое (reversed). Перевёрнутое = тень/искажение смысла.
 */
public record DrawnCard(TarotCardEntity card, boolean reversed) {

    public String activeMeaning() {
        if (reversed && card.getReversedMeaning() != null && !card.getReversedMeaning().isBlank()) {
            return card.getReversedMeaning();
        }
        return card.getUprightMeaning();
    }
}
