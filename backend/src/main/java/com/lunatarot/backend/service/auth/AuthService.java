package com.lunatarot.backend.service.auth;

import com.lunatarot.backend.config.LunaTelegramProperties;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Duration;
import java.util.Base64;
import java.util.Optional;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * Stateless session token: {@code base64(userId.expiryEpochSec).base64(hmac)}.
 *
 * Подпись — HMAC-SHA256 на bot-токене (он у нас есть; отдельного JWT-секрета не заводим).
 * Срок жизни — 7 дней. При истечении клиент должен заново вызвать /api/auth/tg-init.
 */
@Service
public class AuthService {

    private static final String HMAC_ALGO = "HmacSHA256";
    private static final Duration SESSION_TTL = Duration.ofDays(7);
    private static final Base64.Encoder ENC = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder DEC = Base64.getUrlDecoder();

    private final LunaTelegramProperties properties;
    private final Clock clock;

    public AuthService(LunaTelegramProperties properties, Clock clock) {
        this.properties = properties;
        this.clock = clock;
    }

    public IssuedToken issue(long tgUserId) {
        long expiresAt = clock.instant().plus(SESSION_TTL).getEpochSecond();
        String payload = tgUserId + "." + expiresAt;
        String signature = ENC.encodeToString(hmac(payload.getBytes(StandardCharsets.UTF_8)));
        String token = ENC.encodeToString(payload.getBytes(StandardCharsets.UTF_8)) + "." + signature;
        return new IssuedToken(token, expiresAt);
    }

    public Optional<Long> validate(String token) {
        return parseToken(token).flatMap(this::verifyAndExtract);
    }

    private static Optional<ParsedToken> parseToken(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        int dot = token.indexOf('.');
        if (dot < 1 || dot == token.length() - 1) {
            return Optional.empty();
        }
        try {
            byte[] payload = DEC.decode(token.substring(0, dot));
            byte[] signature = DEC.decode(token.substring(dot + 1));
            return Optional.of(new ParsedToken(payload, signature));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    private Optional<Long> verifyAndExtract(ParsedToken parsed) {
        byte[] expected = hmac(parsed.payload());
        if (!MessageDigest.isEqual(expected, parsed.signature())) {
            return Optional.empty();
        }
        return parsePayload(parsed.payload())
            .filter(p -> p.expiresAt() >= clock.instant().getEpochSecond())
            .map(Payload::userId);
    }

    private static Optional<Payload> parsePayload(byte[] payloadBytes) {
        String payloadStr = new String(payloadBytes, StandardCharsets.UTF_8);
        int sep = payloadStr.indexOf('.');
        if (sep < 1) {
            return Optional.empty();
        }
        try {
            long userId = Long.parseLong(payloadStr.substring(0, sep));
            long expiresAt = Long.parseLong(payloadStr.substring(sep + 1));
            return Optional.of(new Payload(userId, expiresAt));
        } catch (NumberFormatException e) {
            return Optional.empty();
        }
    }

    // PMD HardCodedCryptoKey ловит fallback "" — это не ключ, это пустой токен (бот выключен).
    @SuppressWarnings("PMD.HardCodedCryptoKey")
    private byte[] hmac(byte[] data) {
        String secret = properties.botToken() == null ? "" : properties.botToken();
        try {
            Mac mac = Mac.getInstance(HMAC_ALGO);
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_ALGO));
            return mac.doFinal(data);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException("HMAC-SHA256 not available", e);
        }
    }

    public record IssuedToken(String token, long expiresAtEpochSec) {
    }

    private record ParsedToken(byte[] payload, byte[] signature) {
    }

    private record Payload(long userId, long expiresAt) {
    }
}
