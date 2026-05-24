"""Tax invoice PDF generation for DurgaShakti Foils."""
from __future__ import annotations

import base64
import hashlib
import os
from datetime import datetime, timezone
from io import BytesIO
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


COMPANY_NAME = "DURGASHAKTIFOILS PVT.LTD"
COMPANY_GSTIN = "36AALCD9777D1Z5"
COMPANY_STATE = "36-Telangana"
COMPANY_PHONE = "9901452954"
COMPANY_EMAIL = "Durgashaktifoils@gmail.com"
COMPANY_ADDRESS = "Plot no 54, Shop no 1, Maruthi nagar, Mallampet, Hyderabad, Telangana"
BANK_NAME = "HDFC BANK"
BANK_ACCOUNT_NO = "50200115257570"
BANK_IFSC = "HDFC0005472"
BANK_ACCOUNT_HOLDER = "DURGASHAKTI FOILS PRIVATE LIMITED"

PRIMARY = colors.HexColor("#006e1b")
DARK = colors.HexColor("#181c1b")
MUTED = colors.HexColor("#3c4b39")
BORDER = colors.HexColor("#bbcbb5")
SURFACE = colors.HexColor("#f7faf8")
LIGHT_GREEN = colors.HexColor("#eaf7ed")


def _register_font() -> tuple[str, str]:
    candidates = [
        os.path.join(os.environ.get("WINDIR", "C:\\Windows"), "Fonts", "arial.ttf"),
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    bold_candidates = [
        os.path.join(os.environ.get("WINDIR", "C:\\Windows"), "Fonts", "arialbd.ttf"),
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]
    regular = "Helvetica"
    bold = "Helvetica-Bold"
    for path in candidates:
        if os.path.exists(path):
            pdfmetrics.registerFont(TTFont("DSFRegular", path))
            regular = "DSFRegular"
            break
    for path in bold_candidates:
        if os.path.exists(path):
            pdfmetrics.registerFont(TTFont("DSFBold", path))
            bold = "DSFBold"
            break
    return regular, bold


FONT, FONT_BOLD = _register_font()


def _money(value: Any) -> str:
    return f"₹ {float(value or 0):,.2f}"


def _money(value: Any) -> str:
    return f"\u20b9 {float(value or 0):,.2f}"


def _safe_text(value: Any, default: str = "") -> str:
    return str(value if value is not None and value != "" else default)


def _wrap_text(text: str, width: float, font: str, size: float) -> list[str]:
    words = _safe_text(text).replace("\n", " ").split()
    lines: list[str] = []
    current = ""
    for word in words:
        trial = f"{current} {word}".strip()
        if pdfmetrics.stringWidth(trial, font, size) <= width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines or [""]


def _draw_wrapped(c: canvas.Canvas, text: str, x: float, y: float, width: float, size: float = 8, font: str | None = None, leading: float = 3.8 * mm, max_lines: int | None = None) -> float:
    font = font or FONT
    c.setFont(font, size)
    lines = _wrap_text(text, width, font, size)
    if max_lines:
        lines = lines[:max_lines]
    for line in lines:
        c.drawString(x, y, line)
        y -= leading
    return y


def _invoice_number(order: dict) -> str:
    created = _parse_dt(order.get("created_at"))
    date_part = created.strftime("%d%m")
    digest = hashlib.sha1(_safe_text(order.get("id") or order.get("order_number")).encode("utf-8")).hexdigest()
    return f"DSF{date_part}{int(digest[:5], 16) % 10000:04d}"


def _parse_dt(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc) if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str) and value:
        try:
            normalized = value.replace("Z", "+00:00")
            parsed = datetime.fromisoformat(normalized)
            return parsed.astimezone(timezone.utc) if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            pass
    return datetime.now(timezone.utc)


def _two_digit_groups(n: int) -> list[str]:
    ones = [
        "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
        "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
        "Seventeen", "Eighteen", "Nineteen",
    ]
    tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]
    if n == 0:
        return []
    if n < 20:
        return [ones[n]]
    return [tens[n // 10], ones[n % 10]] if n % 10 else [tens[n // 10]]


def _number_to_words(amount: float) -> str:
    rupees = int(round(float(amount or 0)))
    if rupees == 0:
        return "Zero Rupees only"
    parts: list[str] = []
    crore = rupees // 10000000
    rupees %= 10000000
    lakh = rupees // 100000
    rupees %= 100000
    thousand = rupees // 1000
    rupees %= 1000
    hundred = rupees // 100
    rupees %= 100
    if crore:
        parts.extend(_two_digit_groups(crore) + ["Crore"])
    if lakh:
        parts.extend(_two_digit_groups(lakh) + ["Lakh"])
    if thousand:
        parts.extend(_two_digit_groups(thousand) + ["Thousand"])
    if hundred:
        parts.extend(_two_digit_groups(hundred) + ["Hundred"])
    if rupees:
        if parts:
            parts.append("and")
        parts.extend(_two_digit_groups(rupees))
    return " ".join(p for p in parts if p) + " Rupees only"


def _address_lines(addr: dict) -> tuple[str, str, str, str, str]:
    name = _safe_text(addr.get("full_name") or addr.get("name"), "Customer")
    line1 = _safe_text(addr.get("address_line1") or addr.get("address") or addr.get("street"))
    line2 = _safe_text(addr.get("address_line2"))
    city_state_pin = ", ".join(part for part in [
        _safe_text(addr.get("city")),
        _safe_text(addr.get("state")),
        _safe_text(addr.get("pincode")),
    ] if part)
    phone = _safe_text(addr.get("phone"))
    return name, line1, line2, city_state_pin, phone


def _state_code(state: str) -> str:
    normalized = _safe_text(state).lower()
    if "telangana" in normalized:
        return "36-Telangana"
    return _safe_text(state, COMPANY_STATE)


def _draw_box(c: canvas.Canvas, x: float, y: float, w: float, h: float, stroke=BORDER, fill=None, radius: float = 0):
    c.setStrokeColor(stroke)
    c.setLineWidth(0.5)
    if fill:
        c.setFillColor(fill)
    if radius:
        c.roundRect(x, y, w, h, radius, stroke=1, fill=1 if fill else 0)
    else:
        c.rect(x, y, w, h, stroke=1, fill=1 if fill else 0)


def build_tax_invoice_pdf(order: dict, copy_label: str = "ORIGINAL FOR RECIPIENT") -> bytes:
    """Generate a one-page tax invoice PDF matching the uploaded DSF bill format."""
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    margin = 10 * mm
    x0 = margin
    y = height - margin
    usable = width - 2 * margin

    created = _parse_dt(order.get("created_at") or order.get("updated_at"))
    invoice_no = _safe_text(order.get("invoice_number"), _invoice_number(order))
    addr = order.get("shipping_address") or {}
    metadata = addr.get("shipping_metadata") or {}
    items = order.get("items") or []
    customer_name, addr1, addr2, city_state_pin, phone = _address_lines(addr)
    customer_gstin = _safe_text(addr.get("gstin") or addr.get("gstin_number") or addr.get("gst_number"), "N/A")
    customer_state = _state_code(addr.get("state"))
    subtotal = float(metadata.get("subtotal") or sum(float(i.get("price") or 0) * int(i.get("quantity") or 0) for i in items))
    shipping = float(metadata.get("shipping_cost") or 0)
    cod = float(metadata.get("cod_charge") or 0)
    cgst = float(metadata.get("cgst_amount") or round(subtotal * 0.09, 2))
    sgst = float(metadata.get("sgst_amount") or round(subtotal * 0.09, 2))
    grand_total = float(metadata.get("grand_total") or order.get("total_amount") or subtotal + shipping + cod + cgst + sgst)

    # Header
    c.setFillColor(DARK)
    c.setFont(FONT_BOLD, 8)
    c.drawString(x0, y, copy_label)
    c.setFont(FONT, 8)
    c.drawRightString(width - margin, y, COMPANY_PHONE)
    y -= 5 * mm
    c.drawRightString(width - margin, y, COMPANY_EMAIL)

    company_y = y
    c.setFont(FONT_BOLD, 13)
    c.setFillColor(PRIMARY)
    c.drawString(x0, company_y, COMPANY_NAME)
    c.setFont(FONT, 8)
    c.setFillColor(MUTED)
    _draw_wrapped(c, COMPANY_ADDRESS, x0, company_y - 5 * mm, 70 * mm, 8, leading=3.7 * mm, max_lines=3)
    c.setFont(FONT_BOLD, 9)
    c.setFillColor(DARK)
    c.drawString(x0, company_y - 19 * mm, f"GSTIN: {COMPANY_GSTIN}")
    c.setFont(FONT, 8)
    c.drawString(x0, company_y - 24 * mm, f"State: {COMPANY_STATE}")

    c.setFont(FONT_BOLD, 18)
    c.setFillColor(DARK)
    c.drawRightString(width - margin, company_y - 2 * mm, "Tax Invoice")
    c.setStrokeColor(PRIMARY)
    c.setLineWidth(1.2)
    c.line(width - margin - 45 * mm, company_y - 5 * mm, width - margin, company_y - 5 * mm)
    y = company_y - 30 * mm

    # Parties and invoice facts
    left_w = 103 * mm
    right_w = usable - left_w
    box_h = 40 * mm
    _draw_box(c, x0, y - box_h, left_w, box_h, fill=colors.white)
    _draw_box(c, x0 + left_w, y - box_h, right_w, box_h, fill=colors.white)
    c.setFillColor(PRIMARY)
    c.setFont(FONT_BOLD, 9)
    c.drawString(x0 + 3 * mm, y - 6 * mm, "Bill To:")
    c.drawString(x0 + left_w + 3 * mm, y - 6 * mm, "Invoice Details")
    c.setFillColor(DARK)
    c.setFont(FONT_BOLD, 8.5)
    c.drawString(x0 + 3 * mm, y - 12 * mm, customer_name)
    c.setFont(FONT, 7.5)
    line_y = y - 17 * mm
    for value in [addr1, addr2, city_state_pin, "India", f"Contact No.: {phone}" if phone else "", f"GSTIN Number: {customer_gstin}", f"State: {customer_state}"]:
        if value:
            line_y = _draw_wrapped(c, value, x0 + 3 * mm, line_y, left_w - 6 * mm, 7.5, leading=3.4 * mm, max_lines=2)
    details_x = x0 + left_w + 3 * mm
    c.setFont(FONT, 8)
    facts = [
        ("Invoice No.", invoice_no),
        ("Date", created.strftime("%d/%m/%Y")),
        ("Place of Supply", customer_state),
        ("Payment Mode", _safe_text(order.get("payment_method"), "Online").upper()),
        ("Payment ID", _safe_text(order.get("razorpay_payment_id"), "N/A")),
    ]
    fy = y - 13 * mm
    for label, value in facts:
        c.setFillColor(MUTED)
        c.drawString(details_x, fy, f"{label}:")
        c.setFillColor(DARK)
        c.setFont(FONT_BOLD, 8)
        c.drawString(details_x + 28 * mm, fy, value[:34])
        c.setFont(FONT, 8)
        fy -= 6 * mm
    y -= box_h + 4 * mm

    ship_h = 18 * mm
    _draw_box(c, x0, y - ship_h, usable, ship_h, fill=SURFACE)
    c.setFillColor(PRIMARY)
    c.setFont(FONT_BOLD, 9)
    c.drawString(x0 + 3 * mm, y - 6 * mm, "Ship To :")
    c.setFillColor(DARK)
    c.setFont(FONT, 8)
    _draw_wrapped(c, " ".join(filter(None, [addr1, addr2, city_state_pin])), x0 + 22 * mm, y - 6 * mm, usable - 25 * mm, 8, leading=3.5 * mm, max_lines=3)
    y -= ship_h + 4 * mm

    # Items table
    headers = ["#", "Item name", "HSN", "Quantity", "Unit", "Price/ Unit", "GST", "Amount"]
    col_widths = [8, 55, 22, 18, 14, 24, 25, 25]
    scale = usable / sum(col_widths)
    col_widths = [w * scale for w in col_widths]
    header_h = 8 * mm
    row_h = 15 * mm
    table_x = x0
    _draw_box(c, table_x, y - header_h, usable, header_h, fill=LIGHT_GREEN)
    cx = table_x
    c.setFont(FONT_BOLD, 7.2)
    c.setFillColor(DARK)
    for idx, head in enumerate(headers):
        c.drawString(cx + 1.4 * mm, y - 5 * mm, head)
        cx += col_widths[idx]
        if idx < len(headers) - 1:
            c.setStrokeColor(BORDER)
            c.line(cx, y, cx, y - header_h)
    y -= header_h

    total_qty = 0
    taxable_for_rows = 0.0
    gst_for_rows = 0.0
    amount_for_rows = 0.0
    row_defs = []
    for idx, item in enumerate(items, 1):
        qty = int(item.get("quantity") or 0)
        unit_price = float(item.get("price") or 0)
        line_taxable = round(unit_price * qty, 2)
        line_gst = round(line_taxable * 0.18, 2)
        line_total = round(line_taxable + line_gst, 2)
        total_qty += qty
        taxable_for_rows += line_taxable
        gst_for_rows += line_gst
        amount_for_rows += line_total
        row_defs.append((idx, item.get("product_name") or item.get("name") or "Product", item.get("hsn") or "76071991", qty, item.get("unit") or "Rol", unit_price, line_gst, line_total))
    if shipping > 0:
        row_defs.append((len(row_defs) + 1, "Shipping Charges", "996812", 1, "Svc", shipping, 0.0, shipping))
        amount_for_rows += shipping
    if cod > 0:
        row_defs.append((len(row_defs) + 1, "COD Charges", "999799", 1, "Svc", cod, 0.0, cod))
        amount_for_rows += cod

    max_rows = max(1, len(row_defs))
    for row in row_defs[:6]:
        _draw_box(c, table_x, y - row_h, usable, row_h, fill=colors.white)
        cx = table_x
        values = [str(row[0]), row[1], str(row[2]), str(row[3]), str(row[4]), _money(row[5]), f"{_money(row[6])} (18%)" if row[6] else _money(0), _money(row[7])]
        aligns = ["left", "left", "left", "right", "left", "right", "right", "right"]
        c.setFont(FONT, 7.2)
        c.setFillColor(DARK)
        for i, value in enumerate(values):
            w = col_widths[i]
            if i == 1:
                c.setFont(FONT_BOLD, 7.1)
                _draw_wrapped(c, value, cx + 1.4 * mm, y - 4.8 * mm, w - 2.8 * mm, 7.1, FONT_BOLD, leading=3.2 * mm, max_lines=3)
                c.setFont(FONT, 7.2)
            elif aligns[i] == "right":
                c.drawRightString(cx + w - 1.4 * mm, y - 8 * mm, value)
            else:
                c.drawString(cx + 1.4 * mm, y - 8 * mm, value)
            cx += w
            if i < len(values) - 1:
                c.setStrokeColor(BORDER)
                c.line(cx, y, cx, y - row_h)
        y -= row_h

    _draw_box(c, table_x, y - 8 * mm, usable, 8 * mm, fill=LIGHT_GREEN)
    c.setFont(FONT_BOLD, 7.5)
    c.drawString(table_x + 1.4 * mm, y - 5 * mm, "Total")
    c.drawRightString(table_x + sum(col_widths[:4]) - 1.4 * mm, y - 5 * mm, str(total_qty))
    c.drawRightString(table_x + sum(col_widths[:6]) - 1.4 * mm, y - 5 * mm, _money(taxable_for_rows))
    c.drawRightString(table_x + sum(col_widths[:7]) - 1.4 * mm, y - 5 * mm, _money(gst_for_rows))
    c.drawRightString(table_x + usable - 1.4 * mm, y - 5 * mm, _money(amount_for_rows))
    y -= 12 * mm

    # Bottom blocks
    left_block_w = 120 * mm
    right_block_w = usable - left_block_w - 4 * mm
    bank_h = 33 * mm
    _draw_box(c, x0, y - bank_h, left_block_w, bank_h, fill=colors.white)
    c.setFont(FONT_BOLD, 8.5)
    c.setFillColor(PRIMARY)
    c.drawString(x0 + 3 * mm, y - 6 * mm, "Pay To:")
    c.setFont(FONT, 7.5)
    c.setFillColor(DARK)
    bank_y = y - 12 * mm
    for label, value in [
        ("Bank Name", BANK_NAME),
        ("Bank Account No.", BANK_ACCOUNT_NO),
        ("Bank IFSC code", BANK_IFSC),
        ("Account holder's name", BANK_ACCOUNT_HOLDER),
    ]:
        c.drawString(x0 + 3 * mm, bank_y, f"{label} : {value}")
        bank_y -= 4.8 * mm

    total_x = x0 + left_block_w + 4 * mm
    total_h = 45 * mm
    _draw_box(c, total_x, y - total_h, right_block_w, total_h, fill=SURFACE)
    c.setFont(FONT, 8)
    summary = [
        ("Sub Total", subtotal),
        ("Shipping", shipping),
        ("COD Charges", cod),
        ("SGST@9%", sgst),
        ("CGST@9%", cgst),
        ("Total", grand_total),
        ("Received", grand_total if order.get("payment_status") in ("Paid", "completed") else 0),
        ("Balance", 0 if order.get("payment_status") in ("Paid", "completed") else grand_total),
    ]
    sy = y - 6 * mm
    for label, value in summary:
        if value == 0 and label in {"Shipping", "COD Charges"}:
            continue
        c.setFont(FONT_BOLD if label in {"Total", "Received", "Balance"} else FONT, 7.6)
        c.setFillColor(PRIMARY if label == "Total" else DARK)
        c.drawString(total_x + 3 * mm, sy, label)
        c.drawRightString(total_x + right_block_w - 3 * mm, sy, _money(value))
        sy -= 4.8 * mm

    y -= bank_h + 5 * mm
    words_h = 16 * mm
    _draw_box(c, x0, y - words_h, left_block_w, words_h, fill=LIGHT_GREEN)
    c.setFont(FONT_BOLD, 8)
    c.setFillColor(DARK)
    c.drawString(x0 + 3 * mm, y - 5 * mm, "Invoice Amount In Words")
    c.setFont(FONT, 8)
    _draw_wrapped(c, _number_to_words(grand_total), x0 + 3 * mm, y - 10 * mm, left_block_w - 6 * mm, 8, leading=3.5 * mm, max_lines=2)

    sign_x = total_x
    _draw_box(c, sign_x, y - words_h, right_block_w, words_h, fill=colors.white)
    c.setFont(FONT_BOLD, 7.5)
    c.drawCentredString(sign_x + right_block_w / 2, y - 5 * mm, f"For : {COMPANY_NAME}")
    c.setFont(FONT, 7)
    c.drawCentredString(sign_x + right_block_w / 2, y - 13 * mm, "Authorized Signatory")
    y -= words_h + 4 * mm

    terms = [
        "1. All sales subject to GST Tax and any Govt. Taxes as applicable under Govt. Rules.",
        "2. Payment to be made in cash/online as agreed. Delayed payments may attract interest as applicable.",
        "3. Seller will not accept shortage or damage claims after goods have left their premises unless supported by carrier records.",
        "4. Any dispute arising out of the transaction will be subject to Hyderabad Court Jurisdiction only.",
    ]
    c.setFont(FONT_BOLD, 8)
    c.setFillColor(PRIMARY)
    c.drawString(x0, y, "Terms And Conditions")
    y -= 4.5 * mm
    c.setFillColor(DARK)
    for term in terms:
        y = _draw_wrapped(c, term, x0, y, usable - 10 * mm, 6.3, FONT, leading=3.1 * mm, max_lines=2)

    c.setStrokeColor(PRIMARY)
    c.setLineWidth(0.8)
    c.line(x0, 8 * mm, width - margin, 8 * mm)
    c.setFont(FONT, 6.5)
    c.setFillColor(MUTED)
    c.drawCentredString(width / 2, 4.5 * mm, "Computer generated tax invoice")
    c.save()
    return buffer.getvalue()


def build_tax_invoice_attachment(order: dict) -> dict:
    pdf_bytes = build_tax_invoice_pdf(order)
    invoice_no = _safe_text(order.get("invoice_number"), _invoice_number(order))
    return {
        "filename": f"Tax Invoice_{invoice_no}.pdf",
        "content": f"data:application/pdf;base64,{base64.b64encode(pdf_bytes).decode('ascii')}",
    }
