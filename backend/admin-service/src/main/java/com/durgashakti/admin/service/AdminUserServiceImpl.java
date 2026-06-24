package com.durgashakti.admin.service;

import com.durgashakti.common.entity.User;
import com.durgashakti.admin.repository.AdminUserRepository;
import com.durgashakti.common.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class AdminUserServiceImpl implements AdminUserService {

    private final AdminUserRepository userRepository;

    public AdminUserServiceImpl(AdminUserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<User> listUsers() {
        return userRepository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public User getUser(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
    }

    @Override
    public User updateUser(UUID id, User updatedUser) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));

        u.setFullName(updatedUser.getFullName());
        u.setPhone(updatedUser.getPhone());
        u.setRole(updatedUser.getRole());
        u.setStatus(updatedUser.getStatus());
        u.setIsActive(updatedUser.getIsActive());
        u.setPermissions(updatedUser.getPermissions());

        return userRepository.save(u);
    }

    @Override
    public void deleteUser(UUID id) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        userRepository.delete(u);
    }
}
