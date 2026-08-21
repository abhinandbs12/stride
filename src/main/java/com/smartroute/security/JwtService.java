package com.smartroute.security;

import com.smartroute.config.JwtProperties;
import com.smartroute.domain.entity.User;
import com.smartroute.domain.enums.Role;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;
import java.util.UUID;

@Service
public class JwtService {

    private final JwtProperties properties;
    private final SecretKey key;

    public JwtService(JwtProperties properties) {
        this.properties = properties;
        this.key = Keys.hmacShaKeyFor(properties.secret().getBytes(StandardCharsets.UTF_8));
    }

    public String generateAccessToken(User user) {
        return Jwts.builder()
            .subject(user.getId().toString())
            .claim("email", user.getEmail())
            .claim("role", user.getRole().name())
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + properties.accessTokenExpiryMinutes() * 60 * 1000))
            .signWith(key)
            .compact();
    }

    public String generateRefreshToken(User user) {
        return Jwts.builder()
            .subject(user.getId().toString())
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + properties.refreshTokenExpiryDays() * 24 * 60 * 60 * 1000))
            .signWith(key)
            .compact();
    }

    public boolean isValid(String token) {
        try {
            Jwts.parser().verifyWith(key).build().parseSignedClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public JwtPrincipal extractPrincipal(String token) {
        Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
        return new JwtPrincipal(
            UUID.fromString(claims.getSubject()),
            claims.get("email", String.class),
            Role.valueOf(claims.get("role", String.class))
        );
    }

    public UsernamePasswordAuthenticationToken buildAuthentication(String token) {
        JwtPrincipal principal = extractPrincipal(token);
        return new UsernamePasswordAuthenticationToken(
            principal,
            null,
            List.of(new SimpleGrantedAuthority("ROLE_" + principal.role().name()))
        );
    }
}
