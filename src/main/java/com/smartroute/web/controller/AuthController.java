package com.smartroute.web.controller;

import com.smartroute.service.AuthenticationService;
import com.smartroute.web.dto.request.LoginRequest;
import com.smartroute.web.dto.request.RefreshTokenRequest;
import com.smartroute.web.dto.request.RegisterRequest;
import com.smartroute.web.dto.response.AuthResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthenticationService authService;

    public AuthController(AuthenticationService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest req) {
        return authService.register(req);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req) {
        return authService.login(req);
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@Valid @RequestBody RefreshTokenRequest req) {
        return authService.refresh(req);
    }
}
