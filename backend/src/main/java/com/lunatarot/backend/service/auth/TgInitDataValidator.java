package com.lunatarot.backend.service.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lunatarot.backend.config.LunaTelegramProperties;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;
import java.util.SortedMap;
import java.util.TreeMap;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * Валидация Telegram WebApp {@code initData} согласно
 * <a href="https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app">официальной схеме</a>.
 *
 * Алгоритм:
 *   1) парсим query-string в пары key=value (URL-decoded);
 *   2) убираем {@code hash}, остальные сортируем алфавитно по ключу
 *      и склеиваем в {@code data_check_string} ("key=value\n...");
 *   3) secret = HMAC_SHA256("WebAppData", bot_token);
 *   4) computed = HMAC_SHA256(secret, data_check_string);
 *   5) если computed == hash — данные валидны.
 */
@Component
public class TgInitDataValidator {

    private static final String HMAC_ALGO = "HmacSHA256";
    private static final byte[] WEB_APP_DATA_KEY = "WebAppData".getBytes(StandardCharsets.UTF_8);
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final LunaTelegramProperties properties;

    public TgInitDataValidator(LunaTelegramProperties properties) {
        this.properties = properties;
    }

    /**
     * @return Telegram user id, если подпись валидна; {@link Optional#empty()} иначе.
     */
    public Optional<Long> validate(String initData) {
        if (initData == null || initData.isBlank() || !properties.isUsable()) {
            return Optional.empty();
        }
        SortedMap<String, String> pairs = parse(initData);
        String hash = pairs.remove("hash");
        if (hash == null || hash.isBlank()) {
            return Optional.empty();
        }
        String dataCheckString = joinDataCheckString(pairs);
        byte[] secret = hmacSha256(WEB_APP_DATA_KEY, properties.botToken().getBytes(StandardCharsets.UTF_8));
        byte[] computed = hmacSha256(secret, dataCheckString.getBytes(StandardCharsets.UTF_8));
        byte[] expected = HexFormat.of().parseHex(hash);
        if (!MessageDigest.isEqual(expected, computed)) {
            return Optional.empty();
        }
        return extractUserId(pairs.get("user"));
    }

    private static SortedMap<String, String> parse(String initData) {
        SortedMap<String, String> pairs = new TreeMap<>();
        for (String pair : initData.split("&")) {
            int eq = pair.indexOf('=');
            if (eq < 0) {
                continue;
            }
            String key = URLDecoder.decode(pair.substring(0, eq), StandardCharsets.UTF_8);
            String value = URLDecoder.decode(pair.substring(eq + 1), StandardCharsets.UTF_8);
            pairs.put(key, value);
        }
        return pairs;
    }

    private static String joinDataCheckString(Map<String, String> pairs) {
        return pairs.entrySet().stream()
            .map(e -> e.getKey() + "=" + e.getValue())
            .reduce((a, b) -> a + "\n" + b)
            .orElse("");
    }

    private static Optional<Long> extractUserId(String userJson) {
        if (userJson == null || userJson.isBlank()) {
            return Optional.empty();
        }
        try {
            JsonNode node = OBJECT_MAPPER.readTree(userJson);
            JsonNode idNode = node.get("id");
            if (idNode == null || !idNode.isNumber()) {
                return Optional.empty();
            }
            return Optional.of(idNode.asLong());
        } catch (IOException e) {
            return Optional.empty();
        }
    }

    private static byte[] hmacSha256(byte[] key, byte[] data) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGO);
            mac.init(new SecretKeySpec(key, HMAC_ALGO));
            return mac.doFinal(data);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException("HMAC-SHA256 not available", e);
        }
    }
}
