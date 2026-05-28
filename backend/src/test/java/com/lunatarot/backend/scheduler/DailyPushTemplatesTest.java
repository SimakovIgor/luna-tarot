package com.lunatarot.backend.scheduler;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class DailyPushTemplatesTest {

    @Test
    void interpolates_user_name_into_template() {
        String text = DailyPushTemplates.forUser(123L, "Алиса", LocalDate.of(2026, 5, 28));
        assertThat(text).contains("Алиса");
    }

    @Test
    void same_user_same_date_returns_same_template() {
        LocalDate day = LocalDate.of(2026, 5, 28);
        String first = DailyPushTemplates.forUser(42L, "Боб", day);
        String second = DailyPushTemplates.forUser(42L, "Боб", day);
        assertThat(first).isEqualTo(second);
    }

    @Test
    void cycles_through_all_templates_across_users_or_days() {
        Set<String> distinct = new HashSet<>();
        LocalDate day = LocalDate.of(2026, 5, 28);
        for (long uid = 1; uid <= 200L; uid++) {
            distinct.add(DailyPushTemplates.forUser(uid, "X", day));
        }
        // Все шаблоны должны попасться хотя бы раз за 200 уникальных юзеров.
        assertThat(distinct).hasSize(DailyPushTemplates.templateCount());
    }

    @Test
    void handles_negative_user_id_without_arithmetic_exception() {
        String text = DailyPushTemplates.forUser(-7L, "Тест", LocalDate.of(2026, 5, 28));
        assertThat(text).contains("Тест");
    }
}
