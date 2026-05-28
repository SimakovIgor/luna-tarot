package com.lunatarot.backend.api.controller;

import com.lunatarot.backend.api.auth.AuthFilter;
import com.lunatarot.backend.api.dto.CreateReadingRequest;
import com.lunatarot.backend.api.dto.OutcomeRequest;
import com.lunatarot.backend.api.dto.ReadingResponse;
import com.lunatarot.backend.api.dto.ThreeCardRequest;
import com.lunatarot.backend.api.mapper.DtoMapper;
import com.lunatarot.backend.domain.model.ReadingEntity;
import com.lunatarot.backend.domain.model.UserEntity;
import com.lunatarot.backend.domain.model.enums.ReadingType;
import com.lunatarot.backend.domain.repository.UserRepository;
import com.lunatarot.backend.service.reading.CardOfDayService;
import com.lunatarot.backend.service.reading.OutcomeService;
import com.lunatarot.backend.service.reading.ReadingService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.NoSuchElementException;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@RestController
@RequestMapping("/api/reading")
public class ReadingController {

    private final ReadingService readingService;
    private final CardOfDayService cardOfDayService;
    private final OutcomeService outcomeService;
    private final UserRepository userRepository;
    private final DtoMapper mapper;

    public ReadingController(ReadingService readingService,
                             CardOfDayService cardOfDayService,
                             OutcomeService outcomeService,
                             UserRepository userRepository,
                             DtoMapper mapper) {
        this.readingService = readingService;
        this.cardOfDayService = cardOfDayService;
        this.outcomeService = outcomeService;
        this.userRepository = userRepository;
        this.mapper = mapper;
    }

    /**
     * Универсальный эндпоинт — Mini App пользуется им для всех спредов кроме карты дня.
     */
    @PostMapping
    public ResponseEntity<ReadingResponse> create(HttpServletRequest request,
                                                  @Valid @RequestBody CreateReadingRequest body) {
        if (body.spreadType() == ReadingType.CARD_OF_DAY) {
            throw new ResponseStatusException(BAD_REQUEST, "Карта дня создаётся через GET /api/reading/card-of-day");
        }
        if (body.question() == null || body.question().isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "Вопрос обязателен для расклада " + body.spreadType());
        }
        UserEntity user = currentUser(request);
        ReadingEntity reading = readingService.createReading(user, body.spreadType(), body.question());
        return ResponseEntity.ok(mapper.toReading(reading));
    }

    /** Backward-compatible alias на старый бот-флоу — пишет тип THREE_CARD. */
    @PostMapping("/3card")
    public ResponseEntity<ReadingResponse> threeCard(HttpServletRequest request,
                                                     @Valid @RequestBody ThreeCardRequest body) {
        UserEntity user = currentUser(request);
        ReadingEntity reading = readingService.createThreeCardReading(user, body.question());
        return ResponseEntity.ok(mapper.toReading(reading));
    }

    @GetMapping("/card-of-day")
    public ResponseEntity<ReadingResponse> cardOfDay(HttpServletRequest request) {
        UserEntity user = currentUser(request);
        ReadingEntity reading = cardOfDayService.getOrCreateCardOfDay(user);
        return ResponseEntity.ok(mapper.toReading(reading));
    }

    /** Поставить или обновить отметку «как сбылось». */
    @PostMapping("/{readingId}/outcome")
    public ResponseEntity<ReadingResponse> recordOutcome(HttpServletRequest request,
                                                         @PathVariable long readingId,
                                                         @Valid @RequestBody OutcomeRequest body) {
        long tgUserId = currentTgUserId(request);
        try {
            ReadingEntity updated = outcomeService.recordOutcome(tgUserId, readingId, body.status(), body.note());
            return ResponseEntity.ok(mapper.toReading(updated));
        } catch (NoSuchElementException e) {
            throw new ResponseStatusException(NOT_FOUND, e.getMessage(), e);
        }
    }

    /** Сбросить отметку (передумал). */
    @DeleteMapping("/{readingId}/outcome")
    public ResponseEntity<ReadingResponse> clearOutcome(HttpServletRequest request,
                                                        @PathVariable long readingId) {
        long tgUserId = currentTgUserId(request);
        try {
            ReadingEntity updated = outcomeService.clearOutcome(tgUserId, readingId);
            return ResponseEntity.ok(mapper.toReading(updated));
        } catch (NoSuchElementException e) {
            throw new ResponseStatusException(NOT_FOUND, e.getMessage(), e);
        }
    }

    private UserEntity currentUser(HttpServletRequest request) {
        Long tgUserId = (Long) request.getAttribute(AuthFilter.ATTR_TG_USER_ID);
        return userRepository.findByTgUserId(tgUserId).orElseThrow();
    }

    private static long currentTgUserId(HttpServletRequest request) {
        return (Long) request.getAttribute(AuthFilter.ATTR_TG_USER_ID);
    }
}
