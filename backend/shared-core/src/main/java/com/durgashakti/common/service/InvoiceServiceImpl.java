package com.durgashakti.common.service;

import com.durgashakti.common.entity.Order;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Image;
import com.lowagie.text.PageSize;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfPageEventHelper;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.text.DecimalFormat;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class InvoiceServiceImpl implements InvoiceService {

    private static final String COMPANY_NAME = "DURGASHAKTIFOILS PVT.LTD";
    private static final String COMPANY_GSTIN = "36AALCD9777D1Z5";
    private static final String COMPANY_STATE = "36-Telangana";
    private static final String COMPANY_PHONE = "9901452954";
    private static final String COMPANY_EMAIL = "Durgashaktifoils@gmail.com";
    private static final String[] COMPANY_ADDRESS_LINES = {
        "Plot no 54,Shop no 1, Maruthi",
        "nagar, Mallampet, Hyderabad,",
        "Telangana"
    };

    private static final String BANK_NAME = "HDFC BANK";
    private static final String BANK_ACCOUNT_NO = "50200115257570";
    private static final String BANK_IFSC = "HDFC0005472";
    private static final String BANK_ACCOUNT_HOLDER = "DURGASHAKTI FOILS PRIVATE LIMITED";

    // Layout Scale Constants matching Python legacy code
    private static final float PAGE_WIDTH = 595.92f;
    private static final float PAGE_HEIGHT = 842.88f;
    private static final float PAGE_SCALE = PAGE_WIDTH / 894.0f; // ~0.666577f
    private static final float C_LEFT = 41.625f;
    private static final float C_BOTTOM = 42.183f;
    private static final float RIGHT_COLUMN_X = PAGE_WIDTH - 44.0f;

    // Coordinate mapping coordinates
    private static final Map<String, Float> X = Map.ofEntries(
        Map.entry("x2", 642.058567f),
        Map.entry("x3", 241.330074f),
        Map.entry("x4", 634.693339f),
        Map.entry("x5", 16.541015f),
        Map.entry("x6", 524.531228f),
        Map.entry("x7", 12.146484f),
        Map.entry("x8", 527.660134f),
        Map.entry("x9", 528.908187f),
        Map.entry("xa", 13.271484f),
        Map.entry("xb", 46.458982f),
        Map.entry("xc", 47.707029f),
        Map.entry("xd", 255.128896f),
        Map.entry("xe", 25.910155f),
        Map.entry("xf", 497.091782f)
    );

    private static final Map<String, Float> Y = Map.ofEntries(
        Map.entry("y2", 1164.761663f),
        Map.entry("y3", 1109.636666f),
        Map.entry("y4", 1123.136665f),
        Map.entry("y5", 1096.136666f),
        Map.entry("y6", 1051.136668f),
        Map.entry("y7", 1027.511669f),
        Map.entry("y8", 1012.886670f),
        Map.entry("y9", 1009.511670f),
        Map.entry("ya", 979.136671f),
        Map.entry("yb", 948.761672f),
        Map.entry("yc", 926.261673f),
        Map.entry("yd", 912.761674f),
        Map.entry("ye", 899.261675f),
        Map.entry("yf", 885.761675f),
        Map.entry("y10", 872.261676f),
        Map.entry("y11", 853.136676f),
        Map.entry("y12", 832.886677f),
        Map.entry("y13", 813.761678f),
        Map.entry("y14", 958.886672f),
        Map.entry("y15", 939.761673f),
        Map.entry("y16", 911.636674f),
        Map.entry("y17", 894.761675f),
        Map.entry("y18", 881.261675f),
        Map.entry("y19", 778.886680f),
        Map.entry("y1a", 747.386681f),
        Map.entry("y1b", 754.136681f),
        Map.entry("y1c", 741.761681f),
        Map.entry("y1d", 715.886682f),
        Map.entry("y1e", 691.136683f),
        Map.entry("y1f", 666.386684f),
        Map.entry("y20", 641.636685f),
        Map.entry("y21", 616.886686f),
        Map.entry("y22", 577.511688f),
        Map.entry("y23", 557.261689f),
        Map.entry("y24", 537.011690f),
        Map.entry("y25", 516.761690f),
        Map.entry("y26", 497.636691f),
        Map.entry("y27", 460.511693f),
        Map.entry("y28", 440.261694f),
        Map.entry("y29", 409.886695f),
        Map.entry("y2a", 389.636696f),
        Map.entry("y2b", 376.136696f),
        Map.entry("y2c", 362.636697f),
        Map.entry("y2d", 349.136697f),
        Map.entry("y2e", 335.636698f),
        Map.entry("y2f", 322.136699f),
        Map.entry("y30", 308.636699f),
        Map.entry("y31", 295.136700f),
        Map.entry("y32", 281.636700f),
        Map.entry("y33", 268.136701f),
        Map.entry("y34", 254.636701f),
        Map.entry("y35", 241.136702f),
        Map.entry("y36", 227.636703f),
        Map.entry("y37", 214.136703f),
        Map.entry("y38", 200.636704f),
        Map.entry("y39", 187.136704f),
        Map.entry("y3a", 173.636705f),
        Map.entry("y3b", 132.011706f),
        Map.entry("y3c", 58.886710f),
        Map.entry("y3d", 593.261687f),
        Map.entry("y3e", 573.011688f),
        Map.entry("y3f", 551.636689f),
        Map.entry("y40", 526.886690f),
        Map.entry("y41", 502.136691f),
        Map.entry("y42", 481.886692f)
    );

    // Font Size Mapping
    private static final Map<String, Float> FS = Map.of(
        "fs0", 30.24f * 0.375f * PAGE_SCALE,  // 7.558f
        "fs1", 28.56f * 0.375f * PAGE_SCALE,  // 7.138f
        "fs2", 53.76f * 0.375f * PAGE_SCALE,  // 13.43f
        "fs3", 25.17f * 0.375f * PAGE_SCALE,  // 6.29f
        "fs4", 67.20f * 0.375f * PAGE_SCALE,  // 16.79f
        "fs5", 35.28f * 0.375f * PAGE_SCALE,  // 8.81f
        "fs6", 50.37f * 0.375f * PAGE_SCALE,  // 12.59f
        "fs7", 26.88f * 0.375f * PAGE_SCALE,  // 6.71f
        "fs8", 21.84f * 0.375f * PAGE_SCALE,  // 5.46f
        "fs9", 33.60f * 0.375f * PAGE_SCALE   // 8.39f
    );

    private final DecimalFormat df = new DecimalFormat("0.00");

    private float px(String name) {
        return (C_LEFT + X.getOrDefault(name, 0.0f)) * PAGE_SCALE;
    }

    private float py(String name) {
        return (C_BOTTOM + Y.getOrDefault(name, 0.0f)) * PAGE_SCALE;
    }

    private float sx(float value) {
        return value * PAGE_SCALE;
    }

    private String money(double val) {
        return "Rs. " + df.format(val);
    }

    @Override
    public byte[] generateInvoicePdf(Order order) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document document = new Document(new com.lowagie.text.Rectangle(PAGE_WIDTH, PAGE_HEIGHT), 0, 0, 0, 0);
        try {
            PdfWriter writer = PdfWriter.getInstance(document, out);

            // Load invoice background template image
            Image background = null;
            try (InputStream is = getClass().getResourceAsStream("/invoice_template_bg.png")) {
                if (is != null) {
                    background = Image.getInstance(is.readAllBytes());
                }
            } catch (Exception ignored) {}

            if (background == null) {
                try {
                    java.io.File file = new java.io.File("backend/assets/invoice_template_bg.png");
                    if (file.exists()) {
                        background = Image.getInstance(file.getAbsolutePath());
                    }
                } catch (Exception ignored) {}
            }

            if (background != null) {
                writer.setPageEvent(new BackgroundEvent(background));
            }

            document.open();

            // Set up Fonts
            BaseFont fontRegular = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.WINANSI, BaseFont.NOT_EMBEDDED);
            BaseFont fontBold = BaseFont.createFont(BaseFont.HELVETICA_BOLD, BaseFont.WINANSI, BaseFont.NOT_EMBEDDED);

            PdfContentByte cb = writer.getDirectContent();

            // Render Header Text
            java.awt.Color whiteColor = java.awt.Color.WHITE;
            java.awt.Color darkColor = java.awt.Color.BLACK;
            java.awt.Color greenColor = new java.awt.Color(46, 204, 113);
            java.awt.Color mutedColor = new java.awt.Color(63, 65, 85);

            drawText(cb, fontRegular, px("x2"), py("y2"), "ORIGINAL FOR RECIPIENT", FS.get("fs0"), mutedColor, "left");
            drawText(cb, fontRegular, px("x3"), py("y3"), COMPANY_PHONE, FS.get("fs1"), whiteColor, "left");
            drawText(cb, fontRegular, px("x3") + sx(205), py("y3"), COMPANY_EMAIL, FS.get("fs1"), whiteColor, "left");
            drawText(cb, fontRegular, px("x4"), py("y4"), COMPANY_ADDRESS_LINES[0], FS.get("fs1"), whiteColor, "left");
            drawText(cb, fontRegular, px("x4"), py("y3"), COMPANY_ADDRESS_LINES[1], FS.get("fs1"), whiteColor, "left");
            drawText(cb, fontRegular, px("x4"), py("y5"), COMPANY_ADDRESS_LINES[2], FS.get("fs1"), whiteColor, "left");
            drawText(cb, fontRegular, px("x5"), py("y6"), COMPANY_NAME, FS.get("fs2"), whiteColor, "left");
            drawText(cb, fontRegular, px("x5"), py("y7"), "GSTIN: " + COMPANY_GSTIN, FS.get("fs3"), whiteColor, "left");
            drawText(cb, fontRegular, px("x5"), py("y8"), "State: " + COMPANY_STATE, FS.get("fs3"), whiteColor, "left");
            drawText(cb, fontBold, px("x6"), py("y9"), "Tax Invoice", FS.get("fs4"), darkColor, "left");

            // Calculate Order Details
            OffsetDateTime dt = order.getCreatedAt() != null ? order.getCreatedAt() : OffsetDateTime.now();
            DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy").withZone(ZoneId.systemDefault());
            String formattedDate = dt.format(dateFormatter);

            // Fetch and parse address parts
            Map<String, Object> addr = order.getShippingAddress() != null ? order.getShippingAddress() : new HashMap<>();
            String customerName = order.getCustomerName();
            if (customerName == null || customerName.trim().isEmpty() || "Guest User".equalsIgnoreCase(customerName)) {
                customerName = String.valueOf(addr.getOrDefault("full_name", addr.getOrDefault("name", "Customer")));
            }
            
            List<String> addressLines = new ArrayList<>();
            addressLines.add(String.valueOf(addr.getOrDefault("address_line1", addr.getOrDefault("street", ""))));
            String cityState = String.valueOf(addr.getOrDefault("city", "")) + " " + String.valueOf(addr.getOrDefault("state", ""));
            addressLines.add(cityState.trim());
            addressLines.add(String.valueOf(addr.getOrDefault("pincode", "")));
            addressLines.add("India");
            addressLines.removeIf(String::isEmpty);

            String phone = String.valueOf(addr.getOrDefault("phone", ""));
            String gstin = String.valueOf(addr.getOrDefault("gstin", addr.getOrDefault("gstin_number", "N/A")));
            String state = String.valueOf(addr.getOrDefault("state", COMPANY_STATE));

            // Draw Billing Info
            drawText(cb, fontBold, px("x7"), py("ya"), "Bill To:", FS.get("fs5"), greenColor, "left");
            drawText(cb, fontBold, px("x7"), py("yb"), customerName, FS.get("fs6"), darkColor, "left");

            String[] yKeys = {"yc", "yd", "ye", "yf", "y10"};
            List<String> wrappedLines = new ArrayList<>();
            for (String line : addressLines) {
                wrappedLines.addAll(wrapText(line, sx(470), fontRegular, FS.get("fs7")));
            }
            for (int i = 0; i < Math.min(yKeys.length, wrappedLines.size()); i++) {
                drawText(cb, fontRegular, px("x7"), py(yKeys[i]), wrappedLines.get(i), FS.get("fs7"), darkColor, "left");
            }

            drawText(cb, fontBold, px("x7"), py("y11"), "Contact No.: " + (phone.isEmpty() ? "N/A" : phone), FS.get("fs7"), darkColor, "left");
            drawText(cb, fontBold, px("x7"), py("y12"), "GSTIN Number: " + gstin, FS.get("fs7"), darkColor, "left");
            drawText(cb, fontBold, px("x7"), py("y13"), "State: " + state, FS.get("fs7"), darkColor, "left");

            String paymentMethod = order.getPaymentMethod() != null ? order.getPaymentMethod().toLowerCase() : "online";
            String txnId = order.getRazorpayPaymentId() != null ? order.getRazorpayPaymentId() : ("cod".equalsIgnoreCase(paymentMethod) ? "N/A (COD)" : "Pending");
            
            // Align all meta values in a single column at a fixed offset (+130) from px("x8")
            float metaValueX = px("x8") + sx(130);
            drawText(cb, fontBold, px("x8"), py("ya"), "Invoice No.:", FS.get("fs7"), darkColor, "left");
            drawText(cb, fontRegular, metaValueX, py("ya"), order.getOrderNumber(), FS.get("fs7"), darkColor, "left");
            drawText(cb, fontBold, px("x8"), py("y14"), "Date:", FS.get("fs7"), darkColor, "left");
            drawText(cb, fontRegular, metaValueX, py("y14"), formattedDate, FS.get("fs7"), darkColor, "left");
            drawText(cb, fontBold, px("x8"), py("y15"), "Place of Supply:", FS.get("fs7"), darkColor, "left");
            drawText(cb, fontRegular, metaValueX, py("y15"), state, FS.get("fs7"), darkColor, "left");

            // Shipping lines on the right
            drawText(cb, fontBold, px("x9"), py("y16"), "Ship To :", FS.get("fs5"), greenColor, "left");
            String shippingText = String.join(", ", addressLines);
            List<String> shipLines = wrapText(shippingText, sx(360), fontRegular, FS.get("fs7"));
            String[] shipYKeys = {"y17", "y18"};
            for (int i = 0; i < Math.min(shipYKeys.length, shipLines.size()); i++) {
                drawText(cb, fontRegular, px("x9"), py(shipYKeys[i]), shipLines.get(i), FS.get("fs7"), darkColor, "left");
            }

            drawText(cb, fontBold, px("x9"), py("y11"), "Transaction ID: " + txnId, FS.get("fs7"), darkColor, "left");

            // Calculate rows for items
            List<Map<String, Object>> itemsList = order.getItems();
            double itemsTaxableTotal = 0.0;
            double itemsGstTotal = 0.0;
            double amountTotal = 0.0;
            int totalQty = 0;

            Map<String, Object> metadata = null;
            if (order.getShippingAddress() != null && order.getShippingAddress().get("shipping_metadata") instanceof Map) {
                metadata = (Map<String, Object>) order.getShippingAddress().get("shipping_metadata");
            }

            List<Map<String, Object>> rows = new ArrayList<>();
            if (itemsList != null) {
                for (Map<String, Object> item : itemsList) {
                    double price = ((Number) item.getOrDefault("price", 0.0)).doubleValue();
                    int qty = ((Number) item.getOrDefault("quantity", 1)).intValue();
                    
                    double itemTotalTaxable = price * qty;
                    double itemCgst = itemTotalTaxable * 0.09;
                    double itemSgst = itemTotalTaxable * 0.09;
                    
                    itemTotalTaxable = Math.round(itemTotalTaxable * 100.0) / 100.0;
                    itemCgst = Math.round(itemCgst * 100.0) / 100.0;
                    itemSgst = Math.round(itemSgst * 100.0) / 100.0;
                    double unitPriceTaxable = price;

                    itemsTaxableTotal += itemTotalTaxable;
                    itemsGstTotal += (itemCgst + itemSgst);
                    amountTotal += (itemTotalTaxable + itemCgst + itemSgst);
                    totalQty += qty;

                    Map<String, Object> row = new HashMap<>();
                    row.put("item", String.valueOf(item.getOrDefault("product_name", "Product")));
                    row.put("description", item.get("selectedSize") != null ? String.valueOf(item.get("selectedSize")) : "");
                    row.put("hsn", "76071991");
                    row.put("qty", qty);
                    row.put("unit", "Rol");
                    row.put("price", unitPriceTaxable);
                    row.put("gst", itemCgst + itemSgst);
                    row.put("cgst", itemCgst);
                    row.put("sgst", itemSgst);
                    row.put("amount", itemTotalTaxable + itemCgst + itemSgst);
                    rows.add(row);
                }
            }

            // Coupon discounts
            double discount = order.getDiscountAmount() != null ? order.getDiscountAmount().doubleValue() : 0.0;
            if (discount > 0) {
                double discountGst = Math.round(discount * 0.18 * 100.0) / 100.0;
                Map<String, Object> row = new HashMap<>();
                row.put("item", "Coupon Discount");
                row.put("description", order.getCouponCodes() != null ? String.join(", ", order.getCouponCodes()) : "");
                row.put("hsn", "");
                row.put("qty", 1);
                row.put("unit", "Disc");
                row.put("price", -discount);
                row.put("gst", -discountGst);
                row.put("amount", -(discount + discountGst));
                rows.add(row);
                amountTotal -= (discount + discountGst);
            }

            // Shipping & COD charges calculations
            double grandTotal = order.getTotalAmount().doubleValue();
            double shippingCharge = 0.0;
            double codCharge = 0.0;

            if (metadata != null) {
                shippingCharge = metadata.get("shipping_cost") != null ? Double.parseDouble(String.valueOf(metadata.get("shipping_cost"))) : 0.0;
                codCharge = metadata.get("cod_charge") != null ? Double.parseDouble(String.valueOf(metadata.get("cod_charge"))) : 0.0;
            } else {
                double remaining = grandTotal - (itemsTaxableTotal + itemsGstTotal - discount);
                remaining = Math.round(remaining * 100.0) / 100.0;
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
            }

            if (shippingCharge > 0) {
                Map<String, Object> row = new HashMap<>();
                row.put("item", "Shipping Charges");
                row.put("description", "");
                row.put("hsn", "996812");
                row.put("qty", 1);
                row.put("unit", "Svc");
                row.put("price", shippingCharge);
                row.put("gst", 0.0);
                row.put("amount", shippingCharge);
                rows.add(row);
                amountTotal += shippingCharge;
            }
            if (codCharge > 0) {
                Map<String, Object> row = new HashMap<>();
                row.put("item", "COD Charges");
                row.put("description", "");
                row.put("hsn", "999799");
                row.put("qty", 1);
                row.put("unit", "Svc");
                row.put("price", codCharge);
                row.put("gst", 0.0);
                row.put("amount", codCharge);
                rows.add(row);
                amountTotal += codCharge;
            }

            double taxableTotal = Math.max(0.0, itemsTaxableTotal - discount);
            double gstTotal = itemsGstTotal - (discount > 0 ? Math.round(discount * 0.18 * 100.0) / 100.0 : 0.0);

            // Draw Table Headers
            drawText(cb, fontBold, px("x7"), py("y19"), "#", FS.get("fs7") * 0.92f, whiteColor, "left");
            drawText(cb, fontBold, px("xb"), py("y19"), "Item name", FS.get("fs7") * 0.92f, whiteColor, "left");
            drawText(cb, fontBold, px("xd"), py("y19"), "HSN", FS.get("fs7") * 0.92f, whiteColor, "left");
            drawText(cb, fontBold, sx(388), py("y19"), "Quantity", FS.get("fs7") * 0.92f, whiteColor, "left");
            drawText(cb, fontBold, sx(474), py("y19"), "Unit", FS.get("fs7") * 0.92f, whiteColor, "left");
            drawText(cb, fontBold, sx(568), py("y19"), "Price/ Unit", FS.get("fs7") * 0.92f, whiteColor, "left");
            drawText(cb, fontBold, sx(692), py("y19"), "GST", FS.get("fs7") * 0.92f, whiteColor, "left");
            drawText(cb, fontBold, RIGHT_COLUMN_X - sx(45), py("y19"), "Amount", FS.get("fs7") * 0.92f, whiteColor, "left");

            // Draw Table items
            String[] rowKeys = {"y1a", "y1d", "y1e", "y1f", "y20"};
            for (int i = 0; i < Math.min(rowKeys.length, rows.size()); i++) {
                Map<String, Object> r = rows.get(i);
                float base_y = py(rowKeys[i]);
                float name_y = base_y + sx(6.8f);
                float desc_y = base_y - sx(5.5f);

                drawText(cb, fontRegular, px("xa"), base_y, String.valueOf(i + 1), FS.get("fs7"), darkColor, "center");
                drawText(cb, fontBold, px("xb"), name_y, String.valueOf(r.get("item")), FS.get("fs7") * 0.95f, darkColor, "left");
                
                String desc = String.valueOf(r.get("description"));
                if (!desc.isEmpty()) {
                    drawText(cb, fontRegular, px("xc"), desc_y, "(" + desc + ")", FS.get("fs8"), darkColor, "left");
                }
                
                drawText(cb, fontRegular, px("xd"), base_y, String.valueOf(r.get("hsn")), FS.get("fs7"), darkColor, "center");
                drawText(cb, fontRegular, sx(460), base_y, String.valueOf(r.get("qty")), FS.get("fs7"), darkColor, "right");
                drawText(cb, fontRegular, sx(490), base_y, String.valueOf(r.get("unit")), FS.get("fs7"), darkColor, "center");
                drawText(cb, fontRegular, sx(633), base_y, money(((Number) r.get("price")).doubleValue()), FS.get("fs7"), darkColor, "right");

                double itemCgst = r.get("cgst") != null ? ((Number) r.get("cgst")).doubleValue() : 0.0;
                double itemSgst = r.get("sgst") != null ? ((Number) r.get("sgst")).doubleValue() : 0.0;
                if (itemCgst > 0.0 || itemSgst > 0.0) {
                    drawText(cb, fontRegular, sx(748), base_y, money(itemCgst + itemSgst), FS.get("fs7"), darkColor, "right");
                } else {
                    drawText(cb, fontRegular, sx(748), base_y, money(0), FS.get("fs7"), darkColor, "right");
                }
                drawText(cb, fontRegular, RIGHT_COLUMN_X, base_y, money(((Number) r.get("amount")).doubleValue()), FS.get("fs7"), darkColor, "right");
            }

            // Draw Table Totals
            drawText(cb, fontBold, px("xb"), py("y21"), "Total", FS.get("fs7"), whiteColor, "left");
            drawText(cb, fontBold, sx(460), py("y21"), String.valueOf(totalQty), FS.get("fs7"), whiteColor, "right");
            drawText(cb, fontBold, sx(748), py("y21"), money(gstTotal), FS.get("fs7"), whiteColor, "right");
            drawText(cb, fontBold, RIGHT_COLUMN_X, py("y21"), money(grandTotal), FS.get("fs7"), whiteColor, "right");

            // Draw Bank Details
            drawText(cb, fontBold, px("x7"), py("y22"), "Pay To:", FS.get("fs5"), greenColor, "left");
            drawText(cb, fontRegular, px("x7"), py("y23"), "Bank Name : " + BANK_NAME, FS.get("fs7"), darkColor, "left");
            drawText(cb, fontRegular, px("x7"), py("y24"), "Bank Account No. : " + BANK_ACCOUNT_NO, FS.get("fs7"), darkColor, "left");
            drawText(cb, fontRegular, px("x7"), py("y25"), "Bank IFSC code : " + BANK_IFSC, FS.get("fs7"), darkColor, "left");
            drawText(cb, fontRegular, px("x7"), py("y26"), "Account holder's name : " + BANK_ACCOUNT_HOLDER, FS.get("fs7"), darkColor, "left");

            // Invoice Amount in Words
            drawText(cb, fontBold, px("x7"), py("y27"), "Invoice Amount In Words", FS.get("fs5"), greenColor, "left");
            drawText(cb, fontRegular, px("x7"), py("y28"), numberToWords(grandTotal), FS.get("fs7"), darkColor, "left");

            // Terms & Conditions
            drawText(cb, fontBold, px("x7"), py("y29"), "Terms And Conditions", FS.get("fs5"), greenColor, "left");
            String[] terms = {
                "1, All sales subject to GST Tax and or any Govt. Taxes as applicable under Govt. Rules.",
                "2) Payment to be made in cash failing which interest @ 24% will be charged if the delivery of the",
                "goods is not taken within three days thereof the sellers reserve the right either to cancel the whole",
                "of contract or any portion thereof or resale the goods at buyer's risk without notification to the",
                "buyer to this effect. Delivery of the goods will be deemed to have been taken by the buyer's if any",
                "COPY of the hawala is marked delivered. Delivery should be taken either from the seller's shop or",
                "godown or wherever the goods are available at seller's option",
                "3) Seller will not accept any responsibility or admit any claim for shortage and / or damage after the",
                "goods have left their premises or in transit when despatched under R/R, L/R, B/L or Air Parcel",
                "4) The documents for goods despatched under RR must be retired within 7 days of presentation by",
                "the Bank failing which interest at the rate of 24% will be charged",
                "5) It is understood between the buyers and sellers that price mentioned herein is based on the",
                "prevailing rates of custom duty B.PT. Charges, Town Duty Freight Insurance and or any other",
                "charges. Any variation to such rate will be on account of the buyers",
                "6) Buyer has to accept the goods as and when cleared from Docks / Customs / Railway etc.",
                "7 Any dispute arising out of the transaction will be subject to Hyderabad Court Jurisdiction only.",
                "8) No claim will be entertained unless supported by certificate from Transport / Railway Authorities"
            };
            String[] termKeys = {
                "y2a", "y2b", "y2c", "y2d", "y2e", "y2f", "y30", "y31", "y32",
                "y33", "y34", "y35", "y36", "y37", "y38", "y39", "y3a"
            };
            for (int i = 0; i < Math.min(termKeys.length, terms.length); i++) {
                drawText(cb, fontRegular, px("x7"), py(termKeys[i]), terms[i], FS.get("fs7"), darkColor, "left");
            }

            // Signatory Bottom Section
            drawText(cb, fontRegular, px("xa"), py("y3b"), "For : " + COMPANY_NAME, FS.get("fs7"), darkColor, "left");
            drawText(cb, fontBold, px("xe"), py("y3c"), "Authorized Signatory", FS.get("fs9"), darkColor, "left");

            // Draw Right Summary Metrics Block
            String pStatus = order.getPaymentStatus() != null ? order.getPaymentStatus().toLowerCase() : "";
            String oStatus = order.getOrderStatus() != null ? order.getOrderStatus().toLowerCase() : "";
            boolean isReceived = "paid".equals(pStatus) || "completed".equals(pStatus) || "delivered".equals(oStatus);
            double received = isReceived ? grandTotal : 0.0;
            double balance = isReceived ? 0.0 : grandTotal;

            List<SummaryRow> summaryList = new ArrayList<>();
            summaryList.add(new SummaryRow("Sub Total", taxableTotal));
            if (discount > 0) {
                summaryList.add(new SummaryRow("Coupon Discount", -discount));
            }
            if (shippingCharge > 0) {
                summaryList.add(new SummaryRow("Shipping Charges", shippingCharge));
            }
            if (codCharge > 0) {
                summaryList.add(new SummaryRow("COD Charges", codCharge));
            }
            
            double sgst = Math.round(taxableTotal * 0.09 * 100.0) / 100.0;
            double cgst = Math.round(taxableTotal * 0.09 * 100.0) / 100.0;
            summaryList.add(new SummaryRow("SGST@9%", sgst));
            summaryList.add(new SummaryRow("CGST@9%", cgst));
            summaryList.add(new SummaryRow("Total", grandTotal));
            summaryList.add(new SummaryRow("Received", received));
            summaryList.add(new SummaryRow("Balance", balance));

            String[] ySummaryKeys = {"y3d", "y3e", "y3f", "y40", "y41", "y42", "y27", "y28", "y29"};
            int visibleIdx = 0;
            for (SummaryRow row : summaryList) {
                if (visibleIdx >= ySummaryKeys.length) break;
                boolean isTotal = "Total".equalsIgnoreCase(row.label);
                java.awt.Color rowColor = isTotal ? whiteColor : darkColor;
                BaseFont rowFont = isTotal ? fontBold : fontRegular;

                drawText(cb, rowFont, px("xf"), py(ySummaryKeys[visibleIdx]), row.label, FS.get("fs7"), rowColor, "left");
                drawText(cb, rowFont, RIGHT_COLUMN_X, py(ySummaryKeys[visibleIdx]), money(row.value), FS.get("fs7"), rowColor, "right");
                visibleIdx++;
            }

            drawText(cb, fontRegular, px("xf"), py("y2a"), "Payment Mode", FS.get("fs7"), darkColor, "left");
            drawText(cb, fontRegular, RIGHT_COLUMN_X, py("y2a"), paymentMethod.toUpperCase(), FS.get("fs7"), darkColor, "right");

            document.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return out.toByteArray();
    }

    private void drawText(PdfContentByte cb, BaseFont bf, float x, float y, String text, float size, java.awt.Color color, String align) {
        cb.beginText();
        cb.setFontAndSize(bf, size);
        cb.setColorFill(color);
        if ("right".equalsIgnoreCase(align)) {
            cb.showTextAligned(Element.ALIGN_RIGHT, text, x, y, 0);
        } else if ("center".equalsIgnoreCase(align)) {
            cb.showTextAligned(Element.ALIGN_CENTER, text, x, y, 0);
        } else {
            cb.showTextAligned(Element.ALIGN_LEFT, text, x, y, 0);
        }
        cb.endText();
    }

    private List<String> wrapText(String text, float width, BaseFont font, float size) {
        List<String> lines = new ArrayList<>();
        if (text == null || text.trim().isEmpty()) {
            lines.add("");
            return lines;
        }
        String[] words = text.replace("\n", " ").split("\\s+");
        StringBuilder current = new StringBuilder();
        for (String word : words) {
            String trial = current.length() == 0 ? word : current + " " + word;
            float w = font.getWidthPoint(trial, size);
            if (w <= width) {
                current.append(current.length() == 0 ? "" : " ").append(word);
            } else {
                if (current.length() > 0) {
                    lines.add(current.toString());
                }
                current = new StringBuilder(word);
            }
        }
        if (current.length() > 0) {
            lines.add(current.toString());
        }
        return lines;
    }

    private String numberToWords(double amount) {
        long rupees = Math.round(amount);
        if (rupees == 0) {
            return "Zero Rupees only";
        }
        List<String> parts = new ArrayList<>();
        long crore = rupees / 10000000;
        rupees %= 10000000;
        long lakh = rupees / 100000;
        rupees %= 100000;
        long thousand = rupees / 1000;
        rupees %= 1000;
        long hundred = rupees / 100;
        rupees %= 100;

        if (crore > 0) {
            parts.addAll(twoDigitGroups((int) crore));
            parts.add("Crore");
        }
        if (lakh > 0) {
            parts.addAll(twoDigitGroups((int) lakh));
            parts.add("Lakh");
        }
        if (thousand > 0) {
            parts.addAll(twoDigitGroups((int) thousand));
            parts.add("Thousand");
        }
        if (hundred > 0) {
            parts.addAll(twoDigitGroups((int) hundred));
            parts.add("Hundred");
        }
        if (rupees > 0) {
            if (!parts.isEmpty()) {
                parts.add("and");
            }
            parts.addAll(twoDigitGroups((int) rupees));
        }
        return String.join(" ", parts) + " Rupees only";
    }

    private List<String> twoDigitGroups(int n) {
        String[] ones = {
            "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
            "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
            "Seventeen", "Eighteen", "Nineteen"
        };
        String[] tens = {"", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"};
        List<String> list = new ArrayList<>();
        if (n == 0) return list;
        if (n < 20) {
            list.add(ones[n]);
            return list;
        }
        list.add(tens[n / 10]);
        if (n % 10 > 0) {
            list.add(ones[n % 10]);
        }
        return list;
    }

    private static class SummaryRow {
        String label;
        double value;
        SummaryRow(String label, double value) {
            this.label = label;
            this.value = value;
        }
    }

    private static class BackgroundEvent extends PdfPageEventHelper {
        private final Image background;

        BackgroundEvent(Image background) {
            this.background = background;
        }

        @Override
        public void onStartPage(PdfWriter writer, Document document) {
            try {
                background.setAbsolutePosition(0, 0);
                background.scaleAbsolute(document.getPageSize().getWidth(), document.getPageSize().getHeight());
                writer.getDirectContentUnder().addImage(background);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }
}
