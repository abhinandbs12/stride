package com.smartroute.security;

import com.smartroute.domain.entity.ApiKey;
import com.smartroute.domain.enums.Role;
import com.smartroute.service.ApiKeyService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

/**
 * Validates Bearer JWT token or X-API-Key and populates SecurityContext.
 */
@Component
public class JwtFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final ApiKeyService apiKeyService;

    public JwtFilter(JwtService jwtService, ApiKeyService apiKeyService) {
        this.jwtService = jwtService;
        this.apiKeyService = apiKeyService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String authHeader = req.getHeader("Authorization");
        String apiKeyHeader = req.getHeader("X-API-Key");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (jwtService.isValid(token)) {
                var auth = jwtService.buildAuthentication(token);
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        } else if (apiKeyHeader != null && !apiKeyHeader.isBlank()) {
            Optional<ApiKey> apiKeyOpt = apiKeyService.validateAndTouchKey(apiKeyHeader);
            if (apiKeyOpt.isPresent()) {
                ApiKey key = apiKeyOpt.get();
                Role roleEnum = "WH_MANAGER".equalsIgnoreCase(key.getRole()) ? Role.WH_MANAGER : Role.ADMIN;
                var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + roleEnum.name()));
                var auth = new UsernamePasswordAuthenticationToken(
                        new JwtPrincipal(key.getId(), "apikey:" + key.getName(), roleEnum),
                        null,
                        authorities
                );
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }

        chain.doFilter(req, res);
    }
}
