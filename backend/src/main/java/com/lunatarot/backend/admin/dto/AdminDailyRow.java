package com.lunatarot.backend.admin.dto;

import java.time.LocalDate;

public record AdminDailyRow(
    LocalDate date,
    long newUsers,
    long readings,
    long activeUsers
) {
}
