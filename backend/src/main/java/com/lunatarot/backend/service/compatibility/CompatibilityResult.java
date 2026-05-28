package com.lunatarot.backend.service.compatibility;

import com.lunatarot.backend.domain.model.enums.ZodiacSign;

/**
 * Результат расчёта совместимости.
 *
 * @param myZodiac      знак спрашивающего
 * @param partnerZodiac знак партнёра (по введённой дате)
 * @param partnerName   имя как ввёл юзер (для встраивания в текст и UI)
 * @param score         процент совместимости 1..100 — для шкалы в UI
 * @param text          интерпретация совместимости
 */
public record CompatibilityResult(
    ZodiacSign myZodiac,
    ZodiacSign partnerZodiac,
    String partnerName,
    int score,
    String text
) {
}
