package com.lunatarot.backend.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ThreeCardRequest(
    @NotBlank @Size(min = 3, max = 500) String question
) {
}
