package com.lunatarot.backend.api.dto;

import com.lunatarot.backend.domain.model.enums.ReadingOutcome;
import com.lunatarot.backend.domain.model.enums.ReadingType;

import java.time.Instant;
import java.util.List;

public record ReadingResponse(
    long id,
    ReadingType type,
    String question,
    List<ReadingCardDto> cards,
    String interpretation,
    Instant createdAt,
    ReadingOutcome outcomeStatus,
    String outcomeNote,
    Instant outcomeRecordedAt
) {
}
