package com.lunatarot.backend.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record CompatibilityRequestDto(
    @NotBlank @Size(min = 1, max = 64) String partnerName,
    @NotNull LocalDate partnerBirthDate
) {
}
