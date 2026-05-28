package com.lunatarot.backend.api.controller;

import com.lunatarot.backend.api.auth.AuthFilter;
import com.lunatarot.backend.api.dto.HoroscopeResponse;
import com.lunatarot.backend.domain.model.DailyHoroscopeEntity;
import com.lunatarot.backend.domain.model.UserEntity;
import com.lunatarot.backend.domain.repository.UserRepository;
import com.lunatarot.backend.service.horoscope.HoroscopeService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/horoscope")
public class HoroscopeController {

    private final HoroscopeService horoscopeService;
    private final UserRepository userRepository;

    public HoroscopeController(HoroscopeService horoscopeService, UserRepository userRepository) {
        this.horoscopeService = horoscopeService;
        this.userRepository = userRepository;
    }

    @GetMapping("/today")
    public ResponseEntity<HoroscopeResponse> today(HttpServletRequest request) {
        UserEntity user = currentUser(request);
        DailyHoroscopeEntity horoscope = horoscopeService.getOrCreateToday(user);
        return ResponseEntity.ok(new HoroscopeResponse(
            horoscope.getHoroDate(), user.getZodiac(), horoscope.getText()
        ));
    }

    private UserEntity currentUser(HttpServletRequest request) {
        Long tgUserId = (Long) request.getAttribute(AuthFilter.ATTR_TG_USER_ID);
        return userRepository.findByTgUserId(tgUserId).orElseThrow();
    }
}
