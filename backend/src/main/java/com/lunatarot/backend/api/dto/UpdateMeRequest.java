package com.lunatarot.backend.api.dto;

import com.lunatarot.backend.domain.model.enums.Gender;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record UpdateMeRequest(
    @NotBlank @Size(min = 2, max = 60) String name,
    @NotNull Gender gender,
    @NotNull @Past LocalDate birthDate
) {
}
