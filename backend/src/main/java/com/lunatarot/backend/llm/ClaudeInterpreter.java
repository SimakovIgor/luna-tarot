package com.lunatarot.backend.llm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lunatarot.backend.config.AnthropicProperties;
import com.lunatarot.backend.domain.model.TarotCardEntity;
import com.lunatarot.backend.domain.model.UserEntity;
import com.lunatarot.backend.domain.model.enums.ReadingType;
import com.lunatarot.backend.domain.spread.Spread;
import com.lunatarot.backend.domain.spread.SpreadPosition;
import com.lunatarot.backend.service.onboarding.RussianGrammar;
import com.lunatarot.backend.service.reading.DrawnCard;
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
 * LLM-интерпретатор на Anthropic Claude.
 *
 * Активируется при {@code luna.llm.provider=claude}. Если упал HTTP-вызов —
 * возвращаем fallback-текст, расклад всё равно сохраняется.
 */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "luna.llm", name = "provider", havingValue = "claude")
public class ClaudeInterpreter implements TarotInterpreter {

    private static final String ANTHROPIC_VERSION = "2023-06-01";
    private static final String MESSAGES_PATH = "/v1/messages";

    private final AnthropicProperties properties;
    private final RestClient http;
    private final ObjectMapper json = new ObjectMapper();

    public ClaudeInterpreter(AnthropicProperties properties) {
        this.properties = properties;
        this.http = RestClient.builder()
            .baseUrl(properties.anthropicBaseUrl())
            .defaultHeader("x-api-key", properties.anthropicApiKey())
            .defaultHeader("anthropic-version", ANTHROPIC_VERSION)
            .build();
    }

    @Override
    public String interpret(ReadingContext context) {
        String systemPrompt = buildSystemPrompt(context.user(), context.spread());
        String userPrompt = buildUserPrompt(context);

        try {
            String body = json.writeValueAsString(Map.of(
                "model", properties.model(),
                "max_tokens", properties.maxTokens(),
                "system", systemPrompt,
                "messages", List.of(Map.of(
                    "role", "user",
                    "content", userPrompt
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
            log.warn("Claude call failed, returning fallback text", e);
            return fallback(context);
        }
    }

    private String extractText(String response) throws IOException {
        JsonNode root = json.readTree(response);
        JsonNode contentArr = root.path("content");
        if (!contentArr.isArray() || contentArr.isEmpty()) {
            return fallbackFromError(response);
        }
        StringBuilder sb = new StringBuilder(256);
        for (JsonNode block : contentArr) {
            if ("text".equals(block.path("type").asText())) {
                sb.append(block.path("text").asText());
            }
        }
        return sb.toString().strip();
    }

    private static String fallbackFromError(String response) {
        return "Карты разложены, но Luna сейчас в раздумьях. Попробуй ещё раз через минуту.\n\n"
            + "[debug: " + response.substring(0, Math.min(200, response.length())) + ']';
    }

    private static String fallback(ReadingContext context) {
        StringBuilder sb = new StringBuilder(512);
        boolean cardOfDay = context.spread().type() == ReadingType.CARD_OF_DAY;
        for (int i = 0; i < context.cards().size(); i++) {
            DrawnCard drawn = context.cards().get(i);
            if (cardOfDay) {
                sb.append("🌙 ");
            } else {
                sb.append("✦ ").append(context.spread().positions().get(i).label()).append(" — ");
            }
            String orientation = drawn.reversed() ? " (перевёрнута)" : "";
            sb.append(drawn.card().getNameRu()).append(orientation).append('\n')
                .append(drawn.activeMeaning()).append("\n\n");
        }
        sb.append("(Luna сейчас в раздумьях — это краткая трактовка. Попробуй ещё раз позже.)");
        return sb.toString().strip();
    }

    // ── Prompt building ────────────────────────────────────────────────────
    // SpotBugs ругается на \n в format string — нам нужен именно литеральный \n
    // (промпт идёт в HTTP body LLM, %n=platform-dependent нежелателен).
    @SuppressFBWarnings("VA_FORMAT_STRING_USES_NEWLINE")
    static String buildSystemPrompt(UserEntity user, Spread spread) {
        boolean cardOfDay = spread.type() == ReadingType.CARD_OF_DAY;
        String structureRule = cardOfDay
            ? buildCardOfDayStructure()
            : buildSpreadStructure(spread);
        return """
            Ты — Luna, ИИ-таролог. Говоришь по-русски, на «ты», спокойно и образно,
            без пафоса. Запрещены клише «Луна шепчет», «в воздухе витает энергия»,
            «звёзды нашёптывают», «вселенная даёт тебе шанс».

            ФОРМАТ:
            • Только обычные абзацы и **жирный** для меток. НИКАКИХ markdown-заголовков
              (#, ##), горизонтальных линий, нумерованных/маркированных списков.
            • Эмодзи только ✦ 🌙 ☽. Максимум один эмодзи на абзац, и только В КОНЦЕ
              абзаца — не посередине, не на отдельной строке. Без эмодзи тоже хорошо.
            • Не повторяй один и тот же образ/слово в двух абзацах подряд.

            КОНТЕКСТ — используй естественно, упоминай по делу, не в каждом абзаце:
            • имя: %s
            • пол: %s — согласуй рода: %s.
              ВНИМАНИЕ когда пол не указан: используй только настоящее и будущее
              время («ты идёшь», «ты увидишь»), безличные конструкции
              («тебе важно», «можно заметить») и инфинитивы. НЕ используй
              прошедшее время единственного числа с родом («сделал», «решилась»,
              «увидел/а») — переформулируй в настоящее или безличное.
            • зодиак: %s
            • число судьбы: %s
            • лунная фаза при рождении: %s

            ПРАВИЛА КОНТЕНТА:
            • Это трактовка, образ, вектор — не приговор и не предсказание.
            • Медицина, юриспруденция, финансы → мягко перенаправляй к специалистам.
            • Если карта перевёрнута — отрази это: тень, искажение, блок прямого смысла,
              или, наоборот, освобождение/исцеление. Не игнорируй положение.

            %s
            """.formatted(
                user.getName(),
                RussianGrammar.describeForLlm(user.getGender()),
                exampleAgreement(user),
                RussianLocalization.zodiacRu(user.getZodiac()),
                user.getLifePathNumber() == null ? "не указано" : user.getLifePathNumber().toString(),
                RussianLocalization.lunarPhaseRu(user.getLunarPhase()),
                structureRule
        );
    }

    private static String buildCardOfDayStructure() {
        return """
            СТРУКТУРА «Карта дня» — ровно 2 коротких абзаца, всего 4-6 предложений.
            Абзац 1: обращение по имени + что эта карта несёт в этом дне (образ).
            Абзац 2: одно конкретное действие или ракурс внимания на день.
            Не громко, без обещаний удачи.
            """;
    }

    @SuppressFBWarnings("VA_FORMAT_STRING_USES_NEWLINE")
    private static String buildSpreadStructure(Spread spread) {
        return """
            СТРУКТУРА расклада «%s» (%d карт) — ровно %d абзацев:

            1) Вступление: 2-3 предложения. Обращение по имени + одна общая мысль,
               что карты раскрывают вместе. Не перечисляй карты.

            2) Жирная метка отдельной строкой:
               **Совет Луны**
               Дальше 2-3 предложения практичного совета. Один действенный шаг
               или ракурс внимания. Не «слушай сердце» — конкретно.

            3) По одному абзацу на каждую позицию, в порядке выпадания.
               Каждый абзац начинается с жирной метки строкой выше:
               **<Название позиции> — <Имя карты>**
               (например: **Прошлое — Тройка Кубков**). Перевёрнутую карту помечай
               « (перевёрнута)» после имени. В тексте 2-3 предложения — рассказывай
               смысл своими словами, не копируй формулировку из «смысла».

            Позиции в этом раскладе:
            %s
            ВСЕГО %d абзацев. Каждый — 2-3 предложения. Не больше.
            """.formatted(
                spread.displayName(),
                spread.cardCount(),
                spread.cardCount() + 2,
                describePositionRules(spread),
                spread.cardCount() + 2
            );
    }

    private static String describePositionRules(Spread spread) {
        StringBuilder sb = new StringBuilder(256);
        for (SpreadPosition pos : spread.positions()) {
            sb.append("   • «").append(pos.label()).append("» — ")
                .append(pos.promptHint())
                .append('\n');
        }
        return sb.toString();
    }

    private static String exampleAgreement(UserEntity user) {
        return RussianGrammar.gladToMeet(user.getGender()) + " / "
            + RussianGrammar.wasBorn(user.getGender()) + " / "
            + RussianGrammar.ready(user.getGender());
    }

    static String buildUserPrompt(ReadingContext context) {
        Spread spread = context.spread();
        StringBuilder sb = new StringBuilder(512);
        if (spread.type() == ReadingType.CARD_OF_DAY) {
            sb.append("Расклад: Карта дня.\n");
        } else {
            sb.append("Расклад: «").append(spread.displayName()).append("» — ")
                .append(spread.cardCount()).append(" карт.\nПозиции по порядку: ");
            for (int i = 0; i < spread.positions().size(); i++) {
                if (i > 0) {
                    sb.append(" / ");
                }
                sb.append(spread.positions().get(i).label());
            }
            sb.append("\nВопрос пользователя: ").append(context.question()).append('\n');
        }
        sb.append("\nВыпавшие карты (в порядке позиций):\n");
        for (int i = 0; i < context.cards().size(); i++) {
            DrawnCard drawn = context.cards().get(i);
            TarotCardEntity c = drawn.card();
            String orientation = drawn.reversed() ? " — ПЕРЕВЁРНУТА" : "";
            String positionLabel = spread.type() == ReadingType.CARD_OF_DAY
                ? "Карта дня"
                : spread.positions().get(i).label();
            sb.append(i + 1).append(") [").append(positionLabel).append("] ")
                .append(c.getNameRu())
                .append(" (").append(c.getNameEn()).append(')').append(orientation)
                .append(", ключевые слова: ")
                .append(String.join(", ", c.getKeywords()))
                .append("\n   смысл (используй именно его): ")
                .append(drawn.activeMeaning())
                .append('\n');
        }
        sb.append("\nДай интерпретацию по правилам из системного промпта. "
            + "Если карта перевёрнута — отрази это в трактовке (тень, искажение, "
            + "блокировка прямого смысла или, наоборот, освобождение). Не игнорируй положение.");
        return sb.toString();
    }
}
