package com.smartroute.web.controller;

import com.smartroute.service.ProductService;
import com.smartroute.web.dto.request.CreateProductRequest;
import com.smartroute.web.dto.request.UpdateProductRequest;
import com.smartroute.web.dto.response.PageResponse;
import com.smartroute.web.dto.response.ProductResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/products")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    public PageResponse<ProductResponse> getAll(@RequestParam(required = false) String category, Pageable pageable) {
        return productService.findAll(category, pageable);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPPLIER')")
    public ProductResponse create(@Valid @RequestBody CreateProductRequest req) {
        return productService.create(req);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPPLIER')")
    public ProductResponse update(@PathVariable UUID id, @Valid @RequestBody UpdateProductRequest req) {
        return productService.update(id, req);
    }
}
