package com.lunatarot.backend.admin.dto;

import java.util.List;

public record AdminStatsResponse(
    AdminTotals totals,
    List<AdminDailyRow> byDay,
    List<AdminReadingTypeCount> readingsByType
) {
}
