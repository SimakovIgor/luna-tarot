package com.lunatarot.backend.api.controller;

import com.lunatarot.backend.api.auth.AuthFilter;
import com.lunatarot.backend.api.dto.MeResponse;
import com.lunatarot.backend.api.dto.UpdateMeRequest;
import com.lunatarot.backend.api.mapper.DtoMapper;
import com.lunatarot.backend.domain.model.UserEntity;
import com.lunatarot.backend.domain.model.enums.BotConversationState;
import com.lunatarot.backend.domain.repository.UserRepository;
import com.lunatarot.backend.service.EsotericProfile;
import com.lunatarot.backend.service.EsotericProfileCalculator;
import com.lunatarot.backend.service.donation.DonationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/me")
public class MeController {

    private final UserRepository userRepository;
    private final EsotericProfileCalculator esotericProfileCalculator;
    private final DonationService donationService;
    private final DtoMapper mapper;

    public MeController(UserRepository userRepository,
                        EsotericProfileCalculator esotericProfileCalculator,
                        DonationService donationService,
                        DtoMapper mapper) {
        this.userRepository = userRepository;
        this.esotericProfileCalculator = esotericProfileCalculator;
        this.donationService = donationService;
        this.mapper = mapper;
    }

    @GetMapping
    public ResponseEntity<MeResponse> me(HttpServletRequest request) {
        Long tgUserId = (Long) request.getAttribute(AuthFilter.ATTR_TG_USER_ID);
        UserEntity user = userRepository.findByTgUserId(tgUserId).orElseThrow();
        long donated = donationService.totalStarsByUser(tgUserId);
        return ResponseEntity.ok(mapper.toMe(user, donated));
    }

    /**
     * Онбординг из Mini App: ввели имя/пол/ДР → присвоили + посчитали эзо-профиль + READY.
     */
    @PutMapping
    @Transactional
    public ResponseEntity<MeResponse> updateMe(HttpServletRequest request, @Valid @RequestBody UpdateMeRequest body) {
        Long tgUserId = (Long) request.getAttribute(AuthFilter.ATTR_TG_USER_ID);
        UserEntity user = userRepository.findByTgUserId(tgUserId).orElseThrow();
        user.setName(body.name());
        user.setGender(body.gender());
        user.setBirthDate(body.birthDate());

        EsotericProfile profile = esotericProfileCalculator.calculate(body.birthDate());
        user.setZodiac(profile.zodiac());
        user.setLifePathNumber(profile.lifePathNumber());
        user.setLunarPhase(profile.lunarPhase());
        user.setConversationState(BotConversationState.READY);

        long donated = donationService.totalStarsByUser(tgUserId);
        return ResponseEntity.ok(mapper.toMe(user, donated));
    }
}
