package com.lunatarot.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/**
 * Конфигурация Anthropic Claude API. Считывается из {@code luna.llm.*}.
 */
@ConfigurationProperties(prefix = "luna.llm")
public record AnthropicProperties(
    String provider,
    String anthropicApiKey,
    String anthropicBaseUrl,
    String model,
    int maxTokens,
    Duration timeout
) {

    public AnthropicProperties {
        if (anthropicBaseUrl == null || anthropicBaseUrl.isBlank()) {
            anthropicBaseUrl = "https://api.anthropic.com";
        }
        if (model == null || model.isBlank()) {
            model = "claude-haiku-4-5-20251001";
        }
        if (maxTokens <= 0) {
            maxTokens = 1024;
        }
        if (timeout == null) {
            timeout = Duration.ofSeconds(30);
        }
    }
}
