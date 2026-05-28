package com.lunatarot.backend.api.controller;

import com.lunatarot.backend.api.dto.SpreadDto;
import com.lunatarot.backend.domain.spread.SpreadCatalog;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Каталог раскладов для Mini App: имя, число карт, лейблы позиций.
 * Не требует авторизации — это статический справочник.
 */
@RestController
@RequestMapping("/api/spreads")
public class SpreadController {

    private final SpreadCatalog spreadCatalog;

    public SpreadController(SpreadCatalog spreadCatalog) {
        this.spreadCatalog = spreadCatalog;
    }

    @GetMapping
    public ResponseEntity<List<SpreadDto>> list() {
        List<SpreadDto> dtos = spreadCatalog.userSelectable().stream()
            .map(SpreadDto::from)
            .toList();
        return ResponseEntity.ok(dtos);
    }
}
