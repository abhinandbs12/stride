package com.smartroute.web.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record AdjustQuantityRequest(
    @NotNull @Min(0) Integer quantity
) {}
