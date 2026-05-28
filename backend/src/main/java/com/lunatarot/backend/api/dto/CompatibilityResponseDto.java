package com.lunatarot.backend.api.dto;

import com.lunatarot.backend.domain.model.enums.ZodiacSign;

public record CompatibilityResponseDto(
    ZodiacSign myZodiac,
    ZodiacSign partnerZodiac,
    String partnerName,
    int score,
    String text
) {
}
