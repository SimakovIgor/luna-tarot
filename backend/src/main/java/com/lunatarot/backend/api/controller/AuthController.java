package com.lunatarot.backend.api.controller;

import com.lunatarot.backend.api.dto.AuthResponse;
import com.lunatarot.backend.api.dto.TgInitRequest;
import com.lunatarot.backend.domain.model.UserEntity;
import com.lunatarot.backend.domain.model.enums.BotConversationState;
import com.lunatarot.backend.domain.repository.UserRepository;
import com.lunatarot.backend.service.auth.AuthService;
import com.lunatarot.backend.service.auth.TgInitDataValidator;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final TgInitDataValidator initDataValidator;
    private final AuthService authService;
    private final UserRepository userRepository;

    public AuthController(TgInitDataValidator initDataValidator,
                          AuthService authService,
                          UserRepository userRepository) {
        this.initDataValidator = initDataValidator;
        this.authService = authService;
        this.userRepository = userRepository;
    }

    @PostMapping("/tg-init")
    @Transactional
    public ResponseEntity<AuthResponse> tgInit(@Valid @RequestBody TgInitRequest request) {
        Optional<Long> tgUserId = initDataValidator.validate(request.initData());
        if (tgUserId.isEmpty()) {
            return ResponseEntity.status(401).build();
        }
        // Подсасываем (или создаём) пользователя — Mini App может стартовать раньше, чем бот /start
        userRepository.findByTgUserId(tgUserId.get()).orElseGet(() -> userRepository.save(
            UserEntity.builder()
                .tgUserId(tgUserId.get())
                .name("друг")
                .conversationState(BotConversationState.NEW)
                .build()
        ));
        AuthService.IssuedToken issued = authService.issue(tgUserId.get());
        return ResponseEntity.ok(new AuthResponse(issued.token(), issued.expiresAtEpochSec()));
    }
}
