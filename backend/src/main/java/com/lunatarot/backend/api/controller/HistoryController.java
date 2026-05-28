package com.lunatarot.backend.api.controller;

import com.lunatarot.backend.api.auth.AuthFilter;
import com.lunatarot.backend.api.dto.ReadingResponse;
import com.lunatarot.backend.api.mapper.DtoMapper;
import com.lunatarot.backend.domain.model.UserEntity;
import com.lunatarot.backend.domain.repository.UserRepository;
import com.lunatarot.backend.service.reading.HistoryService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/history")
public class HistoryController {

    private final HistoryService historyService;
    private final UserRepository userRepository;
    private final DtoMapper mapper;

    public HistoryController(HistoryService historyService,
                             UserRepository userRepository,
                             DtoMapper mapper) {
        this.historyService = historyService;
        this.userRepository = userRepository;
        this.mapper = mapper;
    }

    @GetMapping
    public ResponseEntity<List<ReadingResponse>> history(HttpServletRequest request,
                                                         @RequestParam(required = false) Integer limit) {
        Long tgUserId = (Long) request.getAttribute(AuthFilter.ATTR_TG_USER_ID);
        UserEntity user = userRepository.findByTgUserId(tgUserId).orElseThrow();
        List<ReadingResponse> items = historyService.recentForUser(user.getId(), limit).stream()
            .map(mapper::toReading)
            .toList();
        return ResponseEntity.ok(items);
    }
}
