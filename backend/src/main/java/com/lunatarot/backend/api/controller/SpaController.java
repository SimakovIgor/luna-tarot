package com.lunatarot.backend.api.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Корневой вход в Mini App. {@code /app} и {@code /app/} отдают index.html.
 * Все остальные пути под {@code /app/**} (статика и SPA-маршруты) — см. {@link com.lunatarot.backend.config.MiniAppWebConfig}.
 */
@Controller
public class SpaController {

    @GetMapping({"/app", "/app/"})
    public String spaRoot() {
        return "forward:/app/index.html";
    }
}
