package com.durgashakti.admin.controller;

import com.durgashakti.common.entity.User;
import com.durgashakti.admin.service.AdminUserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class AdminUserController {

    private final AdminUserService adminUserService;

    public AdminUserController(AdminUserService adminUserService) {
        this.adminUserService = adminUserService;
    }

    @GetMapping({"/users", "/customers"})
    public ResponseEntity<Map<String, Object>> listUsers() {
        List<User> users = adminUserService.listUsers();
        Map<String, Object> response = new java.util.HashMap<>();
        response.put("items", users);
        response.put("total", users.size());
        return ResponseEntity.ok(response);
    }

    @GetMapping({"/users/{id}", "/customers/{id}"})
    public ResponseEntity<User> getUser(@PathVariable("id") UUID id) {
        return ResponseEntity.ok(adminUserService.getUser(id));
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<User> updateUser(@PathVariable("id") UUID id, @RequestBody User user) {
        return ResponseEntity.ok(adminUserService.updateUser(id, user));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable("id") UUID id) {
        adminUserService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}
