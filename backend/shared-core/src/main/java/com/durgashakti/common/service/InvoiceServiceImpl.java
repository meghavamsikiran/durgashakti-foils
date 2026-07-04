package com.durgashakti.common.service;

import com.durgashakti.common.entity.Order;
import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.*;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.text.DecimalFormat;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Service
public class InvoiceServiceImpl implements InvoiceService {

    private static final String COMPANY_NAME = "DURGASHAKTIFOILS PVT.LTD";
    private static final String COMPANY_GSTIN = "36AALCD9777D1Z5";
    private static final String COMPANY_STATE = "36-Telangana";
    private static final String COMPANY_PHONE = "9901452954";
    private static final String COMPANY_EMAIL = "Durgashaktifoils@gmail.com";
    private static final String COMPANY_ADDRESS = "Plot no 54,Shop no 1, Maruthi nagar, Mallampet, Hyderabad, Telangana - 500090";
    
    private static final String BANK_NAME = "HDFC BANK";
    private static final String BANK_ACCOUNT_NO = "50200115257570";
    private static final String BANK_IFSC = "HDFC0005472";
    private static final String BANK_ACCOUNT_HOLDER = "DURGASHAKTI FOILS PRIVATE LIMITED";

    private final DecimalFormat df = new DecimalFormat("₹ #,##0.00");

    @Override
    public byte[] generateInvoicePdf(Order order) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 36, 36, 36, 36);
        try {
            PdfWriter.getInstance(document, out);
            document.open();

            // Fonts
            Font brandFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, Element.ALIGN_CENTER);
            Font sectionTitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10);
            Font bodyFont = FontFactory.getFont(FontFactory.HELVETICA, 8);
            Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8);
            Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8);

            // Header Section Table
            PdfPTable headerTable = new PdfPTable(2);
            headerTable.setWidthPercentage(100);
            headerTable.setWidths(new float[]{60, 40});

            // Seller details cell
            PdfPCell sellerCell = new PdfPCell();
            sellerCell.setBorder(Rectangle.NO_BORDER);
            sellerCell.addElement(new Paragraph(COMPANY_NAME, brandFont));
            sellerCell.addElement(new Paragraph(COMPANY_ADDRESS, bodyFont));
            sellerCell.addElement(new Paragraph("GSTIN: " + COMPANY_GSTIN + " | State: " + COMPANY_STATE, boldFont));
            sellerCell.addElement(new Paragraph("Phone: " + COMPANY_PHONE + " | Email: " + COMPANY_EMAIL, bodyFont));
            headerTable.addCell(sellerCell);

            // Invoice Metadata cell
            PdfPCell metaCell = new PdfPCell();
            metaCell.setBorder(Rectangle.NO_BORDER);
            metaCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            Paragraph docTitle = new Paragraph("TAX INVOICE", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16));
            docTitle.setAlignment(Element.ALIGN_RIGHT);
            metaCell.addElement(docTitle);
            
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
            String formattedDate = order.getCreatedAt() != null ? order.getCreatedAt().format(formatter) : "N/A";
            
            Paragraph metaDetails = new Paragraph();
            metaDetails.setAlignment(Element.ALIGN_RIGHT);
            metaDetails.add(new Chunk("Invoice No: ", boldFont));
            metaDetails.add(new Chunk(order.getOrderNumber() + "\n", bodyFont));
            metaDetails.add(new Chunk("Date: ", boldFont));
            metaDetails.add(new Chunk(formattedDate + "\n", bodyFont));
            metaDetails.add(new Chunk("Payment Method: ", boldFont));
            metaDetails.add(new Chunk(String.valueOf(order.getPaymentMethod()).toUpperCase() + "\n", bodyFont));
            metaDetails.add(new Chunk("Payment Status: ", boldFont));
            metaDetails.add(new Chunk(String.valueOf(order.getPaymentStatus()).toUpperCase(), bodyFont));
            metaCell.addElement(metaDetails);
            headerTable.addCell(metaCell);

            document.add(headerTable);
            document.add(new Paragraph("\n"));

            // Customer details block
            PdfPTable partyTable = new PdfPTable(1);
            partyTable.setWidthPercentage(100);
            PdfPCell partyCell = new PdfPCell();
            partyCell.setPadding(8);
            partyCell.setBorderColor(new java.awt.Color(229, 231, 235));
            partyCell.setBackgroundColor(new java.awt.Color(249, 250, 251));
            
            partyCell.addElement(new Paragraph("BILL TO / SHIPPING ADDRESS:", sectionTitleFont));
            partyCell.addElement(new Paragraph("Customer Name: " + order.getCustomerName(), boldFont));
            
            Map<String, Object> addr = order.getShippingAddress();
            if (addr != null) {
                String street = String.valueOf(addr.getOrDefault("street", ""));
                String city = String.valueOf(addr.getOrDefault("city", ""));
                String state = String.valueOf(addr.getOrDefault("state", ""));
                String pin = String.valueOf(addr.getOrDefault("pincode", addr.getOrDefault("pin", "")));
                String phone = String.valueOf(addr.getOrDefault("phone", ""));
                partyCell.addElement(new Paragraph(street + ", " + city + ", " + state + " - " + pin, bodyFont));
                if (!phone.isEmpty()) {
                    partyCell.addElement(new Paragraph("Contact Phone: " + phone, bodyFont));
                }
            } else {
                partyCell.addElement(new Paragraph("Shipping Address not specified.", bodyFont));
            }
            partyTable.addCell(partyCell);
            document.add(partyTable);
            document.add(new Paragraph("\n"));

            // Table of items
            PdfPTable table = new PdfPTable(8);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{6, 30, 10, 8, 12, 10, 10, 14});
            
            // Header Row styling helper
            java.awt.Color headBg = new java.awt.Color(243, 244, 246);
            java.awt.Color borderCol = new java.awt.Color(209, 213, 219);
            
            String[] headers = {"#", "Product Name", "HSN", "Qty", "Unit Price", "CGST (9%)", "SGST (9%)", "Total Amount"};
            for (String headerText : headers) {
                PdfPCell hCell = new PdfPCell(new Phrase(headerText, headerFont));
                hCell.setBackgroundColor(headBg);
                hCell.setBorderColor(borderCol);
                hCell.setPadding(6);
                hCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                table.addCell(hCell);
            }

            List<Map<String, Object>> items = order.getItems();
            double subtotalBeforeTax = 0.0;
            double cgstTotal = 0.0;
            double sgstTotal = 0.0;
            
            int count = 1;
            if (items != null) {
                for (Map<String, Object> item : items) {
                    double price = ((Number) item.getOrDefault("price", 0.0)).doubleValue();
                    int qty = ((Number) item.getOrDefault("quantity", 1)).intValue();
                    double itemTotalInclTax = price * qty;
                    
                    double itemTotalTaxable = itemTotalInclTax / 1.18;
                    double itemCgst = itemTotalTaxable * 0.09;
                    double itemSgst = itemTotalTaxable * 0.09;
                    
                    // Round to 2 decimals
                    itemTotalTaxable = Math.round(itemTotalTaxable * 100.0) / 100.0;
                    itemCgst = Math.round(itemCgst * 100.0) / 100.0;
                    itemSgst = Math.round(itemSgst * 100.0) / 100.0;
                    double unitPrice = Math.round((itemTotalTaxable / qty) * 100.0) / 100.0;
                    
                    subtotalBeforeTax += itemTotalTaxable;
                    cgstTotal += itemCgst;
                    sgstTotal += itemSgst;

                    // Row cells
                    PdfPCell c1 = new PdfPCell(new Phrase(String.valueOf(count++), bodyFont));
                    c1.setHorizontalAlignment(Element.ALIGN_CENTER);
                    
                    PdfPCell c2 = new PdfPCell(new Phrase(String.valueOf(item.getOrDefault("product_name", "N/A")), bodyFont));
                    
                    PdfPCell c3 = new PdfPCell(new Phrase("76071991", bodyFont)); // Standard foil HSN
                    c3.setHorizontalAlignment(Element.ALIGN_CENTER);
                    
                    PdfPCell c4 = new PdfPCell(new Phrase(String.valueOf(qty), bodyFont));
                    c4.setHorizontalAlignment(Element.ALIGN_CENTER);
                    
                    PdfPCell c5 = new PdfPCell(new Phrase(df.format(unitPrice), bodyFont));
                    c5.setHorizontalAlignment(Element.ALIGN_RIGHT);
                    
                    PdfPCell c6 = new PdfPCell(new Phrase(df.format(itemCgst), bodyFont));
                    c6.setHorizontalAlignment(Element.ALIGN_RIGHT);
                    
                    PdfPCell c7 = new PdfPCell(new Phrase(df.format(itemSgst), bodyFont));
                    c7.setHorizontalAlignment(Element.ALIGN_RIGHT);
                    
                    PdfPCell c8 = new PdfPCell(new Phrase(df.format(itemTotalInclTax), boldFont));
                    c8.setHorizontalAlignment(Element.ALIGN_RIGHT);

                    for (PdfPCell cell : new PdfPCell[]{c1, c2, c3, c4, c5, c6, c7, c8}) {
                        cell.setBorderColor(new java.awt.Color(243, 244, 246));
                        cell.setPadding(6);
                        table.addCell(cell);
                    }
                }
            }

            document.add(table);
            document.add(new Paragraph("\n"));

            // Calculate remaining fees (shipping & COD charges)
            double discount = order.getDiscountAmount() != null ? order.getDiscountAmount().doubleValue() : 0.0;
            double grandTotal = order.getTotalAmount().doubleValue();
            double remaining = grandTotal - (subtotalBeforeTax + cgstTotal + sgstTotal - discount);
            remaining = Math.round(remaining * 100.0) / 100.0;

            double shippingCharge = 0.0;
            double codCharge = 0.0;
            if (remaining > 0) {
                if ("cod".equalsIgnoreCase(order.getPaymentMethod())) {
                    if (remaining >= 20.0) {
                        codCharge = 20.0;
                        shippingCharge = remaining - 20.0;
                    } else {
                        codCharge = remaining;
                        shippingCharge = 0.0;
                    }
                } else {
                    shippingCharge = remaining;
                }
            }

            // Summary, bank details & signatory blocks
            PdfPTable bottomTable = new PdfPTable(2);
            bottomTable.setWidthPercentage(100);
            bottomTable.setWidths(new float[]{55, 45});

            // Left side details (Bank Details & Notes)
            PdfPCell bankCell = new PdfPCell();
            bankCell.setBorder(Rectangle.NO_BORDER);
            bankCell.addElement(new Paragraph("BANK ACCOUNT DETAILS FOR PAYMENT:", sectionTitleFont));
            bankCell.addElement(new Paragraph("Account Name: " + BANK_ACCOUNT_HOLDER, boldFont));
            bankCell.addElement(new Paragraph("Bank Name: " + BANK_NAME, bodyFont));
            bankCell.addElement(new Paragraph("Account No: " + BANK_ACCOUNT_NO, bodyFont));
            bankCell.addElement(new Paragraph("IFSC Code: " + BANK_IFSC, bodyFont));
            bankCell.addElement(new Paragraph("\nTerms & Conditions:", boldFont));
            bankCell.addElement(new Paragraph("1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged for delayed payments.", bodyFont));
            bottomTable.addCell(bankCell);

            // Right side details (Breakout values)
            PdfPCell summaryCell = new PdfPCell();
            summaryCell.setBorder(Rectangle.NO_BORDER);
            
            PdfPTable summaryGrid = new PdfPTable(2);
            summaryGrid.setWidthPercentage(100);
            summaryGrid.setWidths(new float[]{60, 40});
            
            addSummaryRow(summaryGrid, "Items Subtotal (Taxable):", df.format(subtotalBeforeTax), bodyFont, false);
            if (cgstTotal > 0) addSummaryRow(summaryGrid, "CGST (9%):", df.format(cgstTotal), bodyFont, false);
            if (sgstTotal > 0) addSummaryRow(summaryGrid, "SGST (9%):", df.format(sgstTotal), bodyFont, false);
            if (discount > 0) addSummaryRow(summaryGrid, "Coupon Discount:", "- " + df.format(discount), bodyFont, false);
            if (shippingCharge > 0) addSummaryRow(summaryGrid, "Shipping Charges:", df.format(shippingCharge), bodyFont, false);
            if (codCharge > 0) addSummaryRow(summaryGrid, "COD Service Charge:", df.format(codCharge), bodyFont, false);
            addSummaryRow(summaryGrid, "Grand Total:", df.format(grandTotal), boldFont, true);
            
            summaryCell.addElement(summaryGrid);
            summaryCell.addElement(new Paragraph("\n"));
            
            Paragraph authParagraph = new Paragraph("For " + COMPANY_NAME, boldFont);
            authParagraph.setAlignment(Element.ALIGN_RIGHT);
            summaryCell.addElement(authParagraph);
            
            summaryCell.addElement(new Paragraph("\n\n"));
            Paragraph signatoryParagraph = new Paragraph("Authorized Signatory", boldFont);
            signatoryParagraph.setAlignment(Element.ALIGN_RIGHT);
            summaryCell.addElement(signatoryParagraph);
            
            bottomTable.addCell(summaryCell);
            document.add(bottomTable);

            document.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return out.toByteArray();
    }

    private void addSummaryRow(PdfPTable grid, String label, String value, Font font, boolean highlight) {
        PdfPCell c1 = new PdfPCell(new Phrase(label, font));
        PdfPCell c2 = new PdfPCell(new Phrase(value, font));
        c2.setHorizontalAlignment(Element.ALIGN_RIGHT);
        
        if (highlight) {
            java.awt.Color highlightBg = new java.awt.Color(243, 244, 246);
            c1.setBackgroundColor(highlightBg);
            c2.setBackgroundColor(highlightBg);
        }
        c1.setBorder(Rectangle.NO_BORDER);
        c2.setBorder(Rectangle.NO_BORDER);
        c1.setPadding(4);
        c2.setPadding(4);
        grid.addCell(c1);
        grid.addCell(c2);
    }
}
