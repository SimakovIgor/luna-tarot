package com.lunatarot.backend.domain.spread;

import com.lunatarot.backend.domain.model.enums.ReadingType;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * Реестр всех доступных раскладов. Хардкод-описание layout-ов живёт здесь и только
 * здесь — фронт получит ту же информацию через REST {@code GET /api/spreads}, а
 * движок промпта Claude собирается из {@code positions}.
 */
@Component
public class SpreadCatalog {

    private final Map<ReadingType, Spread> catalog;

    public SpreadCatalog() {
        this.catalog = Map.of(
            ReadingType.CARD_OF_DAY, cardOfDay(),
            ReadingType.YES_NO, yesNo(),
            ReadingType.THREE_CARD, threeCard(),
            ReadingType.LOVE, love(),
            ReadingType.CELTIC_CROSS, celticCross(),
            ReadingType.YEAR_WHEEL, yearWheel()
        );
    }

    public Spread get(ReadingType type) {
        Spread spread = catalog.get(type);
        if (spread == null) {
            throw new NoSuchElementException("Нет описания спреда для типа " + type);
        }
        return spread;
    }

    /** Все спреды, которые юзер может явно выбрать на хабе (без CARD_OF_DAY — он отдельным флоу). */
    public List<Spread> userSelectable() {
        return List.of(
            catalog.get(ReadingType.YES_NO),
            catalog.get(ReadingType.THREE_CARD),
            catalog.get(ReadingType.LOVE),
            catalog.get(ReadingType.CELTIC_CROSS),
            catalog.get(ReadingType.YEAR_WHEEL)
        );
    }

    // ── описания спредов ─────────────────────────────────────────────────────

    private static Spread cardOfDay() {
        return new Spread(
            ReadingType.CARD_OF_DAY,
            "Карта дня",
            "одна карта на сегодня",
            List.of(
                new SpreadPosition(0, "Карта дня", "ключ к энергии этого дня — то, что важно увидеть и принять")
            )
        );
    }

    private static Spread yesNo() {
        return new Spread(
            ReadingType.YES_NO,
            "Да или нет",
            "три карты на закрытый вопрос",
            List.of(
                new SpreadPosition(0, "За", "что говорит в пользу «да» — какие факторы / силы поддерживают вариант сделать"),
                new SpreadPosition(1, "Против", "что говорит в пользу «нет» — какие факторы / силы предостерегают, тормозят"),
                new SpreadPosition(2, "Итог", "решающий голос: если бы Луна выбирала за тебя — куда склоняется ответ")
            )
        );
    }

    private static Spread threeCard() {
        return new Spread(
            ReadingType.THREE_CARD,
            "Три карты",
            "прошлое, настоящее и будущее",
            List.of(
                new SpreadPosition(0, "Прошлое", "корни ситуации: что привело к нынешнему моменту, какая энергия осталась за спиной"),
                new SpreadPosition(1, "Настоящее", "состояние сейчас: что главное в моменте, на чём стоит остановить внимание"),
                new SpreadPosition(2, "Будущее", "куда движется ситуация при сохранении текущего направления — не приговор, а вектор")
            )
        );
    }

    private static Spread love() {
        return new Spread(
            ReadingType.LOVE,
            "О любви",
            "пять карт о ваших отношениях",
            List.of(
                new SpreadPosition(0, "Я", "что несёт в эту связь сам спрашивающий: чувства, ожидания, состояние"),
                new SpreadPosition(1, "Партнёр", "что несёт другой человек: его внутреннее отношение, не маска"),
                new SpreadPosition(2, "Связь", "природа самой связи между ними: что есть, что течёт между двумя"),
                new SpreadPosition(3, "Препятствие", "то, что мешает или испытывает эту связь — внешнее или внутреннее"),
                new SpreadPosition(4, "Исход", "куда ведёт эта связь, если не менять направление")
            )
        );
    }

    private static Spread celticCross() {
        return new Spread(
            ReadingType.CELTIC_CROSS,
            "Полный разбор",
            "десять карт на серьёзный вопрос",
            List.of(
                new SpreadPosition(0, "Суть", "ядро ситуации, главная её энергия"),
                new SpreadPosition(1, "Вызов", "то, что пересекает суть — поддержка или сопротивление"),
                new SpreadPosition(2, "Корень", "глубинная причина, бессознательное основание"),
                new SpreadPosition(3, "Прошлое", "недавнее прошлое, уходящие влияния"),
                new SpreadPosition(4, "Сознание", "то, что спрашивающий думает о ситуации"),
                new SpreadPosition(5, "Ближайшее будущее", "следующий шаг ситуации в ближайшее время"),
                new SpreadPosition(6, "Спрашивающий", "состояние и роль самого человека в раскладе"),
                new SpreadPosition(7, "Окружение", "влияние других людей и обстоятельств вокруг"),
                new SpreadPosition(8, "Надежды и страхи", "внутренние ожидания — желаемое и пугающее"),
                new SpreadPosition(9, "Итог", "к чему ведёт ситуация при сохранении траектории")
            )
        );
    }

    private static Spread yearWheel() {
        return new Spread(
            ReadingType.YEAR_WHEEL,
            "На год вперёд",
            "двенадцать карт по месяцам",
            List.of(
                new SpreadPosition(0, "Месяц 1", "энергия первого месяца от сегодняшнего дня"),
                new SpreadPosition(1, "Месяц 2", "энергия второго месяца"),
                new SpreadPosition(2, "Месяц 3", "энергия третьего месяца"),
                new SpreadPosition(3, "Месяц 4", "энергия четвёртого месяца"),
                new SpreadPosition(4, "Месяц 5", "энергия пятого месяца"),
                new SpreadPosition(5, "Месяц 6", "энергия шестого месяца, середина года"),
                new SpreadPosition(6, "Месяц 7", "энергия седьмого месяца"),
                new SpreadPosition(7, "Месяц 8", "энергия восьмого месяца"),
                new SpreadPosition(8, "Месяц 9", "энергия девятого месяца"),
                new SpreadPosition(9, "Месяц 10", "энергия десятого месяца"),
                new SpreadPosition(10, "Месяц 11", "энергия одиннадцатого месяца"),
                new SpreadPosition(11, "Месяц 12", "энергия двенадцатого месяца, завершение цикла")
            )
        );
    }
}
