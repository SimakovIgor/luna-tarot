package com.lunatarot.backend.service.horoscope;

import com.lunatarot.backend.domain.model.UserEntity;

import java.time.LocalDate;

/**
 * Источник текста ежедневного гороскопа. По умолчанию реализован StubHoroscopeGenerator
 * (без LLM); ClaudeHoroscopeGenerator активируется при luna.llm.provider=claude.
 */
public interface HoroscopeGenerator {

    String generate(UserEntity user, LocalDate date);
}
