package com.smartroute.routing.model;

import java.util.UUID;

public record LineRequest(
    UUID productId,
    int quantityRequested
) {}
