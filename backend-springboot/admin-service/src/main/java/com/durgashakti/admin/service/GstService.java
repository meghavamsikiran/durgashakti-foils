package com.durgashakti.admin.service;

import com.durgashakti.common.entity.Order;
import com.durgashakti.admin.repository.OrderRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

@Service
public class GstService {

    private final OrderRepository orderRepository;

    public GstService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    public byte[] exportGstReport() throws IOException {
        List<Order> orders = orderRepository.findAll();

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("GSTR-1 Report");

            // Header Row
            Row header = sheet.createRow(0);
            String[] columns = {"Order Number", "Order Date", "Customer Name", "Total Amount", "Discount", "GST (18%)", "Status"};
            for (int i = 0; i < columns.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(columns[i]);
                CellStyle style = workbook.createCellStyle();
                Font font = workbook.createFont();
                font.setBold(true);
                style.setFont(font);
                cell.setCellStyle(style);
            }

            int rowIdx = 1;
            for (Order order : orders) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(order.getOrderNumber());
                row.createCell(1).setCellValue(order.getCreatedAt() != null ? order.getCreatedAt().toString() : "");
                row.createCell(2).setCellValue(order.getCustomerName());
                row.createCell(3).setCellValue(order.getTotalAmount() != null ? order.getTotalAmount().doubleValue() : 0.0);
                row.createCell(4).setCellValue(order.getDiscountAmount() != null ? order.getDiscountAmount().doubleValue() : 0.0);
                double total = order.getTotalAmount() != null ? order.getTotalAmount().doubleValue() : 0.0;
                double gst = total - (total / 1.18);
                row.createCell(5).setCellValue(Math.round(gst * 100.0) / 100.0);
                row.createCell(6).setCellValue(order.getOrderStatus());
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }
}
