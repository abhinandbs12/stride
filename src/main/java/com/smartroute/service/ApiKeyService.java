package com.smartroute.service;

import com.smartroute.domain.entity.ApiKey;
import com.smartroute.repository.ApiKeyRepository;
import com.smartroute.web.dto.response.ApiKeyCreatedResponse;
import com.smartroute.web.dto.response.ApiKeyResponse;
import com.smartroute.web.exception.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ApiKeyService {

    private final ApiKeyRepository apiKeyRepository;
    private final AuditService auditService;
    private final SecureRandom random = new SecureRandom();

    public ApiKeyService(ApiKeyRepository apiKeyRepository, AuditService auditService) {
        this.apiKeyRepository = apiKeyRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<ApiKeyResponse> getAllKeys() {
        return apiKeyRepository.findAll().stream()
                .map(k -> new ApiKeyResponse(
                        k.getId(), k.getName(), k.getKeyPrefix(), k.getRole(),
                        k.isActive(), k.getCreatedAt(), k.getLastUsedAt()
                ))
                .toList();
    }

    @Transactional
    public ApiKeyCreatedResponse createApiKey(String name, String role) {
        byte[] randomBytes = new byte[24];
        random.nextBytes(randomBytes);
        String rawSecret = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
        String plainKey = "stride_live_" + rawSecret;
        String prefix = plainKey.substring(0, 16) + "...";
        String hash = sha256Hex(plainKey);

        ApiKey key = new ApiKey();
        key.setName(name != null && !name.isBlank() ? name : "Default Integration Key");
        key.setKeyHash(hash);
        key.setKeyPrefix(prefix);
        key.setRole(role != null ? role : "ADMIN");
        key.setActive(true);

        ApiKey saved = apiKeyRepository.save(key);

        auditService.log("API_KEY_CREATED", "ApiKey", saved.getId(),
                java.util.Map.of("name", saved.getName(), "prefix", prefix));

        return new ApiKeyCreatedResponse(
                saved.getId(), saved.getName(), plainKey, prefix, saved.getRole(), saved.getCreatedAt()
        );
    }

    @Transactional
    public void revokeApiKey(UUID id) {
        ApiKey key = apiKeyRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("ApiKey", id));
        key.setActive(false);
        apiKeyRepository.save(key);

        auditService.log("API_KEY_REVOKED", "ApiKey", key.getId(),
                java.util.Map.of("name", key.getName()));
    }

    @Transactional
    public Optional<ApiKey> validateAndTouchKey(String plainKey) {
        if (plainKey == null || !plainKey.startsWith("stride_live_")) {
            return Optional.empty();
        }
        String hash = sha256Hex(plainKey.trim());
        Optional<ApiKey> apiKeyOpt = apiKeyRepository.findByKeyHashAndActiveTrue(hash);
        apiKeyOpt.ifPresent(k -> {
            k.setLastUsedAt(Instant.now());
            apiKeyRepository.save(k);
        });
        return apiKeyOpt;
    }

    private String sha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new RuntimeException("Failed to calculate SHA-256", e);
        }
    }
}
