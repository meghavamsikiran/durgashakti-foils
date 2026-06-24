package com.durgashakti.admin.service;

import com.durgashakti.common.entity.User;
import java.util.List;
import java.util.UUID;

public interface AdminUserService {
    List<User> listUsers();
    User getUser(UUID id);
    User updateUser(UUID id, User updatedUser);
    void deleteUser(UUID id);
}
