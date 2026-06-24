package com.durgashakti.notification.repository;

import com.durgashakti.common.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface NotificationServiceRepository extends JpaRepository<Notification, UUID> {
}
