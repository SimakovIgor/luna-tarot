package com.lunatarot.backend.api.dto;

public record AuthResponse(String token, long expiresAtEpochSec) {
}
