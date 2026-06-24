package com.durgashakti.common.entity;

import jakarta.persistence.*;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * GST imports table — file upload metadata for bulk GST record imports.
 */
@Entity
@Table(name = "gst_imports")
public class GstImport {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "file_name", length = 255, nullable = false)
    private String fileName;

    @Column(name = "uploaded_by", length = 255, nullable = false)
    private String uploadedBy;

    @Column(name = "upload_date", nullable = false)
    private OffsetDateTime uploadDate;

    @Column(name = "record_count", nullable = false)
    private Integer recordCount = 0;

    @Column(name = "error_count", nullable = false)
    private Integer errorCount = 0;

    @Column(length = 50, nullable = false)
    private String status = "completed";

    // ── Getters & Setters ──────────────────────────────────────────
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public String getUploadedBy() { return uploadedBy; }
    public void setUploadedBy(String uploadedBy) { this.uploadedBy = uploadedBy; }

    public OffsetDateTime getUploadDate() { return uploadDate; }
    public void setUploadDate(OffsetDateTime uploadDate) { this.uploadDate = uploadDate; }

    public Integer getRecordCount() { return recordCount; }
    public void setRecordCount(Integer recordCount) { this.recordCount = recordCount; }

    public Integer getErrorCount() { return errorCount; }
    public void setErrorCount(Integer errorCount) { this.errorCount = errorCount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
