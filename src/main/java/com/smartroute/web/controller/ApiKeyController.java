package com.smartroute.web.controller;

import com.smartroute.service.ApiKeyService;
import com.smartroute.web.dto.response.ApiKeyCreatedResponse;
import com.smartroute.web.dto.response.ApiKeyResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/developer/keys")
@PreAuthorize("hasRole('ADMIN')")
public class ApiKeyController {

    private final ApiKeyService apiKeyService;

    public ApiKeyController(ApiKeyService apiKeyService) {
        this.apiKeyService = apiKeyService;
    }

    @GetMapping
    public List<ApiKeyResponse> getAllKeys() {
        return apiKeyService.getAllKeys();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiKeyCreatedResponse createKey(@RequestBody Map<String, String> body) {
        String name = body.getOrDefault("name", "API Key");
        String role = body.getOrDefault("role", "ADMIN");
        return apiKeyService.createApiKey(name, role);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revokeKey(@PathVariable UUID id) {
        apiKeyService.revokeApiKey(id);
    }
}
