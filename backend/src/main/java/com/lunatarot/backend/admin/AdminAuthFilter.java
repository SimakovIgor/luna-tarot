package com.lunatarot.backend.admin;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;

/**
 * HTTP Basic auth для {@code /admin/**}. Реализован руками — Spring Security ради одного
 * пароля избыточен. Сравнение паролей выполняется константно по времени.
 *
 * Если {@code luna.admin.username/password} не заданы — все запросы на {@code /admin/**}
 * получают 503, чтобы случайно не оставить открытую панель в проде.
 */
@Component
public class AdminAuthFilter extends OncePerRequestFilter {

    private static final String ADMIN_PREFIX = "/admin/";
    private static final String ADMIN_ROOT = "/admin";
    private static final String BASIC = "Basic ";
    private static final String REALM = "Basic realm=\"Luna admin\", charset=\"UTF-8\"";

    private final AdminProperties properties;

    public AdminAuthFilter(AdminProperties properties) {
        this.properties = properties;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String path = request.getRequestURI();
        boolean isAdminPath = path.startsWith(ADMIN_PREFIX) || ADMIN_ROOT.equals(path);
        if (isAdminPath && properties.isConfigured()) {
            tryAuthenticate(request, response, chain);
        } else if (isAdminPath) {
            response.sendError(HttpServletResponse.SC_SERVICE_UNAVAILABLE, "Admin disabled");
        } else {
            chain.doFilter(request, response);
        }
    }

    private void tryAuthenticate(HttpServletRequest request,
                                 HttpServletResponse response,
                                 FilterChain chain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith(BASIC)) {
            challenge(response);
            return;
        }
        String decoded = decode(header.substring(BASIC.length()));
        int colon = decoded.indexOf(':');
        if (colon >= 0 && credentialsMatch(decoded.substring(0, colon), decoded.substring(colon + 1))) {
            chain.doFilter(request, response);
        } else {
            challenge(response);
        }
    }

    private boolean credentialsMatch(String user, String pass) {
        return constantTimeEquals(user, properties.username())
            && constantTimeEquals(pass, properties.password());
    }

    private static String decode(String token) {
        try {
            return new String(Base64.getDecoder().decode(token), StandardCharsets.UTF_8);
        } catch (IllegalArgumentException e) {
            return "";
        }
    }

    private static boolean constantTimeEquals(String a, String b) {
        byte[] aBytes = a.getBytes(StandardCharsets.UTF_8);
        byte[] bBytes = b.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(aBytes, bBytes);
    }

    private static void challenge(HttpServletResponse response) throws IOException {
        response.setHeader("WWW-Authenticate", REALM);
        response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Authentication required");
    }
}
