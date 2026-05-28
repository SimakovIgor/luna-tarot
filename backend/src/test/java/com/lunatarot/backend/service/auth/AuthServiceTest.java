package com.lunatarot.backend.service.auth;

import com.lunatarot.backend.config.LunaTelegramProperties;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class AuthServiceTest {

    private final LunaTelegramProperties props =
        new LunaTelegramProperties(true, "test-bot-token-xyz", "luna_bot", null);

    @Test
    void issued_token_validates_back_to_same_user_id() {
        AuthService service = new AuthService(props, Clock.systemUTC());

        AuthService.IssuedToken issued = service.issue(424_242L);

        assertThat(service.validate(issued.token())).contains(424_242L);
    }

    @Test
    void expired_token_is_rejected() {
        // выпустим токен в "прошлом" — Clock'ом смещаем системное время на 30 дней назад
        Clock past = Clock.fixed(Instant.now().minusSeconds(30L * 86_400L), ZoneOffset.UTC);
        AuthService issuer = new AuthService(props, past);
        AuthService.IssuedToken issued = issuer.issue(7L);

        AuthService current = new AuthService(props, Clock.systemUTC());
        Optional<Long> validated = current.validate(issued.token());

        assertThat(validated).isEmpty();
    }

    @Test
    void tampered_token_is_rejected() {
        AuthService service = new AuthService(props, Clock.systemUTC());
        String original = service.issue(1L).token();
        // подменим payload (первую часть до точки)
        String tampered = "AAAAAAAA" + original.substring(8);

        assertThat(service.validate(tampered)).isEmpty();
    }

    @Test
    void wrong_signature_is_rejected() {
        AuthService a = new AuthService(props, Clock.systemUTC());
        AuthService b = new AuthService(
            new LunaTelegramProperties(true, "different-token", "luna_bot", null),
            Clock.systemUTC()
        );

        String aToken = a.issue(11L).token();
        assertThat(b.validate(aToken)).isEmpty();
    }

    @Test
    void malformed_token_returns_empty() {
        AuthService service = new AuthService(props, Clock.systemUTC());

        assertThat(service.validate(null)).isEmpty();
        assertThat(service.validate("")).isEmpty();
        assertThat(service.validate("nodot")).isEmpty();
        assertThat(service.validate(".empty-payload")).isEmpty();
        assertThat(service.validate("payload.")).isEmpty();
    }
}
