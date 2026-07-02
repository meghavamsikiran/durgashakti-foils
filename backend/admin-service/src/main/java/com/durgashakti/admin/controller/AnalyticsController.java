package com.durgashakti.admin.controller;

import com.durgashakti.admin.service.AnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping({"/analytics", "/admin/analytics/summary"})
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> getDashboardSummary(
            @RequestParam(value = "timeframe", required = false) String timeframe,
            @RequestParam(value = "start_date", required = false) String startDate,
            @RequestParam(value = "end_date", required = false) String endDate) {
        return ResponseEntity.ok(analyticsService.getDashboardSummary(timeframe, startDate, endDate));
    }
}
