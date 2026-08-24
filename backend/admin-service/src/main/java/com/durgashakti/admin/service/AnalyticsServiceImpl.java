package com.durgashakti.admin.service;

import com.durgashakti.common.entity.*;
import com.durgashakti.admin.repository.*;
import org.springframework.jdbc.core.JdbcTemplate;
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
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;

@Service
@Transactional(readOnly = true)
public class AnalyticsServiceImpl implements AnalyticsService {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsServiceImpl.class);

    private final AdminOrderRepository orderRepository;
    private final AdminProductRepository productRepository;
    private final AdminUserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final JdbcTemplate jdbcTemplate;

    private static final List<String> REVENUE_ORDER_STATUSES = List.of(
            "processing", "placed", "confirmed", "packaging", "shipped", "in_transit",
            "out_for_delivery", "delivered", "return_requested", "return_rejected", "return_expired"
    );

    private static final List<String> REVENUE_PAYMENT_STATUSES = List.of(
            "completed", "paid", "cash on delivery"
    );

    public AnalyticsServiceImpl(AdminOrderRepository orderRepository,
                                AdminProductRepository productRepository,
                                AdminUserRepository userRepository,
                                AuditLogRepository auditLogRepository,
                                JdbcTemplate jdbcTemplate) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.auditLogRepository = auditLogRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public Map<String, Object> getDashboardSummary() {
        return getDashboardSummary("All Time", null, null);
    }

    @Override
    public Map<String, Object> getDashboardSummary(String timeframe, String startDateStr, String endDateStr) {
        log.info("Calculating dashboard metrics for timeframe: {}, start: {}, end: {}", timeframe, startDateStr, endDateStr);

        List<Order> allOrders = orderRepository.findAll();
        List<Product> allProducts = productRepository.findAll();
        List<User> allUsers = userRepository.findAll();
        log.info("Loaded {} orders, {} products, {} users", allOrders.size(), allProducts.size(), allUsers.size());
        
        java.time.ZoneId istZone = java.time.ZoneId.of("Asia/Kolkata");
        OffsetDateTime now = OffsetDateTime.now(istZone);
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
        long totalCancelled = 0;
        long rangeCancelled = 0;

        long paidPaymentsCount = 0;
        long pendingPaymentsCount = 0;
        long failedPaymentsCount = 0;
        long codPaymentsCount = 0;
        long walletPaymentsCount = 0;
        long onlinePaymentsCount = 0;
        double walletPaymentsAmount = 0.0;
        double onlinePaymentsAmount = 0.0;
        double codPaymentsAmount = 0.0;
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

            if (REVENUE_ORDER_STATUSES.contains(oStatus) && REVENUE_PAYMENT_STATUSES.contains(pStatus)) {
                totalRevenue += amt;
            }

            if (("delivered".equals(oStatus) || "return_expired".equals(oStatus)) && o.getShippedAt() != null && o.getDeliveredAt() != null) {
                double hours = ChronoUnit.MINUTES.between(o.getShippedAt(), o.getDeliveredAt()) / 60.0;
                totalDeliveryDurationHours += hours;
                deliveryDurationCount++;
            }

            if ("delivered".equals(oStatus) || "return_expired".equals(oStatus)) {
                totalDelivered++;
                rangeDelivered++;
                if (o.getDeliveredAt() != null) {
                    if (o.getDeliveredAt().isAfter(todayStart)) todayDelivered++;
                } else if (o.getCreatedAt().isAfter(todayStart)) todayDelivered++;
            } else if (List.of("placed", "confirmed", "processing", "packaging", "pending_payment").contains(oStatus)) {
                rangePending++;
                if (o.getCreatedAt().isAfter(todayStart)) todayPending++;
            } else if (List.of("shipped", "in_transit", "out_for_delivery").contains(oStatus)) {
                rangeShipped++;
                if (o.getShippedAt() != null) {
                    if (o.getShippedAt().isAfter(todayStart)) todayShipped++;
                } else if (o.getCreatedAt().isAfter(todayStart)) todayShipped++;
            } else if (List.of("returned", "return_approved", "return_requested", "refunded").contains(oStatus)) {
                totalReturned++;
            } else if ("cancelled".equals(oStatus)) {
                totalCancelled++;
                rangeCancelled++;
            }

            boolean isWalletMethod = "wallet".equalsIgnoreCase(pMethod) || "dsf_wallet".equalsIgnoreCase(pMethod) || pStatus.contains("wallet");
            boolean isCodMethod = "cash on delivery".equalsIgnoreCase(pMethod) || "cod".equalsIgnoreCase(pMethod) || "cash on delivery".equalsIgnoreCase(pStatus);

            if (isWalletMethod) {
                walletPaymentsCount++;
                walletPaymentsAmount += amt;
                paidPaymentsCount++;
            } else if ("paid".equals(pStatus) || "completed".equals(pStatus)) {
                onlinePaymentsCount++;
                onlinePaymentsAmount += amt;
                paidPaymentsCount++;
            } else if (isCodMethod) {
                codPaymentsCount++;
                codPaymentsAmount += amt;
            } else if (List.of("pending", "pending_payment", "overdue").contains(pStatus)) {
                pendingPaymentsCount++;
                pendingPaymentAmount += amt;
            } else if (List.of("failed", "cancelled", "refund_failed").contains(pStatus)) {
                failedPaymentsCount++;
            } else if (List.of("refund_pending", "refunded").contains(pStatus)) {
                refundPaymentsCount++;
            }
        }

        double avgDeliveryTimeHours = deliveryDurationCount > 0 ? Math.round((totalDeliveryDurationHours / deliveryDurationCount) * 10.0) / 10.0 : 0.0;
        long totalPaymentEvents = paidPaymentsCount + pendingPaymentsCount + failedPaymentsCount;
        double paymentSuccessRate = totalPaymentEvents > 0 ? Math.round((paidPaymentsCount * 100.0 / totalPaymentEvents) * 10.0) / 10.0 : 100.0;

        double totalWalletLiability = 0.0;
        long activeWalletUsersCount = 0;
        double totalWalletSpent = 0.0;
        double totalWalletRefundsCredited = 0.0;
        double totalWalletTopupsCredited = 0.0;

        try {
            List<Map<String, Object>> lRes = jdbcTemplate.queryForList("SELECT COALESCE(SUM(balance), 0) as total_balance, COUNT(CASE WHEN balance > 0 THEN 1 END) as active_users FROM wallets");
            if (!lRes.isEmpty()) {
                totalWalletLiability = toDouble(lRes.get(0).get("total_balance"));
                activeWalletUsersCount = toLong(lRes.get(0).get("active_users"));
            }

            List<Map<String, Object>> txRes = jdbcTemplate.queryForList(
                "SELECT " +
                "COALESCE(SUM(CASE WHEN type = 'DEBIT' AND status = 'SUCCESS' THEN amount ELSE 0 END), 0) as total_spent, " +
                "COALESCE(SUM(CASE WHEN type = 'CREDIT' AND status = 'SUCCESS' AND source IN ('ORDER_REFUND', 'CANCELLED_ORDER', 'RETURN_REFUND') THEN amount ELSE 0 END), 0) as total_refunds, " +
                "COALESCE(SUM(CASE WHEN type = 'CREDIT' AND status = 'SUCCESS' AND source IN ('TOPUP', 'ADMIN_CREDIT', 'VOUCHER') THEN amount ELSE 0 END), 0) as total_topups " +
                "FROM wallet_transactions"
            );
            if (!txRes.isEmpty()) {
                totalWalletSpent = toDouble(txRes.get(0).get("total_spent"));
                totalWalletRefundsCredited = toDouble(txRes.get(0).get("total_refunds"));
                totalWalletTopupsCredited = toDouble(txRes.get(0).get("total_topups"));
            }
        } catch (Exception ex) {
            log.warn("Failed to query database wallet analytics: {}", ex.getMessage());
        }

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
            double priceVal = p.getDiscountPrice() != null ? p.getDiscountPrice().doubleValue() : (p.getPrice() != null ? p.getPrice().doubleValue() : 0.0);
            int stock = p.getStockQuantity() != null ? p.getStockQuantity() : 0;
            int sold = p.getUnitsSold() != null ? p.getUnitsSold() : 0;
            int threshold = p.getLowStockThreshold() != null ? p.getLowStockThreshold() : 20;
            totalInventoryValue += stock * priceVal;
            totalUnitsSold += sold;
            if (stock <= 0) outOfStockCount++;
            else {
                inStockCount++;
                if (stock <= threshold) lowStockCount++;
            }
            double revenueVal = sold * priceVal;
            if (revenueVal > topPerformerRevenue) {
                topPerformerRevenue = revenueVal;
                topPerformerProd = p;
            }
            if (fastestMoverProd == null || sold > (fastestMoverProd.getUnitsSold() != null ? fastestMoverProd.getUnitsSold() : 0)) fastestMoverProd = p;
        }

        double stockHealth = totalProducts > 0 ? Math.round((inStockCount * 100.0 / totalProducts) * 10.0) / 10.0 : 100.0;
        Map<String, Object> topPerformer = topPerformerProd != null ? Map.of("name", topPerformerProd.getName(), "revenue", Math.round(topPerformerRevenue * 100.0) / 100.0) : null;
        Map<String, Object> fastestMover = fastestMoverProd != null ? Map.of("name", fastestMoverProd.getName(), "units_sold", fastestMoverProd.getUnitsSold() != null ? fastestMoverProd.getUnitsSold() : 0) : null;
        double salesVelocity = Math.round((totalUnitsSold / 30.0) * 100.0) / 100.0;
        long totalCustomers = allUsers.stream().filter(u -> "customer".equalsIgnoreCase(u.getRole())).count();
        long securityEventsCount = auditLogRepository.countByActionIn(List.of("ADMIN_CREATED", "ADMIN_PASSWORD_RESET"));
        long destructiveActionsCount = auditLogRepository.countByActionContainingIgnoreCase("DELETE");

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
        metrics.put("total_cancelled", totalCancelled);
        metrics.put("range_cancelled", rangeCancelled);
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
        metrics.put("wallet_payments_count", walletPaymentsCount);
        metrics.put("wallet_payments_amount", Math.round(walletPaymentsAmount * 100.0) / 100.0);
        metrics.put("online_payments_count", onlinePaymentsCount);
        metrics.put("online_payments_amount", Math.round(onlinePaymentsAmount * 100.0) / 100.0);
        metrics.put("refund_payments_count", refundPaymentsCount);
        metrics.put("pending_payment_amount", Math.round(pendingPaymentAmount * 100.0) / 100.0);
        metrics.put("payment_success_rate", paymentSuccessRate);
        metrics.put("security_events_count", securityEventsCount);
        metrics.put("destructive_actions_count", destructiveActionsCount);
        metrics.put("total_wallet_liability", Math.round(totalWalletLiability * 100.0) / 100.0);
        metrics.put("active_wallet_users", activeWalletUsersCount);
        metrics.put("total_wallet_spent", Math.round(totalWalletSpent * 100.0) / 100.0);
        metrics.put("total_wallet_refunds_credited", Math.round(totalWalletRefundsCredited * 100.0) / 100.0);
        metrics.put("total_wallet_topups_credited", Math.round(totalWalletTopupsCredited * 100.0) / 100.0);

        Map<String, Integer> bestSellersCounts = new HashMap<>();
        for (Order o : filteredOrders) {
            String pStatus = o.getPaymentStatus() != null ? o.getPaymentStatus().toLowerCase() : "";
            if (REVENUE_PAYMENT_STATUSES.contains(pStatus) && o.getItems() != null) {
                for (Map<String, Object> item : o.getItems()) {
                    String name = String.valueOf(item.get("product_name") != null ? item.get("product_name") : item.getOrDefault("name", "Unknown Product"));
                    int qty = toInt(item.get("quantity"));
                    bestSellersCounts.put(name, bestSellersCounts.getOrDefault(name, 0) + qty);
                }
            }
        }
        List<Map<String, Object>> bestProducts = bestSellersCounts.entrySet().stream().sorted(Map.Entry.<String, Integer>comparingByValue().reversed()).limit(10).map(e -> Map.<String, Object>of("name", e.getKey(), "quantity", e.getValue())).collect(Collectors.toList());

        List<Map<String, Object>> inventory = allProducts.stream().sorted(Comparator.comparingInt(p -> p.getStockQuantity() != null ? p.getStockQuantity() : 0)).limit(50).map(p -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", p.getId().toString());
            map.put("name", p.getName());
            map.put("sku", p.getBatchNo() != null ? p.getBatchNo() : (p.getVariantSku() != null ? p.getVariantSku() : "—"));
            map.put("stock_left", p.getStockQuantity() != null ? p.getStockQuantity() : 0);
            map.put("units_sold", p.getUnitsSold() != null ? p.getUnitsSold() : 0);
            return map;
        }).collect(Collectors.toList());

        Map<String, Double> trendMap = new TreeMap<>();
        DateTimeFormatter trendFmt = DateTimeFormatter.ofPattern("MMM dd");
        for (Order o : filteredOrders) {
            String oStatus = o.getOrderStatus() != null ? o.getOrderStatus().toLowerCase() : "";
            String pStatus = o.getPaymentStatus() != null ? o.getPaymentStatus().toLowerCase() : "";
            if (REVENUE_ORDER_STATUSES.contains(oStatus) && REVENUE_PAYMENT_STATUSES.contains(pStatus) && o.getCreatedAt() != null) {
                String dateKey = o.getCreatedAt().format(trendFmt);
                double amt = o.getTotalAmount() != null ? o.getTotalAmount().doubleValue() : 0.0;
                trendMap.put(dateKey, trendMap.getOrDefault(dateKey, 0.0) + amt);
            }
        }
        List<Map<String, Object>> revenueTrend = trendMap.entrySet().stream().map(e -> Map.<String, Object>of("name", e.getKey(), "value", Math.round(e.getValue() * 100.0) / 100.0)).collect(Collectors.toList());

        Map<String, Map<String, Object>> catStats = new HashMap<>();
        for (Product p : allProducts) {
            String catName = p.getCategoryName() != null ? p.getCategoryName() : "General";
            Map<String, Object> stat = catStats.computeIfAbsent(catName, k -> {
                Map<String, Object> m = new HashMap<>();
                m.put("category", k);
                m.put("revenue", 0.0);
                m.put("product_count", 0);
                m.put("units_sold", 0);
                m.put("stock_quantity", 0);
                m.put("stock_value", 0.0);
                return m;
            });
            double pPrice = p.getDiscountPrice() != null ? p.getDiscountPrice().doubleValue() : (p.getPrice() != null ? p.getPrice().doubleValue() : 0.0);
            int pStock = p.getStockQuantity() != null ? p.getStockQuantity() : 0;
            int pSold = p.getUnitsSold() != null ? p.getUnitsSold() : 0;
            stat.put("product_count", (int) stat.get("product_count") + 1);
                        String name = String.valueOf(item.get("product_name") != null ? item.get("product_name") : item.getOrDefault("name", ""));
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
            String clean = isoStr.trim();
            if (clean.length() == 10) { // YYYY-MM-DD format
                return java.time.LocalDate.parse(clean).atStartOfDay(java.time.ZoneOffset.UTC).toOffsetDateTime();
            }
            return OffsetDateTime.parse(clean);
        } catch (Exception e) {
            try {
                String clean = isoStr.trim();
                if (clean.endsWith("Z")) {
                    clean = clean.substring(0, clean.length() - 1);
                }
                if (clean.contains(" ")) {
                    clean = clean.replace(" ", "T");
                }
                if (clean.length() == 19) { // YYYY-MM-DDTHH:mm:ss format
                    clean = clean + "Z";
                }
                return OffsetDateTime.parse(clean);
            } catch (Exception ex) {
                log.error("Failed to parse date-time string: {}", isoStr, ex);
                return null;
            }
        }
    }

    private double toDouble(Object val) {
        if (val == null) return 0.0;
        if (val instanceof Number) return ((Number) val).doubleValue();
        try {
            return Double.parseDouble(val.toString());
        } catch (NumberFormatException e) {
            return 0.0;
        }
    }

    private int toInt(Object val) {
        if (val == null) return 0;
        if (val instanceof Number) return ((Number) val).intValue();
        try {
            return (int) Double.parseDouble(val.toString()); // parseDouble to handle "1.0"
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
