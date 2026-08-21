package com.smartroute.service;

import com.smartroute.domain.entity.Customer;
import com.smartroute.repository.CustomerRepository;
import com.smartroute.web.dto.request.CreateCustomerRequest;
import com.smartroute.web.dto.response.CustomerResponse;
import com.smartroute.web.dto.response.PageResponse;
import com.smartroute.web.exception.ApiException;
import com.smartroute.web.exception.EntityNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class CustomerService {

    private final CustomerRepository customerRepository;

    public CustomerService(CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }

    public PageResponse<CustomerResponse> findAll(Pageable pageable) {
        Page<Customer> page = customerRepository.findAll(pageable);
        return new PageResponse<>(
            page.getContent().stream().map(this::mapToResponse).toList(),
            page.getNumber(),
            page.getSize(),
            page.getTotalElements(),
            page.getTotalPages()
        );
    }

    @Transactional
    public CustomerResponse create(CreateCustomerRequest req) {
        if (req.email() != null && !req.email().isBlank() && customerRepository.findByEmail(req.email()).isPresent()) {
            throw new ApiException("Email already in use", HttpStatus.CONFLICT, "EMAIL_IN_USE") {};
        }

        Customer c = new Customer();
        c.setName(req.name());
        c.setEmail(req.email());
        c.setPhone(req.phone());
        c.setAddress(req.address());
        c.setLatitude(req.latitude());
        c.setLongitude(req.longitude());
        
        return mapToResponse(customerRepository.save(c));
    }

    @Transactional
    public CustomerResponse update(UUID id, CreateCustomerRequest req) {
        Customer c = customerRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Customer", id));

        if (req.name() != null) c.setName(req.name());
        if (req.email() != null) c.setEmail(req.email());
        if (req.phone() != null) c.setPhone(req.phone());
        if (req.address() != null) c.setAddress(req.address());
        if (req.latitude() != 0) c.setLatitude(req.latitude());
        if (req.longitude() != 0) c.setLongitude(req.longitude());

        return mapToResponse(customerRepository.save(c));
    }

    private CustomerResponse mapToResponse(Customer c) {
        return new CustomerResponse(
            c.getId(), c.getName(), c.getEmail(), c.getPhone(),
            c.getAddress(), c.getLatitude(), c.getLongitude()
        );
    }
}
