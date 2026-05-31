package com.lunatarot.backend.api.controller;

import com.lunatarot.backend.api.auth.AuthFilter;
import com.lunatarot.backend.api.dto.CompatibilityHistoryItemDto;
import com.lunatarot.backend.api.dto.CompatibilityInviteInfoDto;
import com.lunatarot.backend.api.dto.CompatibilityInviteResponseDto;
import com.lunatarot.backend.api.dto.CompatibilityPendingItemDto;
import com.lunatarot.backend.api.dto.CompatibilityRequestDto;
import com.lunatarot.backend.api.dto.CompatibilityResponseDto;
import com.lunatarot.backend.domain.model.CompatibilityCheckEntity;
import com.lunatarot.backend.domain.model.UserEntity;
import com.lunatarot.backend.domain.repository.UserRepository;
import com.lunatarot.backend.service.compatibility.CompatibilityRequest;
import com.lunatarot.backend.service.compatibility.CompatibilityResult;
import com.lunatarot.backend.service.compatibility.CompatibilityService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@RestController
@RequestMapping("/api/compatibility")
public class CompatibilityController {

    private final CompatibilityService compatibilityService;
    private final UserRepository userRepository;

    public CompatibilityController(CompatibilityService compatibilityService,
                                   UserRepository userRepository) {
        this.compatibilityService = compatibilityService;
        this.userRepository = userRepository;
    }

    @PostMapping
    public ResponseEntity<CompatibilityResponseDto> calculate(HttpServletRequest request,
                                                              @Valid @RequestBody CompatibilityRequestDto body) {
        UserEntity me = currentUser(request);
        try {
            CompatibilityResult result = compatibilityService.calculate(
                new CompatibilityRequest(me, body.partnerName(), body.partnerBirthDate())
            );
            return ResponseEntity.ok(new CompatibilityResponseDto(
                result.myZodiac(), result.partnerZodiac(), result.partnerName(),
                result.score(), result.text()
            ));
        } catch (IllegalArgumentException | IllegalStateException e) {
            throw new ResponseStatusException(BAD_REQUEST, e.getMessage(), e);
        }
    }

    /**
     * История совместимостей юзера для Дневника — solo + invite, в которых
     * он либо инициатор, либо партнёр. Только COMPLETED.
     */
    @GetMapping("/history")
    public List<CompatibilityHistoryItemDto> history(HttpServletRequest request) {
        UserEntity me = currentUser(request);
        List<CompatibilityCheckEntity> items = compatibilityService.historyFor(me.getId());
        return items.stream()
            .map(c -> new CompatibilityHistoryItemDto(
                c.getId(),
                c.getInitiatorUserId().equals(me.getId()) ? "INITIATOR" : "PARTNER",
                c.getPartnerName(),
                c.getInitiatorZodiac(),
                c.getPartnerZodiac(),
                c.getScore(),
                c.getResultText(),
                c.getCreatedAt()
            ))
            .toList();
    }

    /** Создать invite-ссылку (текущий юзер = инициатор). */
    @PostMapping("/invite")
    public CompatibilityInviteResponseDto createInvite(HttpServletRequest request) {
        UserEntity me = currentUser(request);
        try {
            CompatibilityCheckEntity created = compatibilityService.createInvite(me);
            String url = compatibilityService.buildShareUrl(created.getInviteSlug());
            return new CompatibilityInviteResponseDto(created.getInviteSlug(), url);
        } catch (IllegalStateException e) {
            throw new ResponseStatusException(BAD_REQUEST, e.getMessage(), e);
        }
    }

    /** Список pending-приглашений инициатора. Показывается в Дневнике как «ждут ответа». */
    @GetMapping("/pending")
    public List<CompatibilityPendingItemDto> pending(HttpServletRequest request) {
        UserEntity me = currentUser(request);
        return compatibilityService.pendingFor(me.getId()).stream()
            .map(c -> new CompatibilityPendingItemDto(
                c.getId(),
                c.getInviteSlug(),
                compatibilityService.buildShareUrl(c.getInviteSlug()),
                c.getCreatedAt()
            ))
            .toList();
    }

    /** Friend перешёл по ссылке — отдаём инфо о приглашении (имя инициатора, его знак). */
    @GetMapping("/invite/{slug}")
    public CompatibilityInviteInfoDto getInvite(@PathVariable String slug) {
        CompatibilityCheckEntity entity = compatibilityService.findPendingInvite(slug)
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Приглашение не найдено"));
        UserEntity initiator = userRepository.findById(entity.getInitiatorUserId())
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Инициатор не найден"));
        return new CompatibilityInviteInfoDto(
            entity.getInviteSlug(),
            initiator.getName(),
            entity.getInitiatorZodiac(),
            entity.getStatus().name()
        );
    }

    /** Friend принимает приглашение: его данные → совместный результат. */
    @PostMapping("/invite/{slug}/accept")
    public CompatibilityResponseDto acceptInvite(HttpServletRequest request,
                                                 @PathVariable String slug) {
        UserEntity friend = currentUser(request);
        try {
            CompatibilityCheckEntity entity = compatibilityService.findPendingInvite(slug)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Приглашение не найдено"));
            UserEntity initiator = userRepository.findById(entity.getInitiatorUserId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Инициатор не найден"));
            CompatibilityCheckEntity completed = compatibilityService.acceptInvite(slug, friend, initiator);
            return new CompatibilityResponseDto(
                friend.getId().equals(completed.getInitiatorUserId())
                    ? completed.getInitiatorZodiac() : completed.getPartnerZodiac(),
                friend.getId().equals(completed.getInitiatorUserId())
                    ? completed.getPartnerZodiac() : completed.getInitiatorZodiac(),
                friend.getId().equals(completed.getInitiatorUserId())
                    ? completed.getPartnerName() : initiator.getName(),
                completed.getScore(),
                completed.getResultText()
            );
        } catch (IllegalArgumentException | IllegalStateException e) {
            throw new ResponseStatusException(BAD_REQUEST, e.getMessage(), e);
        }
    }

    private UserEntity currentUser(HttpServletRequest request) {
        Long tgUserId = (Long) request.getAttribute(AuthFilter.ATTR_TG_USER_ID);
        return userRepository.findByTgUserId(tgUserId).orElseThrow();
    }
}
