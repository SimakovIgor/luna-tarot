package com.lunatarot.backend.service.compatibility;

import com.lunatarot.backend.domain.model.enums.ZodiacSign;

/**
 * Генератор текста совместимости. Реализаций две: Stub (без LLM) и Claude.
 * Переключение через luna.llm.provider.
 */
public interface CompatibilityGenerator {

    /**
     * @param myAge      возраст спрашивающего; null если ДР не указана.
     *                   Передаётся в промпт, чтобы Claude учитывал, что 40+ и 18-20
     *                   живут разными ритмами — но это не повод занижать score
     *                   механически.
     * @param partnerAge возраст партнёра. Контроллер уже отсёк случаи < 16 —
     *                   сюда такие не доходят.
     */
    CompatibilityOutput generate(String myName, ZodiacSign myZodiac, Integer myAge,
                                 String partnerName, ZodiacSign partnerZodiac, Integer partnerAge);
}
