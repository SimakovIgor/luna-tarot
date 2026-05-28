package com.lunatarot.backend.admin.dto;

public record AdminTotals(
    long users,
    long usersReady,
    long readings,
    long horoscopes
) {
}
