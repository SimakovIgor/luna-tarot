package com.lunatarot.backend.it;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Shared Testcontainers setup for integration tests.
 *
 * Worktree-isolated DB name (hash of user.dir): параллельные прогоны из разных worktrees
 * не пересекаются, но повторный прогон из той же директории переиспользует Flyway-схему.
 * Контейнер один на машину благодаря {@code withReuse(true)} +
 * {@code testcontainers.reuse.enable=true} в {@code ~/.testcontainers.properties}.
 */
@TestConfiguration(proxyBeanMethods = false)
public class TestConfig {

    private static final String DB_NAME = "luna_test_"
        + String.format("%06x", Math.abs(System.getProperty("user.dir").hashCode()) % 0x100_0000);

    @SuppressWarnings("resource")
    private static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
        .withDatabaseName(DB_NAME)
        .withUsername("luna")
        .withPassword("luna")
        .withReuse(true);

    static {
        POSTGRES.start();
    }

    @Bean
    @ServiceConnection
    PostgreSQLContainer<?> postgresContainer() {
        return POSTGRES;
    }
}
