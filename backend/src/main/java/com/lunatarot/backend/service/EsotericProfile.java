package com.lunatarot.backend.service;

import com.lunatarot.backend.domain.model.enums.LunarPhase;
import com.lunatarot.backend.domain.model.enums.ZodiacSign;

public record EsotericProfile(ZodiacSign zodiac, short lifePathNumber, LunarPhase lunarPhase) {
}
