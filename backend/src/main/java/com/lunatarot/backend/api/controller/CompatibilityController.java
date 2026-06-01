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
import com.lunatarot.backend.domain.model.enums.CompatibilityStatus;
import com.lunatarot.backend.domain.repository.UserRepository;
import com.lunatarot.backend.service.compatibility.CompatibilityRequest;
import com.lunatarot.backend.service.compatibility.CompatibilityResult;
import com.lunatarot.backend.service.compatibility.CompatibilityService;
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

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

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
     *
     * Для role=PARTNER подставляем имя инициатора (не partner_name — там лежит
     * имя самого юзера, друг видел бы «совместимость с собой»). Имена тянем
     * одним запросом findAllById, чтобы не плодить N+1.
     */
    @GetMapping("/history")
    public List<CompatibilityHistoryItemDto> history(HttpServletRequest request) {
        UserEntity me = currentUser(request);
        List<CompatibilityCheckEntity> items = compatibilityService.historyFor(me.getId());
        Set<Long> initiatorIds = items.stream()
            .filter(c -> !c.getInitiatorUserId().equals(me.getId()))
            .map(CompatibilityCheckEntity::getInitiatorUserId)
            .collect(Collectors.toCollection(HashSet::new));
        Map<Long, String> initiatorNames = userRepository.findAllById(initiatorIds).stream()
            .collect(Collectors.toMap(UserEntity::getId, UserEntity::getName));
        return items.stream()
            .map(c -> {
                boolean amInitiator = c.getInitiatorUserId().equals(me.getId());
                String displayName = amInitiator
                    ? c.getPartnerName()
                    : initiatorNames.getOrDefault(c.getInitiatorUserId(), "—");
                return new CompatibilityHistoryItemDto(
                    c.getId(),
                    amInitiator ? "INITIATOR" : "PARTNER",
                    displayName,
                    amInitiator ? c.getInitiatorZodiac() : c.getPartnerZodiac(),
                    amInitiator ? c.getPartnerZodiac() : c.getInitiatorZodiac(),
                    c.getScore(),
                    c.getResultText(),
                    c.getCreatedAt()
                );
            })
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

    /** Инициатор удаляет своё pending-приглашение (если друг так и не открыл). */
    @DeleteMapping("/invite/{slug}")
    public ResponseEntity<Void> cancelInvite(HttpServletRequest request, @PathVariable String slug) {
        UserEntity me = currentUser(request);
        try {
            compatibilityService.cancelInvite(slug, me.getId());
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(BAD_REQUEST, e.getMessage(), e);
        }
    }

    /**
     * Friend перешёл по ссылке — отдаём инфо о приглашении.
     *
     * Для PENDING — имя/знак инициатора (чтобы экран invitee показал «{Имя}
     * зовёт тебя к Луне»).
     *
     * Для COMPLETED — если текущий юзер участник (инициатор или партнёр),
     * сразу отдаём полный результат с его «my-перспективы». Это нужно для
     * сценария «принял → app свернули → вернулся по ссылке»: фронт сразу
     * покажет финальный экран без повторного accept'а.
     */
    @GetMapping("/invite/{slug}")
    public CompatibilityInviteInfoDto getInvite(HttpServletRequest request,
                                                @PathVariable String slug) {
        UserEntity me = currentUser(request);
        CompatibilityCheckEntity entity = compatibilityService.findInviteForUser(slug, me.getId())
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Приглашение не найдено"));
        UserEntity initiator = compatibilityService.findInitiator(entity)
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Инициатор не найден"));
        CompatibilityResponseDto result = null;
        if (entity.getStatus() == CompatibilityStatus.COMPLETED) {
            result = resultFromPerspective(entity, me, initiator);
        }
        return new CompatibilityInviteInfoDto(
            entity.getInviteSlug(),
            initiator.getName(),
            entity.getInitiatorZodiac(),
            entity.getStatus().name(),
            result
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
            UserEntity initiator = compatibilityService.findInitiator(entity)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Инициатор не найден"));
            CompatibilityCheckEntity completed = compatibilityService.acceptInvite(slug, friend, initiator);
            return resultFromPerspective(completed, friend, initiator);
        } catch (IllegalArgumentException | IllegalStateException e) {
            throw new ResponseStatusException(BAD_REQUEST, e.getMessage(), e);
        }
    }

    /**
     * Собирает result-DTO с точки зрения текущего юзера. «My» — это тот, кто
     * смотрит. «Partner» — второй участник. Для инициатора это сам partner,
     * для друга — инициатор (тогда partnerName берём из его профиля, чтобы
     * не светить хранимое в записи имя «—» если кейс кривой).
     */
    private static CompatibilityResponseDto resultFromPerspective(CompatibilityCheckEntity entity,
                                                                  UserEntity viewer,
                                                                  UserEntity initiator) {
        boolean amInitiator = entity.getInitiatorUserId().equals(viewer.getId());
        return new CompatibilityResponseDto(
            amInitiator ? entity.getInitiatorZodiac() : entity.getPartnerZodiac(),
            amInitiator ? entity.getPartnerZodiac() : entity.getInitiatorZodiac(),
            amInitiator ? entity.getPartnerName() : initiator.getName(),
            entity.getScore(),
            entity.getResultText()
        );
    }

    private UserEntity currentUser(HttpServletRequest request) {
        Long tgUserId = (Long) request.getAttribute(AuthFilter.ATTR_TG_USER_ID);
        return userRepository.findByTgUserId(tgUserId).orElseThrow();
    }
}
