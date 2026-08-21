package com.smartroute.service;

import com.smartroute.domain.entity.User;
import com.smartroute.repository.UserRepository;
import com.smartroute.security.JwtService;
import com.smartroute.web.dto.request.LoginRequest;
import com.smartroute.web.dto.request.RefreshTokenRequest;
import com.smartroute.web.dto.request.RegisterRequest;
import com.smartroute.web.dto.response.AuthResponse;
import com.smartroute.web.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class AuthenticationService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthenticationService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByEmail(req.email())) {
            throw new ApiException("Email already in use", HttpStatus.CONFLICT, "EMAIL_IN_USE") {};
        }

        User user = new User();
        user.setEmail(req.email());
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        user.setRole(req.role());

        // Save the user first so that the UUID is generated and set by Hibernate
        user = userRepository.saveAndFlush(user);

        // Now generate the tokens which depend on user.getId()
        String refreshToken = jwtService.generateRefreshToken(user);
        user.setRefreshTokenHash(passwordEncoder.encode(refreshToken));
        
        // Save again to persist the refresh token hash
        userRepository.save(user);

        String accessToken = jwtService.generateAccessToken(user);

        return new AuthResponse(accessToken, refreshToken, user.getRole().name(), user.getId());
    }

    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByEmail(req.email())
                .orElseThrow(() -> new ApiException("Invalid email or password", HttpStatus.UNAUTHORIZED, "UNAUTHORIZED") {});

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new ApiException("Invalid email or password", HttpStatus.UNAUTHORIZED, "UNAUTHORIZED") {};
        }

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);
        
        user.setRefreshTokenHash(passwordEncoder.encode(refreshToken));
        userRepository.save(user); // read-only lookup technically, but we update the refresh token hash on login

        return new AuthResponse(accessToken, refreshToken, user.getRole().name(), user.getId());
    }

    public AuthResponse refresh(RefreshTokenRequest req) {
        if (!jwtService.isValid(req.refreshToken())) {
            throw new ApiException("Invalid refresh token", HttpStatus.UNAUTHORIZED, "UNAUTHORIZED") {};
        }

        var principal = jwtService.extractPrincipal(req.refreshToken());
        User user = userRepository.findById(principal.userId())
                .orElseThrow(() -> new ApiException("User not found", HttpStatus.UNAUTHORIZED, "UNAUTHORIZED") {});

        if (user.getRefreshTokenHash() == null || !passwordEncoder.matches(req.refreshToken(), user.getRefreshTokenHash())) {
            throw new ApiException("Invalid refresh token", HttpStatus.UNAUTHORIZED, "UNAUTHORIZED") {};
        }

        String accessToken = jwtService.generateAccessToken(user);
        String newRefreshToken = jwtService.generateRefreshToken(user);
        
        user.setRefreshTokenHash(passwordEncoder.encode(newRefreshToken));
        userRepository.save(user);

        return new AuthResponse(accessToken, newRefreshToken, user.getRole().name(), user.getId());
    }
}
