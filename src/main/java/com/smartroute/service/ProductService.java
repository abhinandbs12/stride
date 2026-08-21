package com.smartroute.service;

import com.smartroute.domain.entity.Product;
import com.smartroute.repository.ProductRepository;
import com.smartroute.web.dto.request.CreateProductRequest;
import com.smartroute.web.dto.request.UpdateProductRequest;
import com.smartroute.web.dto.response.PageResponse;
import com.smartroute.web.dto.response.ProductResponse;
import com.smartroute.web.exception.ApiException;
import com.smartroute.web.exception.EntityNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class ProductService {

    private final ProductRepository productRepository;

    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    public PageResponse<ProductResponse> findAll(String category, Pageable pageable) {
        Page<Product> page = (category != null && !category.isBlank()) 
            ? productRepository.findByCategoryIgnoreCase(category, pageable)
            : productRepository.findAll(pageable);
            
        return new PageResponse<>(
            page.getContent().stream().map(this::mapToResponse).toList(),
            page.getNumber(),
            page.getSize(),
            page.getTotalElements(),
            page.getTotalPages()
        );
    }

    @Transactional
    public ProductResponse create(CreateProductRequest req) {
        if (productRepository.findBySku(req.sku()).isPresent()) {
            throw new ApiException("SKU already exists", HttpStatus.CONFLICT, "SKU_EXISTS") {};
        }

        Product p = new Product();
        p.setSku(req.sku());
        p.setName(req.name());
        p.setCategory(req.category());
        p.setUnitWeightKg(req.unitWeightKg());
        if (req.reorderThreshold() != null) {
            p.setReorderThreshold(req.reorderThreshold());
        }
        
        return mapToResponse(productRepository.save(p));
    }

    @Transactional
    public ProductResponse update(UUID id, UpdateProductRequest req) {
        Product p = productRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Product", id));

        if (req.name() != null) p.setName(req.name());
        if (req.category() != null) p.setCategory(req.category());
        if (req.unitWeightKg() != null) p.setUnitWeightKg(req.unitWeightKg());
        if (req.reorderThreshold() != null) p.setReorderThreshold(req.reorderThreshold());

        return mapToResponse(productRepository.save(p));
    }

    private ProductResponse mapToResponse(Product p) {
        return new ProductResponse(
            p.getId(), p.getSku(), p.getName(), p.getCategory(),
            p.getUnitWeightKg(), p.getReorderThreshold()
        );
    }
}
