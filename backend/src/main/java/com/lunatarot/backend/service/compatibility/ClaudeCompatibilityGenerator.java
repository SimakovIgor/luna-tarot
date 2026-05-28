package com.lunatarot.backend.service.compatibility;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lunatarot.backend.config.AnthropicProperties;
import com.lunatarot.backend.domain.model.enums.ZodiacSign;
import edu.umd.cs.findbugs.annotations.SuppressFBWarnings;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * LLM-генерация совместимости через Claude. Промпт подаёт оба знака,
 * Claude возвращает свободный текст. Стиль — общий с интерпретатором/гороскопом.
 */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "luna.llm", name = "provider", havingValue = "claude")
public class ClaudeCompatibilityGenerator implements CompatibilityGenerator {

    private static final String ANTHROPIC_VERSION = "2023-06-01";
    private static final String MESSAGES_PATH = "/v1/messages";

    private final AnthropicProperties properties;
    private final RestClient http;
    private final ObjectMapper json = new ObjectMapper();

    public ClaudeCompatibilityGenerator(AnthropicProperties properties) {
        this.properties = properties;
        this.http = RestClient.builder()
            .baseUrl(properties.anthropicBaseUrl())
            .defaultHeader("x-api-key", properties.anthropicApiKey())
            .defaultHeader("anthropic-version", ANTHROPIC_VERSION)
            .build();
    }

    @Override
    public CompatibilityOutput generate(String myName, ZodiacSign myZodiac, Integer myAge,
                                        String partnerName, ZodiacSign partnerZodiac, Integer partnerAge) {
        try {
            String body = json.writeValueAsString(Map.of(
                "model", properties.model(),
                "max_tokens", 900,
                "system", buildSystemPrompt(),
                "messages", List.of(Map.of(
                    "role", "user",
                    "content", buildUserPrompt(myName, myZodiac, myAge, partnerName, partnerZodiac, partnerAge)
                ))
            ));
            String response = http.post()
                .uri(MESSAGES_PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(String.class);
            String raw = extractRawText(response);
            return parseScoreAndText(raw, myZodiac, partnerZodiac, myName, partnerName);
        } catch (RestClientException | IOException e) {
            log.warn("Claude compatibility call failed", e);
            return new CompatibilityOutput(
                fallbackScore(myZodiac, partnerZodiac),
                fallback(myName, myZodiac, partnerName, partnerZodiac)
            );
        }
    }

    private String extractRawText(String response) throws IOException {
        JsonNode root = json.readTree(response);
        JsonNode contentArr = root.path("content");
        if (!contentArr.isArray() || contentArr.isEmpty()) {
            return "";
        }
        StringBuilder sb = new StringBuilder(256);
        for (JsonNode block : contentArr) {
            if ("text".equals(block.path("type").asText())) {
                sb.append(block.path("text").asText());
            }
        }
        return sb.toString().strip();
    }

    /**
     * Пытается извлечь JSON {"score": N} из начала ответа. Терпит code-fence
     * (```json … ```), переводы строк до JSON, шум вокруг. Если ничего —
     * скатывается к stub-оценке по стихиям, чтобы шкала всё равно показалась.
     */
    private CompatibilityOutput parseScoreAndText(String raw, ZodiacSign myZodiac, ZodiacSign partnerZodiac,
                                                  String myName, String partnerName) {
        if (raw.isEmpty()) {
            return new CompatibilityOutput(
                fallbackScore(myZodiac, partnerZodiac),
                fallback(myName, myZodiac, partnerName, partnerZodiac)
            );
        }
        java.util.regex.Matcher m = java.util.regex.Pattern
            .compile("\\{\\s*\"score\"\\s*:\\s*(-?\\d+)\\s*}")
            .matcher(raw);
        if (m.find()) {
            int score = clampScore(Integer.parseInt(m.group(1)));
            // Срезаем всё до конца найденного JSON + любые ```/```json вокруг + лишние переводы строк.
            String rest = raw.substring(m.end()).replaceAll("^\\s*```\\s*", "").strip();
            if (!rest.isEmpty()) {
                return new CompatibilityOutput(score, rest);
            }
        }
        return new CompatibilityOutput(fallbackScore(myZodiac, partnerZodiac), raw);
    }

    private static int clampScore(int raw) {
        return Math.min(100, Math.max(1, raw));
    }

    private static int fallbackScore(ZodiacSign a, ZodiacSign b) {
        return StubCompatibilityGenerator.scoreFor(
            StubCompatibilityGenerator.classify(a),
            StubCompatibilityGenerator.classify(b)
        );
    }

    @SuppressFBWarnings("VA_FORMAT_STRING_USES_NEWLINE")
    private static String buildSystemPrompt() {
        return """
            Ты — Luna, ИИ-таролог и астролог. Описываешь совместимость двух людей по
            их знакам зодиака. Говоришь по-русски, на «ты» (к тому, кто спрашивает),
            спокойно и образно, без пафоса. Запрещены клише «Луна шепчет», «звёзды
            нашёптывают», «в воздухе витает энергия», «вселенная даёт шанс».

            ФОРМАТ — строго:
            Первая строка ОТВЕТА (без префиксов, без code fence ```json```,
            без любых других символов перед ней) — JSON ровно вида:
              {"score": N}
            где N — целое число от 1 до 100 (1 — несовместимо, 100 — идеально).
            Опирайся на стихии знаков, но не механически — слушай нюанс пары.
            После JSON — пустая строка, затем 5 абзацев текста.

            Запрещено в тексте:
            • markdown-заголовки (#, ##), списки, горизонтальные линии.
            • эмодзи кроме ✦ 🌙 ☽. Максимум один на абзац, в конце абзаца.
            • число процента внутри текста — оно уже в JSON-заголовке.

            СТРУКТУРА (5 абзацев, всего 700-1100 символов):

            1) Короткое открытие, 1-2 предложения: образ встречи через метафору
               двух стихий. Без перечисления плюсов/минусов — только настроение.

            2) Жирная метка отдельной строкой:
               **Совет Луны**
               Дальше 2-3 предложения: главный ответ паре и один конкретный шаг
               или вопрос, который они могут задать сами себе. Не «слушай сердце» —
               конкретно. ЭТО САМАЯ ВАЖНАЯ ЧАСТЬ — пользователь видит её первой
               после короткого открытия.

            3) Жирная метка отдельной строкой:
               **Где вы естественны**
               1-2 предложения: где они дополняют друг друга.

            4) Жирная метка отдельной строкой:
               **Где между вами напряжение**
               1-2 предложения: где разные ритмы или языки, что требует усилия.

            5) Жирная метка отдельной строкой:
               **Что замечать**
               1 предложение: на что обратить внимание в ближайшие недели.

            ПРАВИЛА КОНТЕНТА:
            • Никаких приговоров («вы расстанетесь», «вы будете вместе вечно»).
              Совместимость — почва, не приговор.
            • Если знаки одинаковые — подчеркни этот резонанс отдельно.
            • Не уходи в роль психотерапевта; не упоминай диагнозы, насилие, измены.
            """;
    }

    private static String buildUserPrompt(String myName, ZodiacSign myZodiac, Integer myAge,
                                          String partnerName, ZodiacSign partnerZodiac, Integer partnerAge) {
        StringBuilder sb = new StringBuilder(256);
        String myZodiacRu = com.lunatarot.backend.llm.RussianLocalization.zodiacRu(myZodiac);
        String partnerZodiacRu = com.lunatarot.backend.llm.RussianLocalization.zodiacRu(partnerZodiac);
        sb.append("Спрашивает: ").append(myName).append(" (знак: ").append(myZodiacRu)
            .append(ageSuffix(myAge)).append(").\nПартнёр: ").append(partnerName)
            .append(" (знак: ").append(partnerZodiacRu).append(ageSuffix(partnerAge)).append(").\n");
        if (myAge != null && partnerAge != null) {
            int gap = Math.abs(myAge - partnerAge);
            if (gap >= 15) {
                String ageWarn = "ВАЖНО: разница в возрасте " + gap
                    + " лет — учти разные жизненные этапы в тексте, но не делай возраст приговором.\n";
                sb.append(ageWarn);
            }
        }
        sb.append("Опиши их совместимость по правилам системного промпта.");
        return sb.toString();
    }

    private static String ageSuffix(Integer age) {
        return age == null ? "" : ", возраст " + age;
    }

    private static String fallback(String myName, ZodiacSign myZodiac,
                                   String partnerName, ZodiacSign partnerZodiac) {
        return myName + ", Луна сейчас в раздумьях и не готова дать полный ответ. "
            + "Знаки ваши — " + myZodiac.name() + " и " + partnerZodiac.name()
            + ". Попробуй спросить ещё раз через минуту.\n\n"
            + "✦ А пока — поговорите с " + partnerName + " о чём-то малом, но честном.";
    }
}
