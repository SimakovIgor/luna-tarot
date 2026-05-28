package com.lunatarot.backend.api.dto;

import com.lunatarot.backend.domain.model.enums.ZodiacSign;

import java.time.LocalDate;

public record HoroscopeResponse(
    LocalDate date,
    ZodiacSign zodiac,
    String text
) {
}
