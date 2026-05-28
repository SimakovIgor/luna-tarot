package com.lunatarot.backend.service.compatibility;

/**
 * То, что возвращает генератор совместимости: процент совместимости 1–100
 * и описательный текст. Stub считает процент по стихиям, Claude — просит модель.
 */
public record CompatibilityOutput(int score, String text) {

    public CompatibilityOutput {
        if (score < 1 || score > 100) {
            throw new IllegalArgumentException("score must be in [1,100], got " + score);
        }
    }
}
