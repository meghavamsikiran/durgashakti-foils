package com.durgashakti.admin.scheduler;

import com.durgashakti.common.entity.Order;
import com.durgashakti.common.entity.User;
import com.durgashakti.admin.repository.AdminOrderRepository;
import com.durgashakti.admin.repository.AdminUserRepository;
import com.durgashakti.common.util.EmailClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class ReturnScheduler {

    private static final Logger log = LoggerFactory.getLogger(ReturnScheduler.class);

    private final AdminOrderRepository orderRepository;
    private final AdminUserRepository userRepository;
    private final EmailClient emailClient;

    public ReturnScheduler(AdminOrderRepository orderRepository,
                           AdminUserRepository userRepository,
                           EmailClient emailClient) {
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
        this.emailClient = emailClient;
    }

    @Scheduled(fixedRate = 300000) // Run every 5 minutes
    public void processReturnExpirationsAndReminders() {
        log.info("Starting background ReturnScheduler task to process self-shipment reminders and expirations...");
        try {
            // Load all orders
            List<Order> orders = orderRepository.findAll();
            for (Order order : orders) {
                if (order.getItems() == null || order.getItems().isEmpty()) {
                    continue;
                }

                String ordStatus = (order.getOrderStatus() != null ? order.getOrderStatus() : "").toLowerCase();
                if ("refunded".equals(ordStatus) || "refund_credited".equals(ordStatus) || "cancelled".equals(ordStatus)) {
                    continue;
                }

                boolean orderUpdated = false;
                List<Map<String, Object>> items = order.getItems();

                for (Map<String, Object> item : items) {
                    String returnStatus = (String) item.get("return_status");
                    if ("RETURN_APPROVED".equals(returnStatus) || "EXCHANGE_APPROVED".equals(returnStatus)) {
                        OffsetDateTime approvedAt = getApprovalTime(item);
                        if (approvedAt == null) {
                            // Fallback to order updated_at if timeline timestamp is missing
                            approvedAt = order.getUpdatedAt() != null ? order.getUpdatedAt() : OffsetDateTime.now();
                        }

                        long hoursSinceApproval = ChronoUnit.HOURS.between(approvedAt, OffsetDateTime.now());
                        
                        // 1. Last Day Reminder (after 48 hours / 2 days, but before 72 hours / 3 days)
                        boolean reminderSent = Boolean.TRUE.equals(item.get("self_ship_reminder_sent"));
                        if (hoursSinceApproval >= 48 && hoursSinceApproval < 72 && !reminderSent) {
                            sendReminderEmail(order, item);
                            item.put("self_ship_reminder_sent", true);
                            orderUpdated = true;
                        }

                        // 2. Expiration (after 72 hours / 3 days)
                        if (hoursSinceApproval >= 72) {
                            String expiredStatus = "RETURN_APPROVED".equals(returnStatus) ? "RETURN_EXPIRED" : "EXCHANGE_EXPIRED";
                            item.put("return_status", expiredStatus);
                            addAuditTimeline(item, expiredStatus, "Self-shipment window of 3 days expired");
                            sendExpirationEmail(order, item);
                            orderUpdated = true;
                        }
                    }
                }

                if (orderUpdated) {
                    // Re-derive overall order status
                    boolean hasPending = items.stream().anyMatch(i ->
                            "RETURN_REQUESTED".equals(i.get("return_status")) ||
                                    "EXCHANGE_REQUESTED".equals(i.get("return_status")) ||
                                    "RETURN_APPROVED".equals(i.get("return_status")) ||
                                    "EXCHANGE_APPROVED".equals(i.get("return_status")));
                    
                    if (!hasPending) {
                        boolean anyExpired = items.stream().anyMatch(i -> {
                            String rs = (String) i.get("return_status");
                            return "RETURN_EXPIRED".equals(rs) || "EXCHANGE_EXPIRED".equals(rs);
                        });
                        if (anyExpired) {
                            order.setOrderStatus("return_expired");
                        }
                    }
                    
                    order.setItems(items);
                    order.setUpdatedAt(OffsetDateTime.now());
                    orderRepository.save(order);
                    log.info("Order {} return statuses updated and saved by ReturnScheduler.", order.getOrderNumber());
                }
            }
        } catch (Exception e) {
            log.error("Error in ReturnScheduler background task: {}", e.getMessage(), e);
        }
    }

    private OffsetDateTime getApprovalTime(Map<String, Object> item) {
        try {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> timeline = (List<Map<String, Object>>) item.get("audit_timeline");
            if (timeline != null) {
                for (Map<String, Object> entry : timeline) {
                    String status = String.valueOf(entry.get("status"));
                    if ("RETURN_APPROVED".equals(status) || "EXCHANGE_APPROVED".equals(status)) {
                        String ts = String.valueOf(entry.get("timestamp"));
                        if (ts != null && !ts.isEmpty()) {
                            return OffsetDateTime.parse(ts);
                        }
                    }
                }
            }
        } catch (Exception ignored) {}
        return null;
    }

    @SuppressWarnings("unchecked")
    private void addAuditTimeline(Map<String, Object> item, String status, String remarks) {
        List<Map<String, Object>> timeline = (List<Map<String, Object>>) item.get("audit_timeline");
        if (timeline == null) {
            timeline = new ArrayList<>();
        }
        Map<String, Object> entry = new HashMap<>();
        entry.put("status", status);
        entry.put("timestamp", OffsetDateTime.now().toString());
        entry.put("remarks", remarks);
        timeline.add(entry);
        item.put("audit_timeline", timeline);
    }

    private void sendReminderEmail(Order order, Map<String, Object> item) {
        if (order.getUserId() == null) return;
        userRepository.findById(order.getUserId()).ifPresent(user -> {
            String subject = "Self-Shipment Pending - Last Day Reminder: " + order.getOrderNumber();
            String body = "This is a reminder that self-shipment is pending for your return request on order <strong>" + order.getOrderNumber() + "</strong>.<br/><br/>" +
                          "You have <strong>24 hours remaining</strong> to ship the item and submit courier details in your order dashboard.<br/><br/>" +
                          "<strong>Action Required:</strong> Please ship the item and click 'Track Return Shipment' on our website to provide tracking info.<br/>" +
                          "If tracking information is not submitted within 24 hours, your return eligibility will expire, and this request will be closed.";
            sendEmail(user, order, subject, body);
        });
    }

    private void sendExpirationEmail(Order order, Map<String, Object> item) {
        if (order.getUserId() == null) return;
        userRepository.findById(order.getUserId()).ifPresent(user -> {
            String subject = "Return Request Expired: " + order.getOrderNumber();
            String body = "We are writing to inform you that your return/exchange request for order <strong>" + order.getOrderNumber() + "</strong> has expired.<br/><br/>" +
                          "Since self-shipment details were not provided within the required 3-day window, this request has been closed, " +
                          "and this order is no longer eligible for return or exchange.<br/><br/>" +
                          "If you have already shipped the package, please contact support immediately with your courier receipt.";
            sendEmail(user, order, subject, body);
        });
    }

    private void sendEmail(User user, Order order, String subject, String body) {
        try {
            String htmlBody = "<html>\n" +
                    "<body style=\"margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;\">\n" +
                    "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f3f4f6;padding:30px 0;\">\n" +
                    "<tr><td align=\"center\">\n" +
                    "<table width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);\">\n" +
                    "  <!-- Header -->\n" +
                    "  <tr><td style=\"background:#ffffff;padding:32px 40px;text-align:center;border-bottom:1px solid #f3f4f6;\">\n" +
                    "    <img src=\"https://durgashakti-foils.vercel.app/logo-durga.png\" width=\"250\" style=\"display:block;margin:0 auto;\" alt=\"DurgaShakti Logo\">\n" +
                    "  </td></tr>\n" +
                    "  <!-- Body -->\n" +
                    "  <tr><td style=\"padding:40px 40px 20px;color:#1e293b;\">\n" +
                    "    <h2 style=\"margin:0 0 8px;color:#ea580c;font-size:20px;font-weight:700;\">" + subject + "</h2>\n" +
                    "    \n" +
                    "    <p style=\"margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;\">Dear " + user.getFullName() + ",</p>\n" +
                    "    <p style=\"margin:0 0 24px;font-size:15px;line-height:1.6;color:#334155;\">" + body + "</p>\n" +
                    "    \n" +
                    "    <div style=\"text-align:center;margin:32px 0;\">\n" +
                    "      <a href=\"https://durgashakti-foils.vercel.app/order/" + order.getId() + "\" style=\"background:#ea580c;color:#ffffff;text-decoration:none;padding:12px 28px;font-weight:700;border-radius:8px;display:inline-block;font-size:14px;box-shadow:0 4px 12px rgba(234,88,12,0.25);\">View Order</a>\n" +
                    "    </div>\n" +
                    "    \n" +
                    "    <p style=\"margin:0;font-size:14px;line-height:1.6;color:#64748b;\">Best regards,<br>The Durga Shakti Foils Team</p>\n" +
                    "  </td></tr>\n" +
                    "  <!-- Footer -->\n" +
                    "  <tr><td style=\"background:#f8fafc;padding:24px;text-align:center;border-top:1px solid #f1f5f9;\">\n" +
                    "    <p style=\"margin:0;font-size:12px;color:#94a3b8;\">© " + java.time.Year.now().getValue() + " Durga Shakti Foils. All rights reserved.</p>\n" +
                    "  </td></tr>\n" +
                    "</table>\n" +
                    "</td></tr>\n" +
                    "</table>\n" +
                    "</body>\n" +
                    "</html>";
            emailClient.sendEmail(user.getEmail(), subject, htmlBody);
        } catch (Exception e) {
            log.error("Failed to send ReturnScheduler notification email to {}: {}", user.getEmail(), e.getMessage());
        }
    }
}
