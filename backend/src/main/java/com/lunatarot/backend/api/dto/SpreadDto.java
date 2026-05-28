package com.lunatarot.backend.api.dto;

import com.lunatarot.backend.domain.model.enums.ReadingType;
import com.lunatarot.backend.domain.spread.Spread;
import com.lunatarot.backend.domain.spread.SpreadPosition;

import java.util.List;

/**
 * Описание расклада для фронта: тип, имя, число карт, лейблы позиций.
 * Геометрия layout-а остаётся на фронте (это чисто UI-данные).
 */
public record SpreadDto(
    ReadingType type,
    String displayName,
    String shortHint,
    int cardCount,
    List<PositionDto> positions
) {
    public static SpreadDto from(Spread spread) {
        List<PositionDto> positions = spread.positions().stream()
            .map(SpreadDto::toPositionDto)
            .toList();
        return new SpreadDto(
            spread.type(),
            spread.displayName(),
            spread.shortHint(),
            spread.cardCount(),
            positions
        );
    }

    private static PositionDto toPositionDto(SpreadPosition pos) {
        return new PositionDto(pos.index(), pos.label());
    }

    public record PositionDto(int index, String label) {
    }
}
