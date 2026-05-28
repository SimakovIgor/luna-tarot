package com.lunatarot.backend.api.dto;

import com.lunatarot.backend.domain.model.enums.BotConversationState;
import com.lunatarot.backend.domain.model.enums.Gender;
import com.lunatarot.backend.domain.model.enums.LunarPhase;
import com.lunatarot.backend.domain.model.enums.ZodiacSign;

import java.time.LocalDate;

public record MeResponse(
    long tgUserId,
    String name,
    Gender gender,
    LocalDate birthDate,
    ZodiacSign zodiac,
    Short lifePathNumber,
    LunarPhase lunarPhase,
    BotConversationState conversationState
) {
}
