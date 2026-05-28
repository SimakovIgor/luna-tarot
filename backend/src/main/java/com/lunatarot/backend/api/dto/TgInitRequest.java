package com.lunatarot.backend.api.dto;

import jakarta.validation.constraints.NotBlank;

public record TgInitRequest(@NotBlank String initData) {
}
