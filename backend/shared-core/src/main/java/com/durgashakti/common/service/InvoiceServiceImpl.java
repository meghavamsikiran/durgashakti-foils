package com.durgashakti.common.service;

import com.durgashakti.common.entity.Order;
import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.Rectangle;
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
    private static final String COMPANY_ADDRESS = "Plot no 54, Shop no 1, Maruthi nagar, Mallampet, Hyderabad, Telangana - 500090";
    
    private static final String BANK_NAME = "HDFC BANK";
    private static final String BANK_ACCOUNT_NO = "50200115257570";
    private static final String BANK_IFSC = "HDFC0005472";
    private static final String BANK_ACCOUNT_HOLDER = "DURGASHAKTI FOILS PRIVATE LIMITED";

    private final DecimalFormat df = new DecimalFormat("0.00");

    @Override
    public byte[] generateInvoicePdf(Order order) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        // A4 page with minimal margins (0.5 inch / 36 points)
        Document document = new Document(PageSize.A4, 28, 28, 28, 28);
        try {
            PdfWriter.getInstance(document, out);
            document.open();

            // Brand Colors
            java.awt.Color primaryGreen = new java.awt.Color(0, 181, 96);
            java.awt.Color darkBlue = new java.awt.Color(30, 41, 59);
            java.awt.Color borderGray = new java.awt.Color(220, 224, 230);
            java.awt.Color bgLightGray = new java.awt.Color(248, 250, 252);

            // Fonts
            Font logoFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, Element.ALIGN_CENTER, java.awt.Color.WHITE);
            Font brandNameFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13, Element.ALIGN_LEFT, darkBlue);
            Font companyDetailsFont = FontFactory.getFont(FontFactory.HELVETICA, 7, Element.ALIGN_LEFT, darkBlue);
            
            Font docTitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, Element.ALIGN_RIGHT, darkBlue);
            Font headerBoldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, Element.ALIGN_RIGHT, darkBlue);
            Font headerValFont = FontFactory.getFont(FontFactory.HELVETICA, 8, Element.ALIGN_LEFT, darkBlue);

            Font tableHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, Element.ALIGN_CENTER, java.awt.Color.WHITE);
            Font tableBodyFont = FontFactory.getFont(FontFactory.HELVETICA, 8, Element.ALIGN_CENTER, darkBlue);
            Font tableBodyLeftFont = FontFactory.getFont(FontFactory.HELVETICA, 8, Element.ALIGN_LEFT, darkBlue);
            Font tableBodyBoldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, Element.ALIGN_RIGHT, darkBlue);

            Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Element.ALIGN_LEFT, primaryGreen);
            Font bodyBoldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, Element.ALIGN_LEFT, darkBlue);
            Font bodyFont = FontFactory.getFont(FontFactory.HELVETICA, 8, Element.ALIGN_LEFT, darkBlue);

            // ── TOP DECORATIVE BANNER ──────────────────────────────────────────
            PdfPTable topBannerTable = new PdfPTable(2);
            topBannerTable.setWidthPercentage(100);
            topBannerTable.setWidths(new float[]{30, 70});

            // Logo Box
            PdfPCell logoCell = new PdfPCell(new Phrase("Durga Shakti Foils", logoFont));
            logoCell.setBackgroundColor(darkBlue);
            logoCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            logoCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            logoCell.setPadding(10);
            logoCell.setBorder(Rectangle.NO_BORDER);
            topBannerTable.addCell(logoCell);

            // Contact Info Box (Green Banner)
            PdfPCell infoCell = new PdfPCell();
            infoCell.setBackgroundColor(primaryGreen);
            infoCell.setPadding(8);
            infoCell.setBorder(Rectangle.NO_BORDER);

            Paragraph infoPara = new Paragraph();
            infoPara.setAlignment(Element.ALIGN_RIGHT);
            infoPara.setFont(FontFactory.getFont(FontFactory.HELVETICA, 7, java.awt.Color.WHITE));
            infoPara.add(new Chunk("Phone: " + COMPANY_PHONE + "   |   Email: " + COMPANY_EMAIL + "\n", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7, java.awt.Color.WHITE)));
            infoPara.add(new Chunk("Address: " + COMPANY_ADDRESS, FontFactory.getFont(FontFactory.HELVETICA, 6, java.awt.Color.WHITE)));
            infoCell.addElement(infoPara);
            topBannerTable.addCell(infoCell);

            document.add(topBannerTable);
            document.add(new Paragraph("\n"));

            // ── SELLER & TAX INVOICE DETAILS ───────────────────────────────────
            PdfPTable midHeaderTable = new PdfPTable(2);
            midHeaderTable.setWidthPercentage(100);
            midHeaderTable.setWidths(new float[]{55, 45});

            // Left: Company Tax Identifiers
            PdfPCell leftHeaderCell = new PdfPCell();
            leftHeaderCell.setBorder(Rectangle.NO_BORDER);
            leftHeaderCell.addElement(new Paragraph(COMPANY_NAME, brandNameFont));
            leftHeaderCell.addElement(new Paragraph("GSTIN: " + COMPANY_GSTIN, companyDetailsFont));
            leftHeaderCell.addElement(new Paragraph("State: " + COMPANY_STATE, companyDetailsFont));
            midHeaderTable.addCell(leftHeaderCell);

            // Right: Invoice Metadatas
            PdfPCell rightHeaderCell = new PdfPCell();
            rightHeaderCell.setBorder(Rectangle.NO_BORDER);
            
            Paragraph titlePara = new Paragraph("Tax Invoice", docTitleFont);
            titlePara.setAlignment(Element.ALIGN_RIGHT);
            rightHeaderCell.addElement(titlePara);

            // Create Grid for Metadata
            PdfPTable metaGrid = new PdfPTable(2);
            metaGrid.setWidthPercentage(100);
            metaGrid.setWidths(new float[]{45, 55});
            metaGrid.setHorizontalAlignment(Element.ALIGN_RIGHT);

            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
            String formattedDate = order.getCreatedAt() != null ? order.getCreatedAt().format(formatter) : "N/A";

            addMetaRow(metaGrid, "Invoice No.:", order.getOrderNumber(), headerBoldFont, headerValFont);
            addMetaRow(metaGrid, "Date:", formattedDate, headerBoldFont, headerValFont);
            addMetaRow(metaGrid, "Place of Supply:", COMPANY_STATE, headerBoldFont, headerValFont);
            addMetaRow(metaGrid, "Transaction ID:", order.getRazorpayPaymentId() != null ? order.getRazorpayPaymentId() : "N/A", headerBoldFont, headerValFont);
            
            rightHeaderCell.addElement(metaGrid);
            midHeaderTable.addCell(rightHeaderCell);

            document.add(midHeaderTable);
            document.add(new Paragraph("\n"));

            // ── BILL TO & SHIP TO SECTION ─────────────────────────────────────
            PdfPTable partyTable = new PdfPTable(2);
            partyTable.setWidthPercentage(100);
            partyTable.setWidths(new float[]{50, 50});

            // Bill To Box
            PdfPCell billToCell = new PdfPCell();
            billToCell.setPadding(8);
            billToCell.setBorderColor(borderGray);
            billToCell.setBackgroundColor(bgLightGray);
            billToCell.addElement(new Paragraph("Bill To:", labelFont));
            billToCell.addElement(new Paragraph(order.getCustomerName(), bodyBoldFont));
            
            Map<String, Object> addr = order.getShippingAddress();
            if (addr != null) {
                String street = String.valueOf(addr.getOrDefault("address_line1", addr.getOrDefault("street", "")));
                String city = String.valueOf(addr.getOrDefault("city", ""));
                String state = String.valueOf(addr.getOrDefault("state", ""));
                String pin = String.valueOf(addr.getOrDefault("pincode", addr.getOrDefault("pin", "")));
                String phone = String.valueOf(addr.getOrDefault("phone", ""));
                
                billToCell.addElement(new Paragraph(street, bodyFont));
                billToCell.addElement(new Paragraph(city + ", " + state + " - " + pin, bodyFont));
                billToCell.addElement(new Paragraph("India", bodyFont));
                if (!phone.isEmpty()) {
                    billToCell.addElement(new Paragraph("Contact No.: " + phone, bodyFont));
                }
            } else {
                billToCell.addElement(new Paragraph("Not Provided", bodyFont));
            }
            partyTable.addCell(billToCell);

            // Ship To Box
            PdfPCell shipToCell = new PdfPCell();
            shipToCell.setPadding(8);
            shipToCell.setBorderColor(borderGray);
            shipToCell.setBackgroundColor(bgLightGray);
            shipToCell.addElement(new Paragraph("Ship To:", labelFont));
            shipToCell.addElement(new Paragraph(order.getCustomerName(), bodyBoldFont));
            if (addr != null) {
                String street = String.valueOf(addr.getOrDefault("address_line1", addr.getOrDefault("street", "")));
                String city = String.valueOf(addr.getOrDefault("city", ""));
                String state = String.valueOf(addr.getOrDefault("state", ""));
                String pin = String.valueOf(addr.getOrDefault("pincode", addr.getOrDefault("pin", "")));
                
                shipToCell.addElement(new Paragraph(street, bodyFont));
                shipToCell.addElement(new Paragraph(city + ", " + state + " - " + pin, bodyFont));
                shipToCell.addElement(new Paragraph("India", bodyFont));
            } else {
                shipToCell.addElement(new Paragraph("Not Provided", bodyFont));
            }
            partyTable.addCell(shipToCell);

            document.add(partyTable);
            document.add(new Paragraph("\n"));

            // ── ITEMS TABLE ───────────────────────────────────────────────────
            PdfPTable table = new PdfPTable(8);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{6, 34, 10, 8, 10, 10, 10, 12});

            // Table Headers
            String[] headers = {"#", "Item Name", "HSN", "Quantity", "Unit", "Price/Unit", "GST", "Amount"};
            for (String hText : headers) {
                PdfPCell cell = new PdfPCell(new Phrase(hText, tableHeaderFont));
                cell.setBackgroundColor(primaryGreen);
                cell.setBorderColor(borderGray);
                cell.setPadding(6);
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                table.addCell(cell);
            }

            List<Map<String, Object>> items = order.getItems();
            double subtotalBeforeTax = 0.0;
            double cgstTotal = 0.0;
            double sgstTotal = 0.0;
            double grandTotal = order.getTotalAmount().doubleValue();
            
            int count = 1;
            int totalQty = 0;
            double totalGstVal = 0.0;

            if (items != null) {
                for (Map<String, Object> item : items) {
                    double price = ((Number) item.getOrDefault("price", 0.0)).doubleValue();
                    int qty = ((Number) item.getOrDefault("quantity", 1)).intValue();
                    double itemTotalInclTax = price * qty;
                    
                    double itemTotalTaxable = itemTotalInclTax / 1.18;
                    double itemCgst = itemTotalTaxable * 0.09;
                    double itemSgst = itemTotalTaxable * 0.09;
                    
                    // Standard Roundings
                    itemTotalTaxable = Math.round(itemTotalTaxable * 100.0) / 100.0;
                    itemCgst = Math.round(itemCgst * 100.0) / 100.0;
                    itemSgst = Math.round(itemSgst * 100.0) / 100.0;
                    double unitPriceTaxable = Math.round((itemTotalTaxable / qty) * 100.0) / 100.0;
                    double itemGst = itemCgst + itemSgst;

                    subtotalBeforeTax += itemTotalTaxable;
                    cgstTotal += itemCgst;
                    sgstTotal += itemSgst;
                    totalQty += qty;
                    totalGstVal += itemGst;

                    // Write cells
                    PdfPCell cellNo = new PdfPCell(new Phrase(String.valueOf(count++), tableBodyFont));
                    cellNo.setHorizontalAlignment(Element.ALIGN_CENTER);

                    String pName = String.valueOf(item.getOrDefault("product_name", "Product"));
                    String sz = item.get("selectedSize") != null ? " (" + item.get("selectedSize") + ")" : "";
                    PdfPCell cellName = new PdfPCell(new Phrase(pName + sz, tableBodyLeftFont));

                    PdfPCell cellHsn = new PdfPCell(new Phrase("76071991", tableBodyFont));
                    cellHsn.setHorizontalAlignment(Element.ALIGN_CENTER);

                    PdfPCell cellQty = new PdfPCell(new Phrase(String.valueOf(qty), tableBodyFont));
                    cellQty.setHorizontalAlignment(Element.ALIGN_CENTER);

                    PdfPCell cellUnit = new PdfPCell(new Phrase("Roll", tableBodyFont));
                    cellUnit.setHorizontalAlignment(Element.ALIGN_CENTER);

                    PdfPCell cellPrice = new PdfPCell(new Phrase("Rs. " + df.format(unitPriceTaxable), tableBodyFont));
                    cellPrice.setHorizontalAlignment(Element.ALIGN_RIGHT);

                    PdfPCell cellGstCol = new PdfPCell(new Phrase("Rs. " + df.format(itemGst) + " (18%)", tableBodyFont));
                    cellGstCol.setHorizontalAlignment(Element.ALIGN_RIGHT);

                    PdfPCell cellTotalCol = new PdfPCell(new Phrase("Rs. " + df.format(itemTotalInclTax), tableBodyFont));
                    cellTotalCol.setHorizontalAlignment(Element.ALIGN_RIGHT);

                    for (PdfPCell c : new PdfPCell[]{cellNo, cellName, cellHsn, cellQty, cellUnit, cellPrice, cellGstCol, cellTotalCol}) {
                        c.setBorderColor(borderGray);
                        c.setPadding(6);
                        table.addCell(c);
                    }
                }
            }

            // Green Total Row at the bottom of the items table
            PdfPCell totalLabelCell = new PdfPCell(new Phrase("Total", tableHeaderFont));
            totalLabelCell.setColspan(3);
            totalLabelCell.setBackgroundColor(primaryGreen);
            totalLabelCell.setBorderColor(borderGray);
            totalLabelCell.setPadding(6);
            totalLabelCell.setHorizontalAlignment(Element.ALIGN_LEFT);
            table.addCell(totalLabelCell);

            PdfPCell totalQtyCell = new PdfPCell(new Phrase(String.valueOf(totalQty), tableHeaderFont));
            totalQtyCell.setBackgroundColor(primaryGreen);
            totalQtyCell.setBorderColor(borderGray);
            totalQtyCell.setPadding(6);
            totalQtyCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            table.addCell(totalQtyCell);

            // Empty unit cell in total row
            PdfPCell emptyUnitCell = new PdfPCell(new Phrase("", tableHeaderFont));
            emptyUnitCell.setBackgroundColor(primaryGreen);
            emptyUnitCell.setBorderColor(borderGray);
            emptyUnitCell.setPadding(6);
            table.addCell(emptyUnitCell);

            // Empty price cell in total row
            PdfPCell emptyPriceCell = new PdfPCell(new Phrase("", tableHeaderFont));
            emptyPriceCell.setBackgroundColor(primaryGreen);
            emptyPriceCell.setBorderColor(borderGray);
            emptyPriceCell.setPadding(6);
            table.addCell(emptyPriceCell);

            PdfPCell totalGstCell = new PdfPCell(new Phrase("Rs. " + df.format(totalGstVal), tableHeaderFont));
            totalGstCell.setBackgroundColor(primaryGreen);
            totalGstCell.setBorderColor(borderGray);
            totalGstCell.setPadding(6);
            totalGstCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            table.addCell(totalGstCell);

            PdfPCell totalAmountCell = new PdfPCell(new Phrase("Rs. " + df.format(subtotalBeforeTax + totalGstVal), tableHeaderFont));
            totalAmountCell.setBackgroundColor(primaryGreen);
            totalAmountCell.setBorderColor(borderGray);
            totalAmountCell.setPadding(6);
            totalAmountCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            table.addCell(totalAmountCell);

            document.add(table);
            document.add(new Paragraph("\n"));

            // Calculate fees & shipping
            double discount = order.getDiscountAmount() != null ? order.getDiscountAmount().doubleValue() : 0.0;
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

            // ── BOTTOM SUMMARY, PAY TO & TERMS SECTION ────────────────────────
            PdfPTable bottomTable = new PdfPTable(2);
            bottomTable.setWidthPercentage(100);
            bottomTable.setWidths(new float[]{55, 45});

            // Left details (Pay To, Terms, Signature)
            PdfPCell leftCell = new PdfPCell();
            leftCell.setBorder(Rectangle.NO_BORDER);
            leftCell.setPadding(4);

            leftCell.addElement(new Paragraph("Pay To:", labelFont));
            
            Paragraph bankDetails = new Paragraph();
            bankDetails.setFont(bodyFont);
            bankDetails.add(new Chunk("Bank Name: ", bodyBoldFont));
            bankDetails.add(new Chunk(BANK_NAME + "\n", bodyFont));
            bankDetails.add(new Chunk("Account No: ", bodyBoldFont));
            bankDetails.add(new Chunk(BANK_ACCOUNT_NO + "\n", bodyFont));
            bankDetails.add(new Chunk("Bank IFSC: ", bodyBoldFont));
            bankDetails.add(new Chunk(BANK_IFSC + "\n", bodyFont));
            bankDetails.add(new Chunk("Account Name: ", bodyBoldFont));
            bankDetails.add(new Chunk(BANK_ACCOUNT_HOLDER + "\n", bodyFont));
            leftCell.addElement(bankDetails);

            leftCell.addElement(new Paragraph("\nTerms And Conditions:", labelFont));
            Paragraph termsPara = new Paragraph(
                    "1. All sales subject to GST Tax and/or any Govt. Taxes as applicable under Govt. Rules.\n" +
                    "2. Payment to be made in cash failing which interest @ 24% will be charged if the delivery of the goods is not taken within three days thereof.\n" +
                    "3. Seller will not accept any responsibility or admit any claim for shortage and/or damage after the goods have left their premises or in transit.",
                    FontFactory.getFont(FontFactory.HELVETICA, 5, darkBlue)
            );
            leftCell.addElement(termsPara);

            // Authorized signatory spacer
            leftCell.addElement(new Paragraph("\n\nFor DURGASHAKTIFOILS PVT.LTD\n\n\n\nAuthorized Signatory", companyDetailsFont));
            bottomTable.addCell(leftCell);

            // Right details (Detailed breakouts & grand total)
            PdfPCell rightCell = new PdfPCell();
            rightCell.setBorder(Rectangle.NO_BORDER);
            rightCell.setPadding(4);

            PdfPTable summaryGrid = new PdfPTable(2);
            summaryGrid.setWidthPercentage(100);
            summaryGrid.setWidths(new float[]{65, 35});

            addSummaryRow(summaryGrid, "Sub Total", "Rs. " + df.format(subtotalBeforeTax), tableBodyLeftFont, tableBodyBoldFont, borderGray, null);
            addSummaryRow(summaryGrid, "SGST @ 9%", "Rs. " + df.format(sgstTotal), tableBodyLeftFont, tableBodyBoldFont, borderGray, null);
            addSummaryRow(summaryGrid, "CGST @ 9%", "Rs. " + df.format(cgstTotal), tableBodyLeftFont, tableBodyBoldFont, borderGray, null);
            if (discount > 0) {
                addSummaryRow(summaryGrid, "Discount", "- Rs. " + df.format(discount), tableBodyLeftFont, tableBodyBoldFont, borderGray, null);
            }
            if (shippingCharge > 0) {
                addSummaryRow(summaryGrid, "Shipping", "Rs. " + df.format(shippingCharge), tableBodyLeftFont, tableBodyBoldFont, borderGray, null);
            }
            if (codCharge > 0) {
                addSummaryRow(summaryGrid, "COD Charges", "Rs. " + df.format(codCharge), tableBodyLeftFont, tableBodyBoldFont, borderGray, null);
            }

            // Green Grand Total row matching total table bar
            addSummaryRow(summaryGrid, "Total", "Rs. " + df.format(grandTotal), tableHeaderFont, tableHeaderFont, borderGray, primaryGreen);
            addSummaryRow(summaryGrid, "Received", "Rs. " + df.format(grandTotal), tableBodyLeftFont, tableBodyBoldFont, borderGray, null);
            addSummaryRow(summaryGrid, "Balance", "Rs. 0.00", tableBodyLeftFont, tableBodyBoldFont, borderGray, null);

            rightCell.addElement(summaryGrid);
            bottomTable.addCell(rightCell);

            document.add(bottomTable);

            // Footer Spacer
            document.add(new Paragraph("\n"));

            // ── BOTTOM DECORATIVE BAND ───────────────────────────────────────
            PdfPTable bottomBannerTable = new PdfPTable(2);
            bottomBannerTable.setWidthPercentage(100);
            bottomBannerTable.setWidths(new float[]{65, 35});
            
            PdfPCell bottomBlueCell = new PdfPCell();
            bottomBlueCell.setBackgroundColor(darkBlue);
            bottomBlueCell.setFixedHeight(12);
            bottomBlueCell.setBorder(Rectangle.NO_BORDER);
            bottomBannerTable.addCell(bottomBlueCell);

            PdfPCell bottomGreenCell = new PdfPCell();
            bottomGreenCell.setBackgroundColor(primaryGreen);
            bottomGreenCell.setFixedHeight(12);
            bottomGreenCell.setBorder(Rectangle.NO_BORDER);
            bottomBannerTable.addCell(bottomGreenCell);

            document.add(bottomBannerTable);

            document.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return out.toByteArray();
    }

    private void addMetaRow(PdfPTable grid, String label, String val, Font labelFont, Font valFont) {
        PdfPCell cellLabel = new PdfPCell(new Phrase(label, labelFont));
        cellLabel.setBorder(Rectangle.NO_BORDER);
        cellLabel.setPadding(2);
        cellLabel.setHorizontalAlignment(Element.ALIGN_RIGHT);
        grid.addCell(cellLabel);

        PdfPCell cellVal = new PdfPCell(new Phrase(val, valFont));
        cellVal.setBorder(Rectangle.NO_BORDER);
        cellVal.setPadding(2);
        cellVal.setHorizontalAlignment(Element.ALIGN_LEFT);
        grid.addCell(cellVal);
    }

    private void addSummaryRow(PdfPTable table, String label, String value, Font labelFont, Font valFont, java.awt.Color borderCol, java.awt.Color bgCol) {
        PdfPCell cellLabel = new PdfPCell(new Phrase(label, labelFont));
        cellLabel.setBorderColor(borderCol);
        cellLabel.setPadding(5);
        if (bgCol != null) {
            cellLabel.setBackgroundColor(bgCol);
        }
        table.addCell(cellLabel);

        PdfPCell cellValue = new PdfPCell(new Phrase(value, valFont));
        cellValue.setBorderColor(borderCol);
        cellValue.setPadding(5);
        cellValue.setHorizontalAlignment(Element.ALIGN_RIGHT);
        if (bgCol != null) {
            cellValue.setBackgroundColor(bgCol);
        }
        table.addCell(cellValue);
    }
}
