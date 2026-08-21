package com.smartroute.web.controller;

import com.smartroute.service.CustomerService;
import com.smartroute.web.dto.request.CreateCustomerRequest;
import com.smartroute.web.dto.response.CustomerResponse;
import com.smartroute.web.dto.response.PageResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/customers")
public class CustomerController {

    private final CustomerService customerService;

    public CustomerController(CustomerService customerService) {
        this.customerService = customerService;
    }

    @GetMapping
    public PageResponse<CustomerResponse> getAll(Pageable pageable) {
        return customerService.findAll(pageable);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CustomerResponse create(@Valid @RequestBody CreateCustomerRequest req) {
        return customerService.create(req);
    }

    @PatchMapping("/{id}")
    public CustomerResponse update(@PathVariable UUID id, @Valid @RequestBody CreateCustomerRequest req) {
        return customerService.update(id, req);
    }
}
