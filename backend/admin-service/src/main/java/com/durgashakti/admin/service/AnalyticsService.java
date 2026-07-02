package com.durgashakti.admin.service;

import java.util.Map;

public interface AnalyticsService {
    Map<String, Object> getDashboardSummary();
    Map<String, Object> getDashboardSummary(String timeframe, String startDate, String endDate);
}
