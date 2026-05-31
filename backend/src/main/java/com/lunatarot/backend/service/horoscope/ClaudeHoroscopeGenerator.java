package com.lunatarot.backend.service.horoscope;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lunatarot.backend.config.AnthropicProperties;
import com.lunatarot.backend.domain.model.UserEntity;
import com.lunatarot.backend.service.onboarding.RussianGrammar;
import edu.umd.cs.findbugs.annotations.SuppressFBWarnings;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * LLM-генератор гороскопа на Claude. Идентичный паттерн с ClaudeInterpreter:
 * один HTTP-вызов, при ошибке возвращаем мягкий fallback-текст (расклад/гороскоп
 * всё равно сохраняется).
 */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "luna.llm", name = "provider", havingValue = "claude")
public class ClaudeHoroscopeGenerator implements HoroscopeGenerator {

    private static final String ANTHROPIC_VERSION = "2023-06-01";
    private static final String MESSAGES_PATH = "/v1/messages";

    private final AnthropicProperties properties;
    private final RestClient http;
    private final ObjectMapper json = new ObjectMapper();

    public ClaudeHoroscopeGenerator(AnthropicProperties properties) {
        this.properties = properties;
        this.http = RestClient.builder()
            .baseUrl(properties.anthropicBaseUrl())
            .defaultHeader("x-api-key", properties.anthropicApiKey())
            .defaultHeader("anthropic-version", ANTHROPIC_VERSION)
            .build();
    }

    @Override
    public String generate(UserEntity user, LocalDate date) {
        try {
            String body = json.writeValueAsString(Map.of(
                "model", properties.model(),
                "max_tokens", 180,
                "system", buildSystemPrompt(user),
                "messages", List.of(Map.of(
                    "role", "user",
                    "content", buildUserPrompt(user, date)
                ))
            ));
            String response = http.post()
                .uri(MESSAGES_PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(String.class);
            return extractText(response);
        } catch (RestClientException | IOException e) {
            log.warn("Claude horoscope call failed, returning fallback", e);
            return fallback(user);
        }
    }

    private String extractText(String response) throws IOException {
        JsonNode root = json.readTree(response);
        JsonNode contentArr = root.path("content");
        if (!contentArr.isArray() || contentArr.isEmpty()) {
            return fallback(null);
        }
        StringBuilder sb = new StringBuilder(256);
        for (JsonNode block : contentArr) {
            if ("text".equals(block.path("type").asText())) {
                sb.append(block.path("text").asText());
            }
        }
        return sb.toString().strip();
    }

    @SuppressFBWarnings("VA_FORMAT_STRING_USES_NEWLINE")
    private static String buildSystemPrompt(UserEntity user) {
        return """
            Ты — Luna, ИИ-таролог. Пишешь короткий персональный гороскоп на день.
            Говоришь по-русски, на «ты», спокойно и образно, без пафоса. Запрещены
            клише «Луна шепчет», «в воздухе витает энергия», «звёзды нашёптывают»,
            «вселенная даёт тебе шанс».

            ФОРМАТ:
            • Только обычные абзацы. НИКАКИХ markdown-заголовков (#, ##), списков,
              горизонтальных линий.
            • Эмодзи только ✦ 🌙 ☽. Максимум один эмодзи на абзац, только в конце
              абзаца. Без эмодзи тоже хорошо.
            • Не начинай ответ с эмодзи/значка отдельной строкой.

            КОНТЕКСТ — упоминай по делу, не каждый абзац:
            • имя: %s
            • пол: %s — согласуй рода: %s.
              ВНИМАНИЕ когда пол не указан: используй только настоящее и будущее
              время («ты идёшь», «ты увидишь»), безличные конструкции
              («тебе важно», «можно заметить») и инфинитивы. НЕ используй
              прошедшее время единственного числа с родом («сделал», «решилась»,
              «увидел/а») — переформулируй в настоящее или безличное.
            • зодиак: %s
            • число судьбы: %s
            • лунная фаза при рождении (натальная — не сегодняшняя): %s

            СОДЕРЖАНИЕ — РОВНО 1–2 предложения, максимум 140 знаков (как
            короткий твит). Это шёпот Луны на ухо, не текст и не лекция:
            • Один образ дня (метафора) + один конкретный ракурс внимания.
            • Никаких абзацев, перечислений, разборов энергий и стихий.
              Если получается длиннее 140 знаков — урежь и оставь самое главное.

            ПРАВИЛА:
            • Не предсказывай конкретные события («ты встретишь N», «придёт письмо»).
              Образ и совет, не приговор.
            • Никаких медицинских/юридических/финансовых рекомендаций.
            """.formatted(
                user.getName(),
                RussianGrammar.describeForLlm(user.getGender()),
                exampleAgreement(user),
                com.lunatarot.backend.llm.RussianLocalization.zodiacRu(user.getZodiac()),
                user.getLifePathNumber() == null ? "не указано" : user.getLifePathNumber().toString(),
                com.lunatarot.backend.llm.RussianLocalization.lunarPhaseRu(user.getLunarPhase())
        );
    }

    private static String exampleAgreement(UserEntity user) {
        return RussianGrammar.gladToMeet(user.getGender()) + " / "
            + RussianGrammar.wasBorn(user.getGender()) + " / "
            + RussianGrammar.ready(user.getGender());
    }

    private static String buildUserPrompt(UserEntity user, LocalDate date) {
        return "Дата: " + date + ". Имя: " + user.getName() + ". "
            + "Напиши гороскоп на этот день по правилам системного промпта.";
    }

    private static String fallback(UserEntity user) {
        String name = user != null ? user.getName() : "путник";
        return name + ", сегодня Луна молчит — слушай тишину. "
            + "День просит малого внимания и одного честного шага. "
            + "✦ Не торопись — день дольше, чем кажется.";
    }
}
