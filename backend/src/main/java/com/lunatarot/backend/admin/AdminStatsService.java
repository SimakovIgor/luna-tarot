package com.lunatarot.backend.admin;

import com.lunatarot.backend.admin.dto.AdminDailyRow;
import com.lunatarot.backend.admin.dto.AdminReadingTypeCount;
import com.lunatarot.backend.admin.dto.AdminStatsResponse;
import com.lunatarot.backend.admin.dto.AdminTotals;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Date;
import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;

/**
 * Аггрегаты для админ-панели. Окно по умолчанию — последние 30 дней по московскому времени
 * (продукт ориентирован на RU-аудиторию, утренний push-карты тоже привязан к Москве).
 */
@Service
public class AdminStatsService {

    public static final int DEFAULT_WINDOW_DAYS = 30;

    static final ZoneId REPORT_ZONE = ZoneId.of("Europe/Moscow");
    static final String REPORT_ZONE_SQL = "Europe/Moscow";

    private static final String TOTALS_SQL = """
        SELECT
          (SELECT COUNT(*) FROM users) AS users,
          (SELECT COUNT(*) FROM users WHERE conversation_state = 'READY') AS users_ready,
          (SELECT COUNT(*) FROM readings) AS readings,
          (SELECT COUNT(*) FROM daily_horoscopes) AS horoscopes
        """;

    private static final String DAILY_SQL = """
        WITH days AS (
          SELECT generate_series(:start::date, :endDay::date, INTERVAL '1 day')::date AS d
        ),
        new_users AS (
          SELECT (created_at AT TIME ZONE :tz)::date AS d, COUNT(*) AS cnt
          FROM users
          WHERE created_at >= :startUtc
          GROUP BY 1
        ),
        readings_day AS (
          SELECT (created_at AT TIME ZONE :tz)::date AS d, COUNT(*) AS cnt
          FROM readings
          WHERE created_at >= :startUtc
          GROUP BY 1
        ),
        active_day AS (
          SELECT (created_at AT TIME ZONE :tz)::date AS d, COUNT(DISTINCT user_id) AS cnt
          FROM readings
          WHERE created_at >= :startUtc
          GROUP BY 1
        )
        SELECT
          days.d AS d,
          COALESCE(new_users.cnt, 0) AS new_users,
          COALESCE(readings_day.cnt, 0) AS readings,
          COALESCE(active_day.cnt, 0) AS active_users
        FROM days
        LEFT JOIN new_users ON days.d = new_users.d
        LEFT JOIN readings_day ON days.d = readings_day.d
        LEFT JOIN active_day ON days.d = active_day.d
        ORDER BY days.d DESC
        """;

    private static final String BY_TYPE_SQL = """
        SELECT type, COUNT(*) AS cnt
        FROM readings
        GROUP BY type
        ORDER BY cnt DESC
        """;

    private final NamedParameterJdbcTemplate jdbc;
    private final Clock clock;

    public AdminStatsService(NamedParameterJdbcTemplate jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    public AdminStatsResponse collect(int windowDays) {
        return new AdminStatsResponse(loadTotals(), loadDaily(windowDays), loadByType());
    }

    private AdminTotals loadTotals() {
        return jdbc.queryForObject(TOTALS_SQL, new MapSqlParameterSource(), (rs, i) ->
            new AdminTotals(
                rs.getLong("users"),
                rs.getLong("users_ready"),
                rs.getLong("readings"),
                rs.getLong("horoscopes")
            ));
    }

    private List<AdminDailyRow> loadDaily(int windowDays) {
        LocalDate today = LocalDate.now(clock.withZone(REPORT_ZONE));
        LocalDate start = today.minusDays(windowDays - 1L);
        MapSqlParameterSource params = new MapSqlParameterSource()
            .addValue("start", Date.valueOf(start))
            .addValue("endDay", Date.valueOf(today))
            .addValue("tz", REPORT_ZONE_SQL)
            .addValue("startUtc", OffsetDateTime.ofInstant(
                start.atStartOfDay(REPORT_ZONE).toInstant(), ZoneOffset.UTC));
        return jdbc.query(DAILY_SQL, params, (rs, i) ->
            new AdminDailyRow(
                rs.getDate("d").toLocalDate(),
                rs.getLong("new_users"),
                rs.getLong("readings"),
                rs.getLong("active_users")
            ));
    }

    private List<AdminReadingTypeCount> loadByType() {
        return jdbc.query(BY_TYPE_SQL, new MapSqlParameterSource(), (rs, i) ->
            new AdminReadingTypeCount(rs.getString("type"), rs.getLong("cnt")));
    }
}
