package com.lunatarot.backend.llm;

import com.lunatarot.backend.domain.model.enums.ReadingType;
import com.lunatarot.backend.domain.spread.Spread;
import com.lunatarot.backend.domain.spread.SpreadPosition;
import com.lunatarot.backend.service.onboarding.RussianGrammar;
import com.lunatarot.backend.service.reading.DrawnCard;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Заглушечный интерпретатор. Собирает текст из {@code upright/reversed_meaning} карт
 * и шаблонного совета. Активен на dev/MVP — без выходов в Anthropic API.
 *
 * Активируется при {@code luna.llm.provider=stub} (значение по умолчанию).
 */
@Component
@ConditionalOnProperty(prefix = "luna.llm", name = "provider", havingValue = "stub", matchIfMissing = true)
public class StubInterpreter implements TarotInterpreter {

    @Override
    public String interpret(ReadingContext context) {
        if (context.spread().type() == ReadingType.CARD_OF_DAY) {
            return cardOfDay(context);
        }
        return generic(context);
    }

    private static String generic(ReadingContext context) {
        Spread spread = context.spread();
        StringBuilder sb = new StringBuilder(512);
        sb.append(context.user().getName())
            .append(", расклад «").append(spread.displayName()).append("».\n\n");
        for (int i = 0; i < context.cards().size(); i++) {
            DrawnCard drawn = context.cards().get(i);
            SpreadPosition pos = spread.positions().get(i);
            String orientation = drawn.reversed() ? " (перевёрнута)" : "";
            sb.append("✦ ").append(pos.label())
                .append(" — ").append(drawn.card().getNameRu()).append(orientation).append('\n')
                .append(drawn.activeMeaning()).append("\n\n");
        }
        sb.append("✦ Совет Luna\n")
            .append(context.user().getName())
            .append(", карты указывают на переходный момент. Прислушайся к их голосу: то, что прямо — даёт, то, что перевёрнуто — учит. Будь ")
            .append(RussianGrammar.ready(context.user().getGender()))
            .append(" к честности с собой — и путь прояснится.");
        return sb.toString();
    }

    private static String cardOfDay(ReadingContext context) {
        DrawnCard drawn = context.cards().get(0);
        return "🌙 " + context.user().getName() + ", карта дня — " + drawn.card().getNameRu() + ".\n\n"
            + drawn.activeMeaning();
    }
}
