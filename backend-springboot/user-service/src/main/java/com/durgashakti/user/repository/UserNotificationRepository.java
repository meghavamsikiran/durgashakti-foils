package com.durgashakti.user.repository;

import com.durgashakti.common.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface UserNotificationRepository extends JpaRepository<Notification, UUID> {
    List<Notification> findByUserIdOrderByCreatedAtDesc(UUID userId);

    @Modifying
    @Query("DELETE FROM Notification n WHERE n.userId = :userId AND n.isRead = true AND n.createdAt < :cutoff")
    void deleteReadNotificationsOlderThan(@Param("userId") UUID userId, @Param("cutoff") OffsetDateTime cutoff);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.userId = :userId")
    void markAllAsRead(@Param("userId") UUID userId);
}
