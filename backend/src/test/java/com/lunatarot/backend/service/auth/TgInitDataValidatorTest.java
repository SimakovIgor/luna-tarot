package com.lunatarot.backend.service.auth;

import com.lunatarot.backend.config.LunaTelegramProperties;
import org.junit.jupiter.api.Test;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import static org.assertj.core.api.Assertions.assertThat;

class TgInitDataValidatorTest {

    private static final String BOT_TOKEN = "12345:test-bot-secret";

    private final TgInitDataValidator validator =
        new TgInitDataValidator(new LunaTelegramProperties(true, BOT_TOKEN, "luna_bot", null));

    @Test
    void valid_init_data_returns_user_id() {
        String initData = buildValidInitData(BOT_TOKEN, 999_111L);

        assertThat(validator.validate(initData)).contains(999_111L);
    }

    @Test
    void tampered_user_field_invalidates_signature() {
        String good = buildValidInitData(BOT_TOKEN, 1L);
        String tampered = good.replace(URLEncoder.encode("{\"id\":1}", StandardCharsets.UTF_8),
            URLEncoder.encode("{\"id\":999}", StandardCharsets.UTF_8));

        assertThat(validator.validate(tampered)).isEmpty();
    }

    @Test
    void empty_or_null_returns_empty() {
        assertThat(validator.validate(null)).isEmpty();
        assertThat(validator.validate("")).isEmpty();
        assertThat(validator.validate("nohash=here")).isEmpty();
    }

    @Test
    void disabled_or_missing_token_returns_empty() {
        TgInitDataValidator disabled = new TgInitDataValidator(
            new LunaTelegramProperties(false, BOT_TOKEN, "u", null)
        );
        assertThat(disabled.validate(buildValidInitData(BOT_TOKEN, 1L))).isEmpty();

        TgInitDataValidator noToken = new TgInitDataValidator(
            new LunaTelegramProperties(true, "", "u", null)
        );
        assertThat(noToken.validate(buildValidInitData(BOT_TOKEN, 1L))).isEmpty();
    }

    // "WebAppData" — это публично документированная константа Telegram WebApp HMAC, не секрет;
    // подавление false-positive PMD HardCodedCryptoKey на тестовом хелпере.
    @SuppressWarnings("PMD.HardCodedCryptoKey")
    private static String buildValidInitData(String botToken, long userId) {
        String userJson = "{\"id\":" + userId + "}";
        String authDate = "1747393200";
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec("WebAppData".getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] secret = mac.doFinal(botToken.getBytes(StandardCharsets.UTF_8));

            String dcs = "auth_date=" + authDate + "\nuser=" + userJson;
            mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            byte[] sig = mac.doFinal(dcs.getBytes(StandardCharsets.UTF_8));
            String hashHex = java.util.HexFormat.of().formatHex(sig);

            return "auth_date=" + authDate
                + "&user=" + URLEncoder.encode(userJson, StandardCharsets.UTF_8)
                + "&hash=" + hashHex;
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
