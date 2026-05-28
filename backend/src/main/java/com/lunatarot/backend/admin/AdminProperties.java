package com.lunatarot.backend.admin;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Конфигурация админ-панели. Считывается из {@code luna.admin.*}.
 * Если username/password пустые — фильтр блокирует все запросы на {@code /admin/**}.
 */
@ConfigurationProperties(prefix = "luna.admin")
public record AdminProperties(String username, String password) {

    public boolean isConfigured() {
        return username != null && !username.isBlank()
            && password != null && !password.isBlank();
    }
}
