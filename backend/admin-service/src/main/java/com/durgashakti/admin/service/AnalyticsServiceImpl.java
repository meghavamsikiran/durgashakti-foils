package com.durgashakti.admin.service;

import com.durgashakti.common.entity.*;
import com.durgashakti.admin.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class AnalyticsServiceImpl implements AnalyticsService {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsServiceImpl.class);

    private final AdminOrderRepository orderRepository;
    private final AdminProductRepository productRepository;
    private final AdminUserRepository userRepository;
    private final AuditLogRepository auditLogRepository;

    private static final List<String> REVENUE_ORDER_STATUSES = List.of(
            "processing", "placed", "confirmed", "packaging", "shipped", "in_transit",
            "out_for_delivery", "delivered", "return_requested", "return_rejected"
    );

    private static final List<String> REVENUE_PAYMENT_STATUSES = List.of(
            "completed", "paid", "cash on delivery"
    );

    public AnalyticsServiceImpl(AdminOrderRepository orderRepository,
                                AdminProductRepository productRepository,
                                AdminUserRepository userRepository,
                                AuditLogRepository auditLogRepository) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.auditLogRepository = auditLogRepository;
    }

    @Override
    public Map<String, Object> getDashboardSummary() {
        return getDashboardSummary("All Time", null, null);
    }

    @Override
    public Map<String, Object> getDashboardSummary(String timeframe, String startDateStr, String endDateStr) {
        log.info("Calculating dashboard metrics for timeframe: {}, start: {}, end: {}", timeframe, startDateStr, endDateStr);

        // Load all entities for in-memory analytics computation
        List<Order> allOrders = orderRepository.findAll();
        List<Product> allProducts = productRepository.findAll();
        List<User> allUsers = userRepository.findAll();
        List<AuditLog> allAuditLogs = auditLogRepository.findAll();

        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime startDate = parseDateTime(startDateStr);
        OffsetDateTime endDate = parseDateTime(endDateStr);
        OffsetDateTime dateFilter = null;

        if (startDate == null && endDate == null) {
            String tf = timeframe != null ? timeframe.trim() : "All Time";
            if ("Today".equalsIgnoreCase(tf)) {
                dateFilter = now.truncatedTo(ChronoUnit.DAYS);
            } else if ("This Month".equalsIgnoreCase(tf)) {
                dateFilter = now.withDayOfMonth(1).truncatedTo(ChronoUnit.DAYS);
            } else if ("Fiscal Year".equalsIgnoreCase(tf)) {
                int fyYear = now.getMonthValue() >= 4 ? now.getYear() : now.getYear() - 1;
                dateFilter = OffsetDateTime.of(fyYear, 4, 1, 0, 0, 0, 0, now.getOffset());
            } else if ("Last 7 Days".equalsIgnoreCase(tf)) {
                dateFilter = now.minusDays(7).truncatedTo(ChronoUnit.DAYS);
            }
        }

        // Filter orders by time window
        final OffsetDateTime startVal = startDate;
        final OffsetDateTime endVal = endDate;
        final OffsetDateTime filterVal = dateFilter;

        List<Order> filteredOrders = allOrders.stream()
                .filter(o -> {
                    if (o.getCreatedAt() == null) return false;
                    if (startVal != null && o.getCreatedAt().isBefore(startVal)) return false;
                    if (endVal != null && o.getCreatedAt().isAfter(endVal)) return false;
                    if (filterVal != null && o.getCreatedAt().isBefore(filterVal)) return false;
                    return true;
                })
                .collect(Collectors.toList());

        // Basic Counts
        long totalOrders = filteredOrders.size();
        OffsetDateTime todayStart = now.truncatedTo(ChronoUnit.DAYS);
        long ordersToday = filteredOrders.stream()
                .filter(o -> o.getCreatedAt().isAfter(todayStart))
                .count();

        double totalRevenue = 0.0;
        long totalDelivered = 0;
        long totalReturned = 0;
        long todayDelivered = 0;
        long todayPending = 0;
        long todayShipped = 0;
        long rangeDelivered = 0;
        long rangePending = 0;
        long rangeShipped = 0;

        long paidPaymentsCount = 0;
        long pendingPaymentsCount = 0;
        long failedPaymentsCount = 0;
        long codPaymentsCount = 0;
        long refundPaymentsCount = 0;
        double pendingPaymentAmount = 0.0;

        double totalDeliveryDurationHours = 0.0;
        long deliveryDurationCount = 0;

        Map<String, Integer> statusCounts = new HashMap<>();

        for (Order o : filteredOrders) {
            String oStatus = o.getOrderStatus() != null ? o.getOrderStatus().toLowerCase() : "";
            String pStatus = o.getPaymentStatus() != null ? o.getPaymentStatus().toLowerCase() : "";
            String pMethod = o.getPaymentMethod() != null ? o.getPaymentMethod().toLowerCase() : "";
            double amt = o.getTotalAmount() != null ? o.getTotalAmount().doubleValue() : 0.0;

            statusCounts.put(oStatus, statusCounts.getOrDefault(oStatus, 0) + 1);

            // Revenue calculation
            if (REVENUE_ORDER_STATUSES.contains(oStatus) && REVENUE_PAYMENT_STATUSES.contains(pStatus)) {
                totalRevenue += amt;
            }

            // Delivery time calculation
            if ("delivered".equals(oStatus) && o.getShippedAt() != null && o.getDeliveredAt() != null) {
                double hours = ChronoUnit.MINUTES.between(o.getShippedAt(), o.getDeliveredAt()) / 60.0;
                totalDeliveryDurationHours += hours;
                deliveryDurationCount++;
            }

            // Order Status Aggregates
            if ("delivered".equals(oStatus)) {
                totalDelivered++;
                rangeDelivered++;
                if (o.getCreatedAt().isAfter(todayStart)) {
                    todayDelivered++;
                }
            } else if (List.of("placed", "confirmed", "processing", "packaging").contains(oStatus)) {
                rangePending++;
                if (o.getCreatedAt().isAfter(todayStart)) {
                    todayPending++;
                }
            } else if (List.of("shipped", "in_transit", "out_for_delivery").contains(oStatus)) {
                rangeShipped++;
                if (o.getCreatedAt().isAfter(todayStart)) {
                    todayShipped++;
                }
            } else if (List.of("returned", "return_approved", "return_requested", "refunded").contains(oStatus)) {
                totalReturned++;
            }

            // Payment aggregation
            if ("paid".equals(pStatus) || "completed".equals(pStatus)) {
                paidPaymentsCount++;
            } else if ("cash on delivery".equals(pStatus)) {
                codPaymentsCount++;
            } else if (List.of("pending", "pending_payment", "overdue").contains(pStatus)) {
                pendingPaymentsCount++;
                pendingPaymentAmount += amt;
            } else if (List.of("failed", "cancelled", "refund_failed").contains(pStatus)) {
                failedPaymentsCount++;
            } else if (List.of("refund_pending", "refunded").contains(pStatus)) {
                refundPaymentsCount++;
            }
        }

        double avgDeliveryTimeHours = deliveryDurationCount > 0 ?
                Math.round((totalDeliveryDurationHours / deliveryDurationCount) * 10.0) / 10.0 : 0.0;

        long totalPaymentEvents = paidPaymentsCount + pendingPaymentsCount + failedPaymentsCount;
        double paymentSuccessRate = totalPaymentEvents > 0 ?
                Math.round((paidPaymentsCount * 100.0 / totalPaymentEvents) * 10.0) / 10.0 : 100.0;

        // Product Metrics
        long totalProducts = allProducts.size();
        double totalInventoryValue = 0.0;
        long totalUnitsSold = 0;
        long outOfStockCount = 0;
        long lowStockCount = 0;
        long inStockCount = 0;

        Product topPerformerProd = null;
        double topPerformerRevenue = -1.0;
        Product fastestMoverProd = null;

        for (Product p : allProducts) {
            double priceVal = p.getDiscountPrice() != null ? p.getDiscountPrice().doubleValue() :
                    (p.getPrice() != null ? p.getPrice().doubleValue() : 0.0);
            int stock = p.getStockQuantity() != null ? p.getStockQuantity() : 0;
            int sold = p.getUnitsSold() != null ? p.getUnitsSold() : 0;
            int threshold = p.getLowStockThreshold() != null ? p.getLowStockThreshold() : 20;

            totalInventoryValue += stock * priceVal;
            totalUnitsSold += sold;

            if (stock <= 0) {
                outOfStockCount++;
            } else {
                inStockCount++;
                if (stock <= threshold) {
                    lowStockCount++;
                }
            }

            double revenueVal = sold * priceVal;
            if (revenueVal > topPerformerRevenue) {
                topPerformerRevenue = revenueVal;
                topPerformerProd = p;
            }

            if (fastestMoverProd == null || sold > (fastestMoverProd.getUnitsSold() != null ? fastestMoverProd.getUnitsSold() : 0)) {
                fastestMoverProd = p;
            }
        }

        double stockHealth = totalProducts > 0 ?
                Math.round((inStockCount * 100.0 / totalProducts) * 10.0) / 10.0 : 100.0;

        Map<String, Object> topPerformer = null;
        if (topPerformerProd != null) {
            topPerformer = Map.<String, Object>of(
                    "name", topPerformerProd.getName(),
                    "revenue", Math.round(topPerformerRevenue * 100.0) / 100.0
            );
        }

        Map<String, Object> fastestMover = null;
        if (fastestMoverProd != null) {
            fastestMover = Map.<String, Object>of(
                    "name", fastestMoverProd.getName(),
                    "units_sold", fastestMoverProd.getUnitsSold() != null ? fastestMoverProd.getUnitsSold() : 0
            );
        }

        double salesVelocity = Math.round((totalUnitsSold / 30.0) * 100.0) / 100.0;
        long totalCustomers = allUsers.stream().filter(u -> "customer".equalsIgnoreCase(u.getRole())).count();

        // Audit Logs
        long securityEventsCount = allAuditLogs.stream()
                .filter(l -> l.getAction() != null && List.of("ADMIN_CREATED", "ADMIN_PASSWORD_RESET").contains(l.getAction()))
                .count();

        long destructiveActionsCount = allAuditLogs.stream()
                .filter(l -> l.getAction() != null && l.getAction().toUpperCase().contains("DELETE"))
                .count();

        // Populate metrics map
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("total_orders", totalOrders);
        metrics.put("orders_today", ordersToday);
        metrics.put("avg_delivery_time_hours", avgDeliveryTimeHours);
        metrics.put("total_delivered", totalDelivered);
        metrics.put("total_returned", totalReturned);
        metrics.put("today_delivered", todayDelivered);
        metrics.put("today_pending", todayPending);
        metrics.put("today_shipped", todayShipped);
        metrics.put("range_delivered", rangeDelivered);
        metrics.put("range_pending", rangePending);
        metrics.put("range_shipped", rangeShipped);
        metrics.put("total_revenue", Math.round(totalRevenue * 100.0) / 100.0);
        metrics.put("total_products", totalProducts);
        metrics.put("total_customers", totalCustomers);
        metrics.put("total_inventory_value", Math.round(totalInventoryValue * 100.0) / 100.0);
        metrics.put("total_units_sold", totalUnitsSold);
        metrics.put("out_of_stock_count", outOfStockCount);
        metrics.put("low_stock_count", lowStockCount);
        metrics.put("stock_health", stockHealth);
        metrics.put("top_performer", topPerformer);
        metrics.put("fastest_mover", fastestMover);
        metrics.put("sales_velocity", salesVelocity);
        metrics.put("paid_payments_count", paidPaymentsCount);
        metrics.put("pending_payments_count", pendingPaymentsCount);
        metrics.put("failed_payments_count", failedPaymentsCount);
        metrics.put("cod_payments_count", codPaymentsCount);
        metrics.put("refund_payments_count", refundPaymentsCount);
        metrics.put("pending_payment_amount", Math.round(pendingPaymentAmount * 100.0) / 100.0);
        metrics.put("payment_success_rate", paymentSuccessRate);
        metrics.put("security_events_count", securityEventsCount);
        metrics.put("destructive_actions_count", destructiveActionsCount);

        // Best Sellers (paid orders only)
        Map<String, Integer> bestSellersCounts = new HashMap<>();
        for (Order o : filteredOrders) {
            String pStatus = o.getPaymentStatus() != null ? o.getPaymentStatus().toLowerCase() : "";
            if (REVENUE_PAYMENT_STATUSES.contains(pStatus) && o.getItems() != null) {
                for (Map<String, Object> item : o.getItems()) {
                    String name = String.valueOf(item.getOrDefault("product_name", item.getOrDefault("name", "Unknown Product")));
                    int qty = ((Number) item.getOrDefault("quantity", 0)).intValue();
                    bestSellersCounts.put(name, bestSellersCounts.getOrDefault(name, 0) + qty);
                }
            }
        }

        List<Map<String, Object>> bestProducts = bestSellersCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(10)
                .map(e -> Map.<String, Object>of("name", e.getKey(), "quantity", e.getValue()))
                .collect(Collectors.toList());

        // Inventory Stock levels (ascending stock order, limit 50)
        List<Map<String, Object>> inventory = allProducts.stream()
                .sorted(Comparator.comparingInt(p -> p.getStockQuantity() != null ? p.getStockQuantity() : 0))
                .limit(50)
                .map(p -> Map.<String, Object>of(
                        "id", p.getId().toString(),
                        "name", p.getName(),
                        "sku", p.getBatchNo() != null ? p.getBatchNo() : (p.getVariantSku() != null ? p.getVariantSku() : "—"),
                        "stock_left", p.getStockQuantity() != null ? p.getStockQuantity() : 0,
                        "units_sold", p.getUnitsSold() != null ? p.getUnitsSold() : 0
                ))
                .collect(Collectors.toList());

        // Revenue Trend Chart grouping
        Map<String, Double> trendMap = new TreeMap<>();
        long daysDiff = 30; // default All Time range
        if (startVal != null && endVal != null) {
            daysDiff = ChronoUnit.DAYS.between(startVal, endVal);
        }

        DateTimeFormatter formatter;
        if (daysDiff <= 1 || "Today".equalsIgnoreCase(timeframe)) {
            formatter = DateTimeFormatter.ofPattern("HH:00");
        } else if (daysDiff <= 60 || "Last 7 Days".equalsIgnoreCase(timeframe) || "This Month".equalsIgnoreCase(timeframe)) {
            formatter = DateTimeFormatter.ofPattern("MMM dd");
        } else {
            formatter = DateTimeFormatter.ofPattern("MMM yyyy");
        }

        for (Order o : filteredOrders) {
            String oStatus = o.getOrderStatus() != null ? o.getOrderStatus().toLowerCase() : "";
            String pStatus = o.getPaymentStatus() != null ? o.getPaymentStatus().toLowerCase() : "";
            if (REVENUE_ORDER_STATUSES.contains(oStatus) && REVENUE_PAYMENT_STATUSES.contains(pStatus)) {
                String key = o.getCreatedAt().format(formatter);
                double amt = o.getTotalAmount() != null ? o.getTotalAmount().doubleValue() : 0.0;
                trendMap.put(key, trendMap.getOrDefault(key, 0.0) + amt);
            }
        }

        List<Map<String, Object>> revenueTrend = trendMap.entrySet().stream()
                .map(e -> Map.<String, Object>of(
                        "name", e.getKey(),
                        "value", Math.round(e.getValue() * 100.0) / 100.0
                ))
                .collect(Collectors.toList());

        // Category Analytics
        Map<String, Map<String, Object>> catStats = new HashMap<>();
        Map<String, String> prodCategoryMap = new HashMap<>();
        Map<String, Double> prodPriceMap = new HashMap<>();

        for (Product p : allProducts) {
            String cat = p.getCategory() != null && !p.getCategory().trim().isEmpty() ? p.getCategory().trim() : "Uncategorized";
            String pid = p.getId().toString();
            prodCategoryMap.put(pid, cat);
            
            double pPrice = p.getDiscountPrice() != null ? p.getDiscountPrice().doubleValue() :
                    (p.getPrice() != null ? p.getPrice().doubleValue() : 0.0);
            prodPriceMap.put(pid, pPrice);

            int stock = p.getStockQuantity() != null ? p.getStockQuantity() : 0;

            if (!catStats.containsKey(cat)) {
                Map<String, Object> stat = new HashMap<>();
                stat.put("category", cat);
                stat.put("product_count", 0);
                stat.put("stock_quantity", 0);
                stat.put("stock_value", 0.0);
                stat.put("units_sold", 0);
                stat.put("revenue", 0.0);
                catStats.put(cat, stat);
            }

            Map<String, Object> stat = catStats.get(cat);
            stat.put("product_count", (int) stat.get("product_count") + 1);
            stat.put("stock_quantity", (int) stat.get("stock_quantity") + stock);
            stat.put("stock_value", (double) stat.get("stock_value") + (stock * pPrice));
        }

        for (Order o : filteredOrders) {
            String pStatus = o.getPaymentStatus() != null ? o.getPaymentStatus().toLowerCase() : "";
            if (REVENUE_PAYMENT_STATUSES.contains(pStatus) && o.getItems() != null) {
                for (Map<String, Object> item : o.getItems()) {
                    String pid = String.valueOf(item.get("product_id"));
                    int qty = ((Number) item.getOrDefault("quantity", 0)).intValue();
                    double price = ((Number) item.getOrDefault("price", 0.0)).doubleValue();
                    
                    String cat = "Uncategorized";
                    if (prodCategoryMap.containsKey(pid)) {
                        cat = prodCategoryMap.get(pid);
                    } else {
                        // Fallback matching by product name if UUID is different
                        String name = String.valueOf(item.getOrDefault("product_name", item.getOrDefault("name", "")));
                        for (Product pr : allProducts) {
                            if (pr.getName() != null && pr.getName().equalsIgnoreCase(name)) {
                                cat = pr.getCategory() != null ? pr.getCategory().trim() : "Uncategorized";
                                break;
                            }
                        }
                    }

                    if (!catStats.containsKey(cat)) {
                        Map<String, Object> stat = new HashMap<>();
                        stat.put("category", cat);
                        stat.put("product_count", 0);
                        stat.put("stock_quantity", 0);
                        stat.put("stock_value", 0.0);
                        stat.put("units_sold", 0);
                        stat.put("revenue", 0.0);
                        catStats.put(cat, stat);
                    }

                    Map<String, Object> stat = catStats.get(cat);
                    stat.put("units_sold", (int) stat.get("units_sold") + qty);
                    stat.put("revenue", (double) stat.get("revenue") + (qty * price));
                }
            }
        }

        // Clean values to round decimals
        for (Map<String, Object> stat : catStats.values()) {
            stat.put("revenue", Math.round((double) stat.get("revenue") * 100.0) / 100.0);
            stat.put("stock_value", Math.round((double) stat.get("stock_value") * 100.0) / 100.0);
        }

        List<Map<String, Object>> categoryAnalytics = new ArrayList<>(catStats.values());

        // Return final summary structure
        Map<String, Object> summary = new HashMap<>();
        summary.put("metrics", metrics);
        summary.put("order_status_counts", statusCounts);
        summary.put("best_products", bestProducts);
        summary.put("inventory", inventory);
        summary.put("revenue_trend", revenueTrend);
        summary.put("category_analytics", categoryAnalytics);

        return summary;
    }

    private OffsetDateTime parseDateTime(String isoStr) {
        if (isoStr == null || isoStr.trim().isEmpty()) return null;
        try {
            return OffsetDateTime.parse(isoStr);
        } catch (Exception e) {
            try {
                String clean = isoStr.trim();
                if (clean.endsWith("Z")) {
                    clean = clean.substring(0, clean.length() - 1);
                }
                return OffsetDateTime.parse(clean);
            } catch (Exception ex) {
                return null;
            }
        }
    }
}
