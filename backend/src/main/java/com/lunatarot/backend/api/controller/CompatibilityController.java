package com.lunatarot.backend.api.controller;

import com.lunatarot.backend.api.auth.AuthFilter;
import com.lunatarot.backend.api.dto.CompatibilityRequestDto;
import com.lunatarot.backend.api.dto.CompatibilityResponseDto;
import com.lunatarot.backend.domain.model.UserEntity;
import com.lunatarot.backend.domain.repository.UserRepository;
import com.lunatarot.backend.service.compatibility.CompatibilityRequest;
import com.lunatarot.backend.service.compatibility.CompatibilityResult;
import com.lunatarot.backend.service.compatibility.CompatibilityService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

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

    private UserEntity currentUser(HttpServletRequest request) {
        Long tgUserId = (Long) request.getAttribute(AuthFilter.ATTR_TG_USER_ID);
        return userRepository.findByTgUserId(tgUserId).orElseThrow();
    }
}
