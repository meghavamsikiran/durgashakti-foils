package com.durgashakti.order.repository;

import com.durgashakti.common.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {
    
    List<ChatMessage> findBySessionIdOrderByCreatedAtAsc(String sessionId);
    
    List<ChatMessage> findByUserIdOrderByCreatedAtAsc(UUID userId);

    @Modifying
    @Transactional
    @Query("DELETE FROM ChatMessage c WHERE c.createdAt < :cutoff")
    void deleteExpiredChats(@Param("cutoff") OffsetDateTime cutoff);
}
