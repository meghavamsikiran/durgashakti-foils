package com.durgashakti.order.service;

import com.durgashakti.common.entity.Order;
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.Map;

@Service
public class InvoiceServiceImpl implements InvoiceService {

    @Override
    public byte[] generateInvoicePdf(Order order) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document document = new Document();
        try {
            PdfWriter.getInstance(document, out);
            document.open();

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
            Font bodyFont = FontFactory.getFont(FontFactory.HELVETICA, 10);
            Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10);

            Paragraph title = new Paragraph("DURGA SHAKTI FOILS PVT. LTD.", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);

            Paragraph subtitle = new Paragraph("Tax Invoice / Bill of Supply", boldFont);
            subtitle.setAlignment(Element.ALIGN_CENTER);
            subtitle.setSpacingAfter(20);
            document.add(subtitle);

            document.add(new Paragraph("Order Number: " + order.getOrderNumber(), bodyFont));
            document.add(new Paragraph("Order Date: " + (order.getCreatedAt() != null ? order.getCreatedAt().toString() : "N/A"), bodyFont));
            document.add(new Paragraph("Payment Method: " + order.getPaymentMethod(), bodyFont));
            document.add(new Paragraph("Payment Status: " + order.getPaymentStatus(), bodyFont));
            document.add(new Paragraph("Customer Name: " + order.getCustomerName(), bodyFont));
            document.add(new Paragraph("\n", bodyFont));

            PdfPTable table = new PdfPTable(4);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{40, 20, 20, 20});

            table.addCell(new PdfPCell(new Phrase("Product Name", boldFont)));
            table.addCell(new PdfPCell(new Phrase("Price (INR)", boldFont)));
            table.addCell(new PdfPCell(new Phrase("Quantity", boldFont)));
            table.addCell(new PdfPCell(new Phrase("Total (INR)", boldFont)));

            List<Map<String, Object>> items = order.getItems();
            if (items != null) {
                for (Map<String, Object> item : items) {
                    table.addCell(new PdfPCell(new Phrase(String.valueOf(item.getOrDefault("product_name", "N/A")), bodyFont)));
                    table.addCell(new PdfPCell(new Phrase(String.valueOf(item.getOrDefault("price", "0.0")), bodyFont)));
                    table.addCell(new PdfPCell(new Phrase(String.valueOf(item.getOrDefault("quantity", "1")), bodyFont)));
                    double price = ((Number) item.getOrDefault("price", 0.0)).doubleValue();
                    int qty = ((Number) item.getOrDefault("quantity", 1)).intValue();
                    table.addCell(new PdfPCell(new Phrase(String.valueOf(price * qty), bodyFont)));
                }
            }

            document.add(table);
            document.add(new Paragraph("\n", bodyFont));

            Paragraph total = new Paragraph("Grand Total: INR " + order.getTotalAmount(), titleFont);
            total.setAlignment(Element.ALIGN_RIGHT);
            document.add(total);

            document.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return out.toByteArray();
    }
}
