package com.lunatarot.backend.api.auth;

import com.lunatarot.backend.service.auth.AuthService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;

/**
 * Простой Bearer-фильтр на /api/** (кроме /api/auth/**).
 * Кладёт Telegram userId в request attribute {@link #ATTR_TG_USER_ID}.
 *
 * Не использует Spring Security — на MVP это лишний overhead; перейдём, когда
 * появятся роли/scope.
 */
@Component
public class AuthFilter extends OncePerRequestFilter {

    public static final String ATTR_TG_USER_ID = "luna.tgUserId";
    private static final String API_PREFIX = "/api/";
    private static final String AUTH_PREFIX = "/api/auth/";
    private static final String BEARER = "Bearer ";

    private final AuthService authService;

    public AuthFilter(AuthService authService) {
        this.authService = authService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String path = request.getRequestURI();
        boolean isPublic = !path.startsWith(API_PREFIX) || path.startsWith(AUTH_PREFIX);
        if (isPublic) {
            chain.doFilter(request, response);
        } else {
            tryAuthenticate(request, response, chain);
        }
    }

    private void tryAuthenticate(HttpServletRequest request,
                                 HttpServletResponse response,
                                 FilterChain chain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith(BEARER)) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Missing Bearer token");
        } else {
            Optional<Long> userId = authService.validate(header.substring(BEARER.length()));
            if (userId.isEmpty()) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid or expired token");
            } else {
                request.setAttribute(ATTR_TG_USER_ID, userId.get());
                chain.doFilter(request, response);
            }
        }
    }
}
