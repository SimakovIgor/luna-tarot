package com.lunatarot.backend.admin;

import com.lunatarot.backend.admin.dto.AdminDailyRow;
import com.lunatarot.backend.admin.dto.AdminReadingTypeCount;
import com.lunatarot.backend.admin.dto.AdminStatsResponse;
import com.lunatarot.backend.admin.dto.AdminTotals;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequestMapping("/admin")
public class AdminStatsController {

    private static final int MAX_WINDOW_DAYS = 90;
    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE;

    // HTML-шаблон с плейсхолдерами ${...}. Используем String.replace вместо String.formatted,
    // т.к. в inline CSS встречаются литералы вида `width:100%` и `%;`, которые сломали бы
    // парсер форматной строки.
    private static final String HTML_TEMPLATE = """
        <!doctype html>
        <html lang="ru"><head>
        <meta charset="utf-8">
        <title>Luna · admin</title>
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <style>
          :root { color-scheme: dark; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Inter", sans-serif;
                 background:#0b0a18; color:#e8e6ff; margin:0; padding:24px 16px 64px; }
          h1 { font-weight:500; letter-spacing:.5px; margin:0 0 4px; }
          .muted { color:#9a96c6; font-size:13px; }
          .grid { display:grid; gap:12px; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); margin:24px 0; }
          .card { background:#15132a; border:1px solid #25214a; border-radius:14px; padding:16px; }
          .card .v { font-size:28px; font-weight:600; margin-top:4px; }
          .card .l { font-size:12px; color:#9a96c6; text-transform:uppercase; letter-spacing:1px; }
          section { margin-top:32px; }
          section h2 { font-weight:500; font-size:16px; color:#c8c4ee; margin:0 0 12px; }
          table { width:100%; border-collapse:collapse; background:#15132a; border:1px solid #25214a;
                  border-radius:14px; overflow:hidden; }
          th, td { padding:10px 14px; text-align:right; font-variant-numeric:tabular-nums; }
          th:first-child, td:first-child { text-align:left; }
          thead th { background:#1d1a3a; font-weight:500; font-size:12px; color:#9a96c6;
                     text-transform:uppercase; letter-spacing:1px; }
          tbody tr:nth-child(even) { background:#181534; }
          .empty { color:#7f7bb0; font-style:italic; padding:16px; }
          form { margin-top:12px; }
          input, button { background:#1d1a3a; color:#e8e6ff; border:1px solid #2d2a55;
                          border-radius:8px; padding:6px 10px; font:inherit; }
          button { cursor:pointer; }
        </style>
        </head><body>
          <h1>Luna · admin</h1>
          <div class="muted">окно: последние ${WINDOW} дней (Europe/Moscow)</div>
          <form method="get">
            <label class="muted">days&nbsp;<input type="number" name="days" min="1" max="90" value="${WINDOW}"></label>
            <button>применить</button>
          </form>

          <div class="grid">
            ${TOTALS}
          </div>

          <section>
            <h2>По дням</h2>
            ${DAILY}
          </section>

          <section>
            <h2>Расклады по типу (за всё время)</h2>
            ${BY_TYPE}
          </section>
        </body></html>
        """;

    private final AdminStatsService statsService;

    public AdminStatsController(AdminStatsService statsService) {
        this.statsService = statsService;
    }

    @GetMapping(value = "/api/stats", produces = MediaType.APPLICATION_JSON_VALUE)
    public AdminStatsResponse stats(@RequestParam(name = "days", required = false) Integer days) {
        return statsService.collect(clampWindow(days));
    }

    @GetMapping(value = {"", "/"}, produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> dashboard(@RequestParam(name = "days", required = false) Integer days) {
        int window = clampWindow(days);
        AdminStatsResponse data = statsService.collect(window);
        return ResponseEntity.ok()
            .contentType(MediaType.valueOf("text/html; charset=utf-8"))
            .body(renderHtml(data, window));
    }

    private static int clampWindow(Integer days) {
        if (days == null) {
            return AdminStatsService.DEFAULT_WINDOW_DAYS;
        }
        return Math.min(Math.max(days, 1), MAX_WINDOW_DAYS);
    }

    private static String renderHtml(AdminStatsResponse data, int window) {
        return HTML_TEMPLATE
            .replace("${WINDOW}", String.valueOf(window))
            .replace("${TOTALS}", renderTotals(data.totals()))
            .replace("${DAILY}", renderDailyTable(data.byDay()))
            .replace("${BY_TYPE}", renderTypeTable(data.readingsByType()));
    }

    private static String renderTotals(AdminTotals t) {
        return card("Users", t.users())
            + card("Users · READY", t.usersReady())
            + card("Readings", t.readings())
            + card("Horoscopes", t.horoscopes());
    }

    private static String card(String label, long value) {
        return "<div class=\"card\"><div class=\"l\">" + escape(label)
            + "</div><div class=\"v\">" + value + "</div></div>";
    }

    private static String renderDailyTable(List<AdminDailyRow> rows) {
        if (rows.isEmpty()) {
            return "<div class=\"empty\">нет данных</div>";
        }
        StringBuilder sb = new StringBuilder(rows.size() * 80);
        sb.append("<table><thead><tr><th>Дата</th><th>Новые</th><th>Расклады</th><th>Активные</th></tr></thead><tbody>");
        rows.forEach(r -> sb.append("<tr><td>").append(r.date().format(ISO))
            .append("</td><td>").append(r.newUsers())
            .append("</td><td>").append(r.readings())
            .append("</td><td>").append(r.activeUsers())
            .append("</td></tr>"));
        sb.append("</tbody></table>");
        return sb.toString();
    }

    private static String renderTypeTable(List<AdminReadingTypeCount> rows) {
        if (rows.isEmpty()) {
            return "<div class=\"empty\">пока ни одного расклада</div>";
        }
        StringBuilder sb = new StringBuilder(rows.size() * 60);
        sb.append("<table><thead><tr><th>Тип</th><th>Всего</th></tr></thead><tbody>");
        rows.forEach(r -> sb.append("<tr><td>").append(escape(r.type()))
            .append("</td><td>").append(r.count())
            .append("</td></tr>"));
        sb.append("</tbody></table>");
        return sb.toString();
    }

    private static String escape(String s) {
        return s.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;");
    }
}
