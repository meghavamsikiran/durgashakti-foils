"""Transactional email templates for DurgaShakti Foils."""
from datetime import datetime, timezone, timedelta

LOGO_URL = "https://durgashakti-foils.vercel.app/logo-orange.png"
BRAND_COLOR = "#ea580c" # Match logo orange/red
BRAND_DARK = "#9a3412"
SITE_URL = "https://durgashakti-foils.vercel.app"

def _base(content: str, title: str) -> str:
    return f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:30px 0;">
<tr><td align="center">
<table width="620" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <!-- Header -->
  <tr><td style="background:#ffffff;padding:32px 40px;text-align:center;border-bottom:1px solid #f3f4f6;">
    <img src="{LOGO_URL}" width="280" style="margin:0 auto;object-fit:contain;display:block;" alt="DurgaShakti Foils Logo">
  </td></tr>
  <!-- Body -->
  <tr><td style="padding:36px 40px;">{content}</td></tr>
  <!-- Footer -->
  <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center;">
    <p style="margin:0;color:#6b7280;font-size:12px;">© 2025 DurgaShakti Foils. All rights reserved.</p>
    <p style="margin:6px 0 0;color:#6b7280;font-size:12px;">
      <a href="{SITE_URL}" style="color:{BRAND_COLOR};text-decoration:none;">Visit our website</a> &nbsp;|&nbsp;
      <a href="{SITE_URL}/contact" style="color:{BRAND_COLOR};text-decoration:none;">Contact Support</a>
    </p>
    <p style="margin:6px 0 0;color:#9ca3af;font-size:11px;">This is an automated email. Please do not reply directly.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>"""


def _badge(text: str, color: str = "#10b981") -> str:
    return f'<span style="display:inline-block;background:{color};color:#fff;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:600;letter-spacing:0.5px;">{text}</span>'


def _section_title(text: str) -> str:
    return f'<h2 style="margin:0 0 20px;color:{BRAND_DARK};font-size:18px;font-weight:700;border-left:4px solid {BRAND_COLOR};padding-left:12px;">{text}</h2>'


def _order_items_table(items: list) -> str:
    rows = ""
    for item in items:
        name = item.get("product_name", "Product")
        qty = item.get("quantity", 1)
        price = float(item.get("price", 0))
        rows += f"""<tr>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;color:#374151;font-size:14px;">{name}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:center;color:#6b7280;font-size:14px;">{qty}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:right;color:#374151;font-size:14px;font-weight:600;">₹{price:.2f}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:right;color:{BRAND_COLOR};font-size:14px;font-weight:700;">₹{price*qty:.2f}</td>
        </tr>"""
    return f"""<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin:16px 0;">
      <thead><tr style="background:#f9fafb;">
        <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Product</th>
        <th style="padding:10px 12px;text-align:center;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Qty</th>
        <th style="padding:10px 12px;text-align:right;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Unit Price</th>
        <th style="padding:10px 12px;text-align:right;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Total</th>
      </tr></thead>
      <tbody>{rows}</tbody>
    </table>"""


def _info_row(label: str, value: str) -> str:
    return f"""<tr>
      <td style="padding:8px 0;color:#6b7280;font-size:13px;width:40%;">{label}</td>
      <td style="padding:8px 0;color:#111827;font-size:13px;font-weight:600;">{value}</td>
    </tr>"""


def _cta_button(text: str, url: str) -> str:
    return f"""<div style="text-align:center;margin:28px 0;">
      <a href="{url}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:linear-gradient(135deg,{BRAND_DARK},{BRAND_COLOR});color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:700;letter-spacing:0.3px;">{text}</a>
    </div>"""


# ─────────────────────────────────────────────────────────────────────────────
# 1. WELCOME EMAIL
# ─────────────────────────────────────────────────────────────────────────────
def welcome_email(name: str) -> tuple[str, str]:
    first = name.split()[0] if name else "Valued Customer"
    content = f"""
    <p style="font-size:24px;font-weight:800;color:{BRAND_DARK};margin:0 0 8px;">Welcome to DurgaShakti Foils! 🎉</p>
    <p style="color:#6b7280;font-size:15px;margin:0 0 28px;">Hello <strong>{first}</strong>, we're thrilled to have you on board.</p>
    <div style="background:linear-gradient(135deg,#fef3c7,#fff7ed);border:1px solid #fcd34d;border-radius:12px;padding:24px;margin-bottom:28px;">
      <p style="margin:0 0 12px;color:{BRAND_DARK};font-weight:700;font-size:16px;">Why shop with us?</p>
      <ul style="margin:0;padding-left:20px;color:#374151;font-size:14px;line-height:2;">
        <li>✨ Premium quality aluminium foils & packaging</li>
        <li>🚚 Fast, reliable delivery across India</li>
        <li>💰 Competitive wholesale & retail pricing</li>
        <li>🔒 Secure payments via Razorpay &amp; COD</li>
        <li>📦 Easy returns within 4 days of delivery</li>
      </ul>
    </div>
    {_cta_button("Start Shopping Now", SITE_URL + "/shop")}
    <p style="color:#9ca3af;font-size:13px;text-align:center;">Need help? Reply to this email or visit our <a href="{SITE_URL}/contact" style="color:{BRAND_COLOR};">contact page</a>.</p>"""
    return "Welcome to DurgaShakti Foils! 🎉", _base(content, "Welcome")


# ─────────────────────────────────────────────────────────────────────────────
# 2. ORDER PLACED / CONFIRMATION
# ─────────────────────────────────────────────────────────────────────────────
def order_confirmation_email(name: str, order: dict) -> tuple[str, str]:
    first = name.split()[0] if name else "Customer"
    order_num = order.get("order_number", "N/A")
    items = order.get("items", [])
    total = float(order.get("total_amount", 0))
    payment = order.get("payment_method", "online").upper()
    addr = order.get("shipping_address", {})
    addr_str = f"{addr.get('address_line1','')}, {addr.get('city','')}, {addr.get('state','')}, {addr.get('pincode','')}"
    expected = (datetime.now(timezone.utc) + timedelta(days=5)).strftime("%d %B %Y")
    content = f"""
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:48px;margin-bottom:8px;">📦</div>
      {_badge("Order Confirmed", "#10b981")}
      <p style="font-size:22px;font-weight:800;color:{BRAND_DARK};margin:12px 0 4px;">Thank you, {first}!</p>
      <p style="color:#6b7280;font-size:14px;">Your order has been placed successfully.</p>
    </div>
    {_section_title("Order Summary")}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      {_info_row("Order Number", order_num)}
      {_info_row("Order Date", datetime.now(timezone.utc).strftime("%d %B %Y, %I:%M %p UTC"))}
      {_info_row("Payment Method", payment)}
      {_info_row("Expected Delivery", expected)}
    </table>
    {_order_items_table(items)}
    <div style="background:#f9fafb;border-radius:8px;padding:16px;text-align:right;margin-bottom:24px;">
      <p style="margin:0;font-size:18px;color:{BRAND_DARK};font-weight:800;">Total: ₹{total:.2f}</p>
    </div>
    {_section_title("Delivery Address")}
    <p style="color:#374151;font-size:14px;background:#f9fafb;padding:14px;border-radius:8px;">{addr_str}</p>
    {_cta_button("Track Your Order", f"{SITE_URL}/order/{order_num}")}"""
    return f"Order Confirmed - {order_num} | DurgaShakti Foils", _base(content, f"Order {order_num}")


# ─────────────────────────────────────────────────────────────────────────────
# 3. PAYMENT SUCCESS
# ─────────────────────────────────────────────────────────────────────────────
def payment_success_email(name: str, order: dict) -> tuple[str, str]:
    first = name.split()[0] if name else "Customer"
    order_num = order.get("order_number", "N/A")
    total = float(order.get("total_amount", 0))
    payment_id = order.get("razorpay_payment_id", "N/A")
    content = f"""
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:48px;margin-bottom:8px;">✅</div>
      {_badge("Payment Successful", "#10b981")}
      <p style="font-size:22px;font-weight:800;color:{BRAND_DARK};margin:12px 0 4px;">Payment Received, {first}!</p>
      <p style="color:#6b7280;font-size:14px;">Your payment has been processed and your order is confirmed.</p>
    </div>
    <div style="background:#ecfdf5;border:1px solid #6ee7b7;border-radius:12px;padding:24px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        {_info_row("Order Number", order_num)}
        {_info_row("Amount Paid", f"₹{total:.2f}")}
        {_info_row("Payment ID", payment_id)}
        {_info_row("Date & Time", datetime.now(timezone.utc).strftime("%d %B %Y, %I:%M %p UTC"))}
      </table>
    </div>
    {_cta_button("View Order", f"{SITE_URL}/order/{order_num}")}"""
    return f"Payment Successful - ₹{total:.2f} | {order_num}", _base(content, "Payment Success")


# ─────────────────────────────────────────────────────────────────────────────
# 4. PAYMENT FAILED
# ─────────────────────────────────────────────────────────────────────────────
def payment_failed_email(name: str, order_num: str, reason: str = "") -> tuple[str, str]:
    first = name.split()[0] if name else "Customer"
    content = f"""
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:48px;margin-bottom:8px;">❌</div>
      {_badge("Payment Failed", "#ef4444")}
      <p style="font-size:22px;font-weight:800;color:{BRAND_DARK};margin:12px 0 4px;">Payment Unsuccessful</p>
      <p style="color:#6b7280;font-size:14px;">Hi {first}, your payment could not be processed.</p>
    </div>
    <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-weight:700;color:#991b1b;">Order: {order_num}</p>
      {f'<p style="margin:0;color:#7f1d1d;font-size:13px;">Reason: {reason}</p>' if reason else ''}
    </div>
    <p style="color:#374151;font-size:14px;">Please try again using a different payment method or contact your bank.</p>
    {_cta_button("Retry Payment", f"{SITE_URL}/order/{order_num}")}"""
    return f"Payment Failed - {order_num} | DurgaShakti Foils", _base(content, "Payment Failed")


# ─────────────────────────────────────────────────────────────────────────────
# 5. ORDER SHIPPED
# ─────────────────────────────────────────────────────────────────────────────
def order_shipped_email(name: str, order: dict) -> tuple[str, str]:
    first = name.split()[0] if name else "Customer"
    order_num = order.get("order_number", "N/A")
    carrier = order.get("carrier", "Our Logistics Partner")
    tracking_id = order.get("tracking_id", "N/A")
    tracking_url = order.get("tracking_url", "")
    content = f"""
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:48px;margin-bottom:8px;">🚚</div>
      {_badge("Order Shipped!", "#3b82f6")}
      <p style="font-size:22px;font-weight:800;color:{BRAND_DARK};margin:12px 0 4px;">Your order is on its way, {first}!</p>
      <p style="color:#6b7280;font-size:14px;">Your package has been handed over to the courier.</p>
    </div>
    <div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:12px;padding:24px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        {_info_row("Order Number", order_num)}
        {_info_row("Courier Partner", carrier)}
        {_info_row("Tracking ID", tracking_id)}
      </table>
    </div>
    {_cta_button("Track Shipment", tracking_url if tracking_url else f"{SITE_URL}/order/{order_num}")}
    <p style="color:#9ca3af;font-size:12px;text-align:center;">Expected delivery within 3-5 business days.</p>"""
    return f"Your Order {order_num} is Shipped! 🚚", _base(content, "Order Shipped")


# ─────────────────────────────────────────────────────────────────────────────
# 6. ORDER DELIVERED + RECEIPT
# ─────────────────────────────────────────────────────────────────────────────
def generate_invoice_html(order: dict) -> str:
    order_num = order.get("order_number", "")
    items_html = ""
    for item in order.get("items", []):
        items_html += f"<tr><td>{item.get('product_name')}</td><td>{item.get('quantity')}</td><td>{float(item.get('price', 0)):.2f}</td><td>{float(item.get('price', 0))*int(item.get('quantity', 0)):.2f}</td></tr>"
    return f"""
    <html>
    <head><style>
    body {{ font-family: Arial, sans-serif; }}
    table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
    th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
    th {{ background-color: #f3f4f6; }}
    </style></head>
    <body>
    <h2>Invoice - {order_num}</h2>
    <p>Thank you for shopping with DurgaShakti Foils Pvt Ltd.</p>
    <table>
    <tr><th>Product</th><th>Qty</th><th>Unit Price (INR)</th><th>Total (INR)</th></tr>
    {items_html}
    </table>
    <h3 style="text-align:right;">Grand Total: INR {float(order.get('total_amount', 0)):.2f}</h3>
    </body></html>
    """

def order_delivered_email(name: str, order: dict) -> tuple[str, str, list]:
    first = name.split()[0] if name else "Customer"
    order_num = order.get("order_number", "N/A")
    items = order.get("items", [])
    total = float(order.get("total_amount", 0))
    payment_method = order.get("payment_method", "online").upper()
    delivered_date = datetime.now(timezone.utc).strftime("%d %B %Y")
    content = f"""
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:48px;margin-bottom:8px;">🎉</div>
      {_badge("Delivered!", "#10b981")}
      <p style="font-size:22px;font-weight:800;color:{BRAND_DARK};margin:12px 0 4px;">Order Delivered, {first}!</p>
      <p style="color:#6b7280;font-size:14px;">Your order has been successfully delivered. Enjoy your purchase!</p>
    </div>
    <!-- Receipt -->
    <div style="border:2px dashed #e5e7eb;border-radius:12px;padding:24px;margin-bottom:24px;">
      <h3 style="margin:0 0 16px;color:{BRAND_DARK};font-size:16px;text-align:center;">🧾 ORDER RECEIPT</h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
        {_info_row("Order Number", order_num)}
        {_info_row("Delivered On", delivered_date)}
        {_info_row("Payment Method", payment_method)}
      </table>
      {_order_items_table(items)}
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:8px 0;border-top:2px solid #e5e7eb;"></td><td></td></tr>
        {_info_row("Grand Total", f"₹{total:.2f}")}
      </table>
    </div>
    <div style="background:#fef3c7;border-radius:8px;padding:16px;margin-bottom:24px;text-align:center;">
      <p style="margin:0;color:#92400e;font-size:13px;">🔄 Return window: <strong>4 days</strong> from delivery date. Visit your dashboard to initiate a return.</p>
    </div>
    {_cta_button("View Order / Return", f"{SITE_URL}/order/{order_num}")}
    <p style="color:#9ca3af;font-size:12px;text-align:center;">Thank you for shopping with DurgaShakti Foils! 💛</p>"""
    
    attachments = []
    try:
        from xhtml2pdf import pisa
        import io, base64
        pdf_file = io.BytesIO()
        invoice_html = generate_invoice_html(order)
        pisa_status = pisa.CreatePDF(io.StringIO(invoice_html), dest=pdf_file)
        if not pisa_status.err:
            pdf_bytes = pdf_file.getvalue()
            b64_pdf = base64.b64encode(pdf_bytes).decode('utf-8')
            attachments.append({
                "filename": f"Invoice_{order_num}.pdf",
                "content": f"data:application/pdf;base64,{b64_pdf}"
            })
    except Exception as e:
        print("Failed to generate PDF:", e)
        pass

    return f"Delivered! Order {order_num} Receipt | DurgaShakti Foils", _base(content, "Order Delivered"), attachments


# ─────────────────────────────────────────────────────────────────────────────
# 7. ORDER CANCELLED
# ─────────────────────────────────────────────────────────────────────────────
def order_cancelled_email(name: str, order_num: str, total: float, reason: str = "") -> tuple[str, str]:
    first = name.split()[0] if name else "Customer"
    content = f"""
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:48px;margin-bottom:8px;">🚫</div>
      {_badge("Order Cancelled", "#ef4444")}
      <p style="font-size:22px;font-weight:800;color:{BRAND_DARK};margin:12px 0 4px;">Order Cancelled</p>
      <p style="color:#6b7280;font-size:14px;">Hi {first}, your order has been cancelled.</p>
    </div>
    <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:12px;padding:20px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        {_info_row("Order Number", order_num)}
        {_info_row("Order Total", f"₹{total:.2f}")}
        {_info_row("Cancelled On", datetime.now(timezone.utc).strftime("%d %B %Y"))}
        {f'{_info_row("Reason", reason)}' if reason else ''}
      </table>
    </div>
    <p style="color:#374151;font-size:14px;text-align:center;">If you paid online, a refund will be processed within 5-7 business days.</p>
    {_cta_button("Shop Again", SITE_URL + "/shop")}"""
    return f"Order {order_num} Cancelled | DurgaShakti Foils", _base(content, "Order Cancelled")


# ─────────────────────────────────────────────────────────────────────────────
# 8. RETURN REQUESTED
# ─────────────────────────────────────────────────────────────────────────────
def return_requested_email(name: str, order_num: str, reason: str) -> tuple[str, str]:
    first = name.split()[0] if name else "Customer"
    content = f"""
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:48px;margin-bottom:8px;">🔄</div>
      {_badge("Return Requested", "#f59e0b")}
      <p style="font-size:22px;font-weight:800;color:{BRAND_DARK};margin:12px 0 4px;">Return Request Received</p>
      <p style="color:#6b7280;font-size:14px;">Hi {first}, we've received your return request.</p>
    </div>
    <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:12px;padding:20px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        {_info_row("Order Number", order_num)}
        {_info_row("Return Reason", reason)}
        {_info_row("Request Date", datetime.now(timezone.utc).strftime("%d %B %Y"))}
        {_info_row("Status", "Under Review")}
      </table>
    </div>
    <p style="color:#374151;font-size:14px;">Our team will review your return request within 1-2 business days and notify you of the decision.</p>
    {_cta_button("View Request Status", f"{SITE_URL}/order/{order_num}")}"""
    return f"Return Request Submitted - {order_num} | DurgaShakti Foils", _base(content, "Return Requested")


# ─────────────────────────────────────────────────────────────────────────────
# 9. RETURN APPROVED
# ─────────────────────────────────────────────────────────────────────────────
def return_approved_email(name: str, order_num: str, total: float) -> tuple[str, str]:
    first = name.split()[0] if name else "Customer"
    content = f"""
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:48px;margin-bottom:8px;">✅</div>
      {_badge("Return Approved", "#10b981")}
      <p style="font-size:22px;font-weight:800;color:{BRAND_DARK};margin:12px 0 4px;">Return Approved, {first}!</p>
      <p style="color:#6b7280;font-size:14px;">Good news! Your return request has been approved.</p>
    </div>
    <div style="background:#ecfdf5;border:1px solid #6ee7b7;border-radius:12px;padding:20px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        {_info_row("Order Number", order_num)}
        {_info_row("Refund Amount", f"₹{total:.2f}")}
        {_info_row("Approved On", datetime.now(timezone.utc).strftime("%d %B %Y"))}
        {_info_row("Refund Timeline", "5-7 business days")}
      </table>
    </div>
    <p style="color:#374151;font-size:14px;text-align:center;">Your refund will be credited to the original payment method within 5-7 business days.</p>
    {_cta_button("View Dashboard", f"{SITE_URL}/dashboard?order={order_num}")}"""
    return f"Return Approved - Refund Initiated | {order_num}", _base(content, "Return Approved")


# ─────────────────────────────────────────────────────────────────────────────
# 10. RETURN REJECTED
# ─────────────────────────────────────────────────────────────────────────────
def return_rejected_email(name: str, order_num: str, admin_message: str = "") -> tuple[str, str]:
    first = name.split()[0] if name else "Customer"
    content = f"""
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:48px;margin-bottom:8px;">❌</div>
      {_badge("Return Rejected", "#ef4444")}
      <p style="font-size:22px;font-weight:800;color:{BRAND_DARK};margin:12px 0 4px;">Return Request Rejected</p>
      <p style="color:#6b7280;font-size:14px;">Hi {first}, unfortunately we could not approve your return request.</p>
    </div>
    <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:12px;padding:20px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        {_info_row("Order Number", order_num)}
        {_info_row("Decision Date", datetime.now(timezone.utc).strftime("%d %B %Y"))}
        {f'{_info_row("Reason", admin_message)}' if admin_message else ''}
      </table>
    </div>
    <p style="color:#374151;font-size:14px;text-align:center;">If you have questions, please <a href="{SITE_URL}/contact" style="color:{BRAND_COLOR};">contact our support team</a>.</p>
    {_cta_button("Contact Support", SITE_URL + "/contact")}"""
    return f"Return Request Update - {order_num} | DurgaShakti Foils", _base(content, "Return Rejected")

# ─────────────────────────────────────────────────────────────────────────────
# 11. ACCOUNT DELETED
# ─────────────────────────────────────────────────────────────────────────────
def account_deleted_email(name: str) -> tuple[str, str]:
    first = name.split()[0] if name else "Customer"
    content = f"""
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:48px;margin-bottom:8px;">👋</div>
      <p style="font-size:22px;font-weight:800;color:{BRAND_DARK};margin:12px 0 4px;">Account Deleted</p>
      <p style="color:#6b7280;font-size:14px;">Hi {first}, your account has been successfully deleted.</p>
    </div>
    <p style="color:#374151;font-size:14px;line-height:1.6;">We're sorry to see you go. Your personal information has been removed from our systems in accordance with our privacy policy.</p>
    <p style="color:#374151;font-size:14px;line-height:1.6;">If you ever decide to return, we'll be here with open arms!</p>
    {_cta_button("Visit Website", SITE_URL)}"""
    return "Account Successfully Deleted | DurgaShakti Foils", _base(content, "Account Deleted")
