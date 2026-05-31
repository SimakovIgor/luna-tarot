package com.lunatarot.backend.scheduler;

import java.time.LocalDate;
import java.util.List;

/**
 * Шаблоны утреннего push-приглашения в Mini App. Один и тот же пользователь
 * получает разный текст изо дня в день — выбор детерминирован по {@code (tgUserId + dayOfYear)},
 * без рандома, без LLM, без обращения в БД.
 *
 * Каждый шаблон содержит {@code %s} — туда подставляется имя пользователя.
 */
public final class DailyPushTemplates {

    private static final List<String> TEMPLATES = List.of(
        "🌙 %s, твоя карта дня уже выбрана.\nОткрой Луну — она покажет.",
        "🌙 %s, утро открыло новый расклад.\nКоснись — узнаешь, что приготовила Луна.",
        "✦ Луна шепнула твоё имя, %s.\nКарта дня уже легла. Загляни.",
        "🌒 Что-то изменилось в небе, %s.\nЛуна знает что — открой и посмотри.",
        "🌕 %s, у Луны для тебя сегодняшняя карта.\nТри секунды — и она твоя.",
        "✨ Доброе утро, %s.\nТвой день уже отмечен картой. Посмотри какой.",
        "🔮 %s, между вчера и завтра прошла линия — и на ней карта.\nЛуна ждёт.",
        "🌙 Карта для %s выбрана.\nЛуна не повторяет дважды — загляни сегодня.",
        "✦ %s, день начинается с символа.\nТвой символ уже у Луны.",
        "🌘 %s, прислушайся к тишине утра.\nЛуна оставила тебе карту."
    );

    private DailyPushTemplates() {
    }

    /**
     * Шаблон на сегодня для конкретного пользователя. Один и тот же tgUserId+дата
     * всегда даёт один и тот же шаблон — повторный push того же дня не «прыгает».
     */
    public static String forUser(long tgUserId, String name, LocalDate today) {
        int index = Math.floorMod(tgUserId + today.getDayOfYear(), TEMPLATES.size());
        return TEMPLATES.get(index).formatted(name);
    }

    /** Только для тестов / справки — общее количество вариантов. */
    public static int templateCount() {
        return TEMPLATES.size();
    }
}
