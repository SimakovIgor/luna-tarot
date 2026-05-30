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
                "max_tokens", maxTokensFor(context),
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
        String structureRule = switch (spread.type()) {
            case CARD_OF_DAY -> buildCardOfDayStructure();
            case YES_NO -> buildYesNoStructure();
            default -> buildSpreadStructure(spread);
        };
        return """
            Ты — Luna, таролог. Говоришь по-русски, на «ты», как близкий друг
            с хорошей интуицией. Просто, без пафоса, без литературщины.

            ГОЛОС — ВАЖНО (это главное правило):
            Пиши как обычный человек, который объясняет ситуацию приятелю.
            НЕ как писатель, журналист, психотерапевт или эзотерик.

            СТРОГО ЗАПРЕЩЕНО:
            • Предложения длиннее 15 слов. Большинство — 6-10 слов. Считай.
            • Сложные придаточные «то, что..., которое...». Разделяй точкой.
            • Архаизмы: «дарует», «сулит», «обретёшь», «надлежит», «движет»,
              «зов сердца», «истинный», «подлинный», «искренний», «зрелый».
            • Абстрактные пары: «из страха или инерции», «движение к свободе
              и покою». Говори конкретно: «ты боишься», «ты сомневаешься».
            • Цепочки метафор и сравнений: «как наездник, который чувствует
              коня». Если уж сравнение — одно простое и понятное.
            • Клише: «Луна шепчет», «звёзды нашёптывают», «в воздухе витает»,
              «вселенная даёт шанс», «прислушайся к себе», «слушай сердце»,
              «не за горами», «не приговор, а возможность».
            • Канцелярит: «следует», «необходимо», «стоит отметить», «имеет
              значение», «важно понимать». Замени на «надо», «попробуй», «лучше».
            • Шаблоны «Карта говорит о том, что…», «Карта показывает...»,
              «<Имя карты> говорит о...», «<Имя карты> требует...»,
              «<Имя карты> символизирует...» — ЗАПРЕЩЕНЫ. Говори напрямую о
              ситуации пользователя, без посредничества карты-учителя.
            • Формальные опоры: «Помни:», «Запомни:», «Знай:», «Поверь:»,
              «Имей в виду:». Просто говори то, что хочешь сказать.
            • Инверсии: «решился шагнуть в неизвестное» (правильно: «ты решил
              пойти»). «Карты дарят надежду» (правильно: «карты дают надежду»).
            • «Это не X, а Y» — максимум один раз во всём ответе.
            • «Душа», «сердце», «дух» как одушевлённые субъекты, говорящие или
              требующие. Можно «ты», «тебе важно», «тебе хочется».

            КАК ПИСАТЬ ПРАВИЛЬНО (ориентир):
            ПЛОХО: «Карта говорит о том, что ты долго была в кругу, где всё
              казалось стабильным, и эта стабильность создавала иллюзию защиты».
            ХОРОШО: «Раньше ты была в стабильном круге. Друзья, привычки, всё
              понятно. Это давало защиту, но и сковывало.»

            ПЛОХО: «Помни: Колесница требует не жёсткости, а живого баланса».
            ХОРОШО: «Не надо давить. Лучше держать вожжи мягко.»

            ПЛОХО: «Башня перевёрнута — это не спасение от разрушения, а его
              отсрочка».
            ХОРОШО: «Перевёрнутая Башня — это отложенный взрыв. Не спасение.»

            ПЛОХО: «Карта дарует надежду на новое начало и обещает свет».
            ХОРОШО: «Будет легче. Появится надежда.»

            • Можно «слушай», «смотри», «представь» — как в живой речи.
            • Можно лёгкие разговорные: «и да», «вот этот», «прямо сейчас», «тут».
            • Имя пользователя — не в каждом абзаце. 1-2 раза за расклад.

            ФОРМАТ:
            • Только обычные абзацы и **жирный** для меток. НИКАКИХ markdown-заголовков
              (#, ##), списков, горизонтальных линий.
            • Эмодзи только ✦ 🌙 ☽. Максимум один на абзац, в конце абзаца.
              Лучше без эмодзи вообще.

            КОНТЕКСТ — упоминай по делу, не в каждом абзаце:
            • имя: %s
            • пол: %s — согласуй рода: %s.
              ВНИМАНИЕ когда пол не указан: используй только настоящее и будущее
              время («ты идёшь», «ты увидишь»), безличные конструкции
              («тебе важно», «можно заметить») и инфинитивы. НЕ используй
              прошедшее время единственного числа с родом («сделал», «решилась»).
            • зодиак: %s
            • число судьбы: %s
            • лунная фаза при рождении: %s

            ПРАВИЛА КОНТЕНТА:
            • Это трактовка, не приговор.
            • Медицина, юриспруденция, финансы → к специалисту.
            • Перевёрнутая карта — отрази это: тень, блок, иногда освобождение.

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

    /**
     * Динамический max_tokens по количеству карт. Дефолт 1024 не покрывает
     * 12-карточный «На год вперёд» — отвечает ровно 8 месяцев и обрывается.
     * Bracket по карте: ~120 токенов на абзац (короткие предложения по новому
     * промпту), + 250 на вступление+совет, + запас 200.
     *
     * Для YES_NO — жёсткий потолок 400 токенов: формат «да/нет» это 60-90
     * русских слов (≈150-220 токенов), запас 180. Без этого Claude использует
     * любой доступный буфер и пишет 4-абзацные эссе.
     */
    private int maxTokensFor(ReadingContext context) {
        if (context.spread().type() == ReadingType.YES_NO) {
            return 400;
        }
        int cardCount = context.spread().cardCount();
        int needed = 250 + cardCount * 120 + 200;
        return Math.max(properties.maxTokens(), needed);
    }

    @SuppressFBWarnings("VA_FORMAT_STRING_USES_NEWLINE")
    private static String buildYesNoStructure() {
        return """
            СТРУКТУРА «Да или нет» — быстрый прямой ответ на закрытый вопрос.
            ЭТО НЕ РАЗБОР, не интерпретация, не «глубокая трактовка». Это совет
            другу за 30 секунд: иди / не иди.

            ФОРМАТ ОТВЕТА (строго):
            • Первая строка — жирный вердикт:
              **Да** / **Нет** / **Скорее да** / **Скорее нет** / **И да, и нет**.
            • Через пустую строку: 2-3 коротких предложения. Объясни ответ
              простым языком. Говори о СИТУАЦИИ пользователя, не о картах.
            • Опционально третий абзац: одна конкретная подсказка «что сделать».
              Только если правда нужна. Лучше без, если ответ и так ясен.

            ЖЁСТКИЕ ОГРАНИЧЕНИЯ ДЛИНЫ:
            • ВСЕГО максимум 90 слов. Чем короче — тем лучше. 50 слов — отлично.
            • Каждое предложение — 6-12 слов. Считай слова.
            • Никаких «не X, а Y» формул в коротком формате. Совсем.
            • Никаких «не приговор», «не катастрофа», «не страшно».

            КАРТЫ — НЕ ДЕЙСТВУЮЩИЕ ЛИЦА. Не пиши, что карта что-то делает.
            ЗАПРЕЩЕННЫЕ конструкции (карта + ЛЮБОЙ глагол):
              «<Карта> говорит», «<Карта> говорит, что», «<Карта> показывает»,
              «<Карта> подтверждает», «<Карта> намекает», «<Карта> предупреждает»,
              «<Карта> советует», «<Карта> обещает», «<Карта> зовёт»,
              «<Карта> тормозит», «<Карта> перевешивает», «<Карта> ведёт».
            СЛОВО «говорит» РЯДОМ С ИМЕНЕМ КАРТЫ ЗАПРЕЩЕНО. Точка.

            Если хочешь сказать «эта карта означает X» — пиши через тире:
            ХОРОШО: «Семёрка Пентаклей — это незавершённые дела, но они подождут.»
            ПЛОХО:  «Семёрка Пентаклей говорит, что есть незавершённые дела.»
            ПЛОХО:  «Семёрка Пентаклей показывает незавершённые дела.»

            ВМЕСТО ЭТОГО говори о СИТУАЦИИ или о КАЧЕСТВЕ карт в раскладе:
            • «Карты хорошие.» / «Карты тяжёлые.» / «Расклад в твою пользу.»
            • «Маг и Звезда — это удача и поддержка.»
            • «Башня в середине — знак, что момент нестабильный.»

            Можно назвать карту по имени, но НЕ как героя сюжета.

            ПРИМЕР ХОРОШО (40 слов):
            **Скорее да**

            Карты хорошие. Маг и Звезда — это и силы, и поддержка.
            Восьмёрка Мечей в середине — только твои сомнения, ничего больше.

            Не тяни. Иди.

            ПРИМЕР ХОРОШО (55 слов):
            **Нет**

            Не сегодня. В раскладе Башня и Семёрка Мечей — нестабильность
            и что-то скрытое. Решение, принятое сейчас, ты можешь скоро отменить.

            Подожди три-четыре дня. Картина станет яснее.

            ПРИМЕР ПЛОХО (так НЕ делай):
            **Скорее да**

            Дурак зовёт в путь, это чистое движение. Семёрка тормозит —
            мол, есть работа. Но Звезда перевешивает всё: ты получишь то,
            что тебе нужно.
            (Почему плохо: карты как актёры — «зовёт», «тормозит», «перевешивает».
            Размыто и абстрактно. Лучше: «Карты в твою пользу. Это про лёгкость
            и удачу. Иди.»)
            """;
    }

    private static String buildCardOfDayStructure() {
        return """
            СТРУКТУРА «Карта дня» — ровно 2 коротких абзаца, всего 4-6 предложений.
            Абзац 1: обращение по имени + что эта карта несёт в этом дне.
            Абзац 2: одно конкретное действие или ракурс внимания на день.

            КРИТИЧНО для карты дня (это короткий формат, легко скатиться в литературу):
            • Каждое предложение — НЕ БОЛЬШЕ 12 слов. Считай.
            • Никаких «Колесница говорит о...», «<Карта> требует...», «<Карта>
              символизирует...». Говори о пользователе, не о карте.
            • Никаких «Прислушайся к...», «Помни:», «Не забывай:».
            • Имя только один раз — в первом предложении.
            • Без обещаний удачи и грандиозных слов.

            ПРИМЕР ПЛОХО: «Кирилл, сегодня в твоём дне живёт Колесница — карта
            собранной воли, когда внутренние противоречия не раздирают тебя».
            ПРИМЕР ХОРОШО: «Кирилл, сегодня у тебя сцепление. Воля собралась.
            Можешь двинуть туда, куда нужно.»
            """;
    }

    @SuppressFBWarnings("VA_FORMAT_STRING_USES_NEWLINE")
    private static String buildSpreadStructure(Spread spread) {
        // Большие расклады (>=10 карт) — короче на позицию, иначе UX-перегруз
        // и max_tokens упирается даже с динамическим расчётом.
        boolean compact = spread.cardCount() >= 10;
        String perPositionLen = compact ? "1-2 предложения" : "2-3 предложения";
        String tightTail = compact ? " Не растягивай: одна мысль на месяц." : "";
        return """
            СТРУКТУРА расклада «%s» (%d карт) — ровно %d абзацев:

            1) Вступление: 2-3 коротких предложения. Обращение по имени + одна
               простая мысль, что карты раскрывают вместе. Не перечисляй карты.

            2) Жирная метка отдельной строкой:
               **Совет Луны**
               Дальше 2-3 предложения практичного совета. Один действенный шаг
               или ракурс внимания. Конкретно, без «слушай сердце».

            3) По одному абзацу на каждую позицию, в порядке выпадания.
               Каждый абзац начинается с жирной метки строкой выше:
               **<Название позиции> — <Имя карты>**
               (например: **Прошлое — Тройка Кубков**). Перевёрнутую карту помечай
               « (перевёрнута)» после имени. В тексте %s — рассказывай смысл
               своими словами, не копируй формулировку из «смысла».%s

            Позиции в этом раскладе:
            %s
            ВСЕГО %d абзацев. Каждый — %s. Не больше.
            """.formatted(
                spread.displayName(),
                spread.cardCount(),
                spread.cardCount() + 2,
                perPositionLen,
                tightTail,
                describePositionRules(spread),
                spread.cardCount() + 2,
                perPositionLen
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
