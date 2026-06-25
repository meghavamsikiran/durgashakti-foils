package com.durgashakti.common.entity;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import org.hibernate.annotations.Type;

import java.time.OffsetDateTime;
import java.util.Map;

/**
 * Settings table — key-value configuration store with JSONB values.
 */
@Entity
@Table(name = "settings")
public class Setting {

    @Id
    @Column(length = 255)
    private String key;

    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> value;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    // ── Getters & Setters ──────────────────────────────────────────
    public String getKey() { return key; }
    public void setKey(String key) { this.key = key; }

    public Map<String, Object> getValue() { return value; }
    public void setValue(Map<String, Object> value) { this.value = value; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
