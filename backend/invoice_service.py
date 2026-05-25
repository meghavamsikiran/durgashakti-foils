"""Tax invoice PDF generation for DurgaShakti Foils."""
from __future__ import annotations

import base64
import hashlib
import os
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Any

from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


COMPANY_NAME = "DURGASHAKTIFOILS PVT.LTD"
COMPANY_GSTIN = "36AALCD9777D1Z5"
COMPANY_STATE = "36-Telangana"
COMPANY_PHONE = "9901452954"
COMPANY_EMAIL = "Durgashaktifoils@gmail.com"
COMPANY_ADDRESS_LINES = [
    "Plot no 54,Shop no 1, Maruthi",
    "nagar, Mallampet, Hyderabad,",
    "Telangana",
]
BANK_NAME = "HDFC BANK"
BANK_ACCOUNT_NO = "50200115257570"
BANK_IFSC = "HDFC0005472"
BANK_ACCOUNT_HOLDER = "DURGASHAKTI FOILS PRIVATE LIMITED"

TEMPLATE_PATH = Path(__file__).resolve().parent / "assets" / "invoice_template_bg.png"
BASE_WIDTH = 894.0
BASE_HEIGHT = 1264.5
PAGE_WIDTH = 595.9199829101562
PAGE_HEIGHT = 842.8800048828125
PAGE_SCALE = PAGE_WIDTH / BASE_WIDTH

GREEN = colors.Color(46 / 255, 204 / 255, 113 / 255)
DARK = colors.black
WHITE = colors.white
MUTED = colors.Color(63 / 255, 65 / 255, 85 / 255)

C_LEFT = 41.624998
C_BOTTOM = 42.183339

X = {
    "x2": 642.058567,
    "x3": 241.330074,
    "x4": 634.693339,
    "x5": 16.541015,
    "x6": 524.531228,
    "x7": 12.146484,
    "x8": 527.660134,
    "x9": 528.908187,
    "xa": 13.271484,
    "xb": 46.458982,
    "xc": 47.707029,
    "xd": 255.128896,
    "xe": 25.910155,
    "xf": 497.091782,
}

Y = {
    "y2": 1164.761663,
    "y3": 1109.636666,
    "y4": 1123.136665,
    "y5": 1096.136666,
    "y6": 1051.136668,
    "y7": 1027.511669,
    "y8": 1012.886670,
    "y9": 1009.511670,
    "ya": 979.136671,
    "yb": 948.761672,
    "yc": 926.261673,
    "yd": 912.761674,
    "ye": 899.261675,
    "yf": 885.761675,
    "y10": 872.261676,
    "y11": 853.136676,
    "y12": 832.886677,
    "y13": 813.761678,
    "y14": 958.886672,
    "y15": 939.761673,
    "y16": 911.636674,
    "y17": 894.761675,
    "y18": 881.261675,
    "y19": 778.886680,
    "y1a": 747.386681,
    "y1b": 754.136681,
    "y1c": 741.761681,
    "y1d": 715.886682,
    "y1e": 691.136683,
    "y1f": 666.386684,
    "y20": 641.636685,
    "y21": 616.886686,
    "y22": 577.511688,
    "y23": 557.261689,
    "y24": 537.011690,
    "y25": 516.761690,
    "y26": 497.636691,
    "y27": 460.511693,
    "y28": 440.261694,
    "y29": 409.886695,
    "y2a": 389.636696,
    "y2b": 376.136696,
    "y2c": 362.636697,
    "y2d": 349.136697,
    "y2e": 335.636698,
    "y2f": 322.136699,
    "y30": 308.636699,
    "y31": 295.136700,
    "y32": 281.636700,
    "y33": 268.136701,
    "y34": 254.636701,
    "y35": 241.136702,
    "y36": 227.636703,
    "y37": 214.136703,
    "y38": 200.636704,
    "y39": 187.136704,
    "y3a": 173.636705,
    "y3b": 132.011706,
    "y3c": 58.886710,
    "y3d": 593.261687,
    "y3e": 573.011688,
    "y3f": 551.636689,
    "y40": 526.886690,
    "y41": 502.136691,
    "y42": 481.886692,
}

FS = {
    "fs0": 30.239998,
    "fs1": 28.56,
    "fs2": 53.759998,
    "fs3": 25.17,
    "fs4": 67.199997,
    "fs5": 35.279999,
    "fs6": 50.370001,
    "fs7": 26.879999,
    "fs8": 21.84,
    "fs9": 33.599998,
}
FS = {key: value * 0.375 * PAGE_SCALE for key, value in FS.items()}


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


def _px(name: str) -> float:
    return (C_LEFT + X[name]) * PAGE_SCALE


def _py(name: str) -> float:
    return (C_BOTTOM + Y[name]) * PAGE_SCALE


def _sx(value: float) -> float:
    return value * PAGE_SCALE


def _money(value: Any) -> str:
    try:
        number = float(value or 0)
    except (TypeError, ValueError):
        number = 0.0
    return f"\u20b9 {number:,.2f}"


def _safe_text(value: Any, default: str = "") -> str:
    text = str(value).strip() if value is not None else ""
    return text or default


def _parse_dt(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc) if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str) and value:
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            return parsed.astimezone(timezone.utc) if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            pass
    return datetime.now(timezone.utc)


def _invoice_number(order: dict) -> str:
    created = _parse_dt(order.get("created_at") or order.get("updated_at"))
    digest = hashlib.sha1(_safe_text(order.get("id") or order.get("order_number")).encode("utf-8")).hexdigest()
    return f"DSF{created.strftime('%d%m')}{int(digest[:5], 16) % 10000:04d}"


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


def _draw_text(
    c: canvas.Canvas,
    x: float,
    y: float,
    text: Any,
    size: float,
    color=colors.black,
    font: str | None = None,
    max_width: float | None = None,
    align: str = "left",
) -> None:
    font = font or FONT
    text = _safe_text(text)
    if max_width:
        while size > 5 and pdfmetrics.stringWidth(text, font, size) > max_width:
            size -= 0.75
    c.setFillColor(color)
    c.setFont(font, size)
    if align == "right":
        c.drawRightString(x, y, text)
    elif align == "center":
        c.drawCentredString(x, y, text)
    else:
        c.drawString(x, y, text)


def _draw_wrapped(
    c: canvas.Canvas,
    x: float,
    y: float,
    text: Any,
    width: float,
    size: float,
    color=colors.black,
    font: str | None = None,
    leading: float | None = None,
    max_lines: int | None = None,
) -> float:
    font = font or FONT
    leading = leading or size * 1.18
    lines = _wrap_text(_safe_text(text), width, font, size)
    if max_lines is not None:
        lines = lines[:max_lines]
    c.setFillColor(color)
    c.setFont(font, size)
    for line in lines:
        c.drawString(x, y, line)
        y -= leading
    return y


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


def _state_code(state: Any) -> str:
    state_text = _safe_text(state)
    if "telangana" in state_text.lower():
        return COMPANY_STATE
    return state_text or COMPANY_STATE


def _address_lines(addr: dict, order: dict) -> tuple[str, list[str], str, str, str]:
    customer_name = _safe_text(
        addr.get("business_name")
        or addr.get("company_name")
        or addr.get("full_name")
        or addr.get("name")
        or order.get("customer_name"),
        "Customer",
    )
    address_parts = [
        _safe_text(addr.get("address_line1") or addr.get("address") or addr.get("street")),
        _safe_text(addr.get("address_line2")),
        " ".join(part for part in [_safe_text(addr.get("city")), _safe_text(addr.get("state"))] if part),
        _safe_text(addr.get("pincode")),
        "India",
    ]
    address_lines = [line for line in address_parts if line]
    phone = _safe_text(addr.get("phone") or order.get("customer_phone"))
    gstin = _safe_text(addr.get("gstin") or addr.get("gstin_number") or addr.get("gst_number"), "N/A")
    state = _state_code(addr.get("state"))
    return customer_name, address_lines, phone, gstin, state


def _order_rows(order: dict, metadata: dict) -> tuple[list[dict], int, float, float, float]:
    rows: list[dict] = []
    total_qty = 0
    items_taxable_total = 0.0
    items_gst_total = 0.0
    amount_total = 0.0

    for item in order.get("items") or []:
        qty = int(item.get("quantity") or 0)
        unit_price = float(item.get("price") or 0)
        taxable = round(qty * unit_price, 2)
        gst = round(taxable * 0.18, 2)
        amount = round(taxable + gst, 2)
        total_qty += qty
        items_taxable_total += taxable
        items_gst_total += gst
        amount_total += amount
        rows.append({
            "item": _safe_text(item.get("product_name") or item.get("name"), "Product"),
            "description": _safe_text(item.get("description") or item.get("variant") or item.get("size")),
            "hsn": _safe_text(item.get("hsn") or item.get("hsn_code"), "76071991"),
            "qty": qty,
            "unit": _safe_text(item.get("unit"), "Rol"),
            "price": unit_price,
            "gst": gst,
            "amount": amount,
        })

    discount = float(metadata.get("discount_amount") or order.get("discount_amount") or 0)
    if discount > 0:
        discount_gst = round(discount * 0.18, 2)
        rows.append({
            "item": "Coupon Discount",
            "description": ", ".join(order.get("coupon_codes") or []),
            "hsn": "",
            "qty": 1,
            "unit": "Disc",
            "price": -discount,
            "gst": -discount_gst,
            "amount": round(-(discount + discount_gst), 2),
        })
        amount_total -= round(discount + discount_gst, 2)

    shipping = float(metadata.get("shipping_cost") or 0)
    cod = float(metadata.get("cod_charge") or 0)
    if shipping > 0:
        rows.append({
            "item": "Shipping Charges",
            "description": "",
            "hsn": "996812",
            "qty": 1,
            "unit": "Svc",
            "price": shipping,
            "gst": 0.0,
            "amount": shipping,
        })
        amount_total += shipping
    if cod > 0:
        rows.append({
            "item": "COD Charges",
            "description": "",
            "hsn": "999799",
            "qty": 1,
            "unit": "Svc",
            "price": cod,
            "gst": 0.0,
            "amount": cod,
        })
        amount_total += cod

    taxable_total = float(metadata.get("taxable_amount") or max(0.0, items_taxable_total - discount))
    gst_total = float((metadata.get("cgst_amount") or 0) + (metadata.get("sgst_amount") or 0) or round(taxable_total * 0.18, 2))
    return rows, total_qty, taxable_total, gst_total, amount_total


def _draw_header(c: canvas.Canvas, copy_label: str) -> None:
    _draw_text(c, _px("x2"), _py("y2"), copy_label, FS["fs0"], MUTED, FONT, max_width=_sx(230))
    _draw_text(c, _px("x3"), _py("y3"), COMPANY_PHONE, FS["fs1"], WHITE, FONT, max_width=_sx(150))
    _draw_text(c, _px("x3") + _sx(205), _py("y3"), COMPANY_EMAIL, FS["fs1"], WHITE, FONT, max_width=_sx(260))
    _draw_text(c, _px("x4"), _py("y4"), COMPANY_ADDRESS_LINES[0], FS["fs1"], WHITE, FONT, max_width=_sx(220))
    _draw_text(c, _px("x4"), _py("y3"), COMPANY_ADDRESS_LINES[1], FS["fs1"], WHITE, FONT, max_width=_sx(220))
    _draw_text(c, _px("x4"), _py("y5"), COMPANY_ADDRESS_LINES[2], FS["fs1"], WHITE, FONT, max_width=_sx(140))
    _draw_text(c, _px("x5"), _py("y6"), COMPANY_NAME, FS["fs2"], WHITE, FONT, max_width=_sx(530))
    _draw_text(c, _px("x5"), _py("y7"), f"GSTIN: {COMPANY_GSTIN}", FS["fs3"], WHITE, FONT, max_width=_sx(280))
    _draw_text(c, _px("x5"), _py("y8"), f"State: {COMPANY_STATE}", FS["fs3"], WHITE, FONT, max_width=_sx(260))
    _draw_text(c, _px("x6"), _py("y9"), "Tax Invoice", FS["fs4"], DARK, FONT_BOLD, max_width=_sx(310))


def _draw_party_blocks(c: canvas.Canvas, order: dict, invoice_no: str, created: datetime) -> None:
    addr = order.get("shipping_address") or {}
    customer_name, address_lines, phone, gstin, state = _address_lines(addr, order)
    shipping_text = ", ".join([line for line in address_lines if line != "India"])

    _draw_text(c, _px("x7"), _py("ya"), "Bill To:", FS["fs5"], GREEN, FONT_BOLD)
    _draw_text(c, _px("x7"), _py("yb"), customer_name, FS["fs6"], DARK, FONT_BOLD, max_width=_sx(430))

    y_keys = ["yc", "yd", "ye", "yf", "y10"]
    expanded_address: list[str] = []
    for line in address_lines:
        expanded_address.extend(_wrap_text(line, _sx(470), FONT, FS["fs7"]))
    for key, line in zip(y_keys, expanded_address[: len(y_keys)]):
        _draw_text(c, _px("x7"), _py(key), line, FS["fs7"], DARK, FONT, max_width=_sx(490))

    _draw_text(c, _px("x7"), _py("y11"), f"Contact No.: {phone or 'N/A'}", FS["fs7"], DARK, FONT_BOLD, max_width=_sx(460))
    _draw_text(c, _px("x7"), _py("y12"), f"GSTIN Number: {gstin}", FS["fs7"], DARK, FONT_BOLD, max_width=_sx(460))
    _draw_text(c, _px("x7"), _py("y13"), f"State: {state}", FS["fs7"], DARK, FONT_BOLD, max_width=_sx(460))

    _draw_text(c, _px("x8"), _py("ya"), "Invoice No.:", FS["fs7"], DARK, FONT_BOLD)
    _draw_text(c, _px("x8") + _sx(142), _py("ya"), invoice_no, FS["fs7"], DARK, FONT, max_width=_sx(170))
    _draw_text(c, _px("x8"), _py("y14"), "Date:", FS["fs7"], DARK, FONT_BOLD)
    _draw_text(c, _px("x8") + _sx(100), _py("y14"), created.strftime("%d/%m/%Y"), FS["fs7"], DARK, FONT)
    _draw_text(c, _px("x8"), _py("y15"), "Place of Supply:", FS["fs7"], DARK, FONT_BOLD)
    _draw_text(c, _px("x8") + _sx(190), _py("y15"), state, FS["fs7"], DARK, FONT, max_width=_sx(180))

    _draw_text(c, _px("x9"), _py("y16"), "Ship To :", FS["fs5"], GREEN, FONT_BOLD)
    ship_lines = _wrap_text(shipping_text, _sx(360), FONT, FS["fs7"])
    for key, line in zip(["y17", "y18"], ship_lines[:2]):
        _draw_text(c, _px("x9"), _py(key), line, FS["fs7"], DARK, FONT, max_width=_sx(360))


def _draw_items(c: canvas.Canvas, rows: list[dict], total_qty: int, taxable_total: float, gst_total: float, amount_total: float) -> None:
    headers = [
        ("#", _px("x7")),
        ("Item name", _px("xb")),
        ("HSN", _px("xd")),
        ("Quantity", _sx(388)),
        ("Unit", _sx(474)),
        ("Price/ Unit", _sx(568)),
        ("GST", _sx(692)),
        ("Amount", _sx(790)),
    ]
    for label, x in headers:
        _draw_text(c, x, _py("y19"), label, FS["fs7"] * 0.92, WHITE, FONT_BOLD, max_width=_sx(112))

    row_keys = ["y1a", "y1d", "y1e", "y1f", "y20"]
    for idx, row in enumerate(rows[: len(row_keys)]):
        base_y = _py(row_keys[idx])
        name_y = base_y + _sx(6.8)
        desc_y = base_y - _sx(5.5)
        _draw_text(c, _px("xa"), base_y, str(idx + 1), FS["fs7"], DARK, FONT, max_width=_sx(24))
        _draw_text(c, _px("xb"), name_y, row["item"], FS["fs7"] * 0.95, DARK, FONT_BOLD, max_width=_sx(205))
        if row.get("description"):
            _draw_text(c, _px("xc"), desc_y, f"({row['description']})", FS["fs8"], DARK, FONT, max_width=_sx(210))
        _draw_text(c, _px("xd"), base_y, row["hsn"], FS["fs7"], DARK, FONT, max_width=_sx(85))
        _draw_text(c, _sx(460), base_y, str(row["qty"]), FS["fs7"], DARK, FONT, align="right")
        _draw_text(c, _sx(490), base_y, row["unit"], FS["fs7"], DARK, FONT, max_width=_sx(52))
        _draw_text(c, _sx(633), base_y, _money(row["price"]), FS["fs7"], DARK, FONT, align="right", max_width=_sx(95))
        gst_text = f"{_money(row['gst'])} (18%)" if row["gst"] else _money(0)
        _draw_text(c, _sx(748), base_y, gst_text, FS["fs7"], DARK, FONT, align="right", max_width=_sx(125))
        _draw_text(c, _sx(845), base_y, _money(row["amount"]), FS["fs7"], DARK, FONT, align="right", max_width=_sx(105))

    _draw_text(c, _px("xb"), _py("y21"), "Total", FS["fs7"], WHITE, FONT_BOLD)
    _draw_text(c, _sx(460), _py("y21"), str(total_qty), FS["fs7"], WHITE, FONT_BOLD, align="right")
    _draw_text(c, _sx(748), _py("y21"), _money(gst_total), FS["fs7"], WHITE, FONT_BOLD, align="right", max_width=_sx(125))
    _draw_text(c, _sx(845), _py("y21"), _money(amount_total), FS["fs7"], WHITE, FONT_BOLD, align="right", max_width=_sx(105))


def _draw_footer(c: canvas.Canvas, order: dict, metadata: dict, taxable_total: float, gst_total: float) -> None:
    sgst = float(metadata.get("sgst_amount") or round(taxable_total * 0.09, 2))
    cgst = float(metadata.get("cgst_amount") or round(taxable_total * 0.09, 2))
    shipping = float(metadata.get("shipping_cost") or 0)
    cod = float(metadata.get("cod_charge") or 0)
    grand_total = float(metadata.get("grand_total") or order.get("total_amount") or taxable_total + sgst + cgst + shipping + cod)
    payment_status = _safe_text(order.get("payment_status")).lower()
    order_status = _safe_text(order.get("order_status")).lower()
    is_received = payment_status in {"paid", "completed"} or order_status in {"delivered", "completed"}
    received = grand_total if is_received else 0.0
    balance = 0.0 if is_received else grand_total
    payment_mode = _safe_text(order.get("payment_method"), "Online").upper()
    discount = float(metadata.get("discount_amount") or order.get("discount_amount") or 0)

    _draw_text(c, _px("x7"), _py("y22"), "Pay To:", FS["fs5"], GREEN, FONT_BOLD)
    _draw_text(c, _px("x7"), _py("y23"), f"Bank Name : {BANK_NAME}", FS["fs7"], DARK, FONT)
    _draw_text(c, _px("x7"), _py("y24"), f"Bank Account No. : {BANK_ACCOUNT_NO}", FS["fs7"], DARK, FONT)
    _draw_text(c, _px("x7"), _py("y25"), f"Bank IFSC code : {BANK_IFSC}", FS["fs7"], DARK, FONT)
    _draw_text(c, _px("x7"), _py("y26"), f"Account holder's name : {BANK_ACCOUNT_HOLDER}", FS["fs7"], DARK, FONT, max_width=_sx(520))

    _draw_text(c, _px("x7"), _py("y27"), "Invoice Amount In Words", FS["fs5"], GREEN, FONT_BOLD)
    _draw_text(c, _px("x7"), _py("y28"), _number_to_words(grand_total), FS["fs7"], DARK, FONT, max_width=_sx(470))

    _draw_text(c, _px("x7"), _py("y29"), "Terms And Conditions", FS["fs5"], GREEN, FONT_BOLD)
    terms = [
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
        "8) No claim will be entertained unless supported by certificate from Transport / Railway Authorities",
    ]
    term_keys = [
        "y2a", "y2b", "y2c", "y2d", "y2e", "y2f", "y30", "y31", "y32",
        "y33", "y34", "y35", "y36", "y37", "y38", "y39", "y3a",
    ]
    for key, term in zip(term_keys, terms):
        _draw_text(c, _px("x7"), _py(key), term, FS["fs7"], DARK, FONT, max_width=_sx(630))

    _draw_text(c, _px("xa"), _py("y3b"), f"For : {COMPANY_NAME}", FS["fs7"], DARK, FONT, max_width=_sx(360))
    _draw_text(c, _px("xe"), _py("y3c"), "Authorized Signatory", FS["fs9"], DARK, FONT_BOLD, max_width=_sx(260))

    summary = [
        ("Sub Total", taxable_total),
        ("Coupon Discount", -discount),
        ("Shipping Charges", shipping),
        ("COD Charges", cod),
        ("SGST@9%", sgst),
        ("CGST@9%", cgst),
        ("Total", grand_total),
        ("Received", received),
        ("Balance", balance),
    ]
    y_keys = ["y3d", "y3e", "y3f", "y40", "y41", "y42", "y27", "y28", "y29"]
    visible_summary = [(label, value) for label, value in summary if value != 0 or label in {"Sub Total", "Total", "Received", "Balance"}]
    for key, (label, value) in zip(y_keys, visible_summary):
        color = WHITE if label == "Total" else DARK
        font = FONT_BOLD if label == "Total" else FONT
        _draw_text(c, _px("xf"), _py(key), label, FS["fs7"], color, font, max_width=_sx(180))
        _draw_text(c, _sx(845), _py(key), _money(value), FS["fs7"], color, font, align="right", max_width=_sx(130))

    _draw_text(c, _px("xf"), _py("y2a"), "Payment Mode", FS["fs7"], DARK, FONT, max_width=_sx(180))
    _draw_text(c, _sx(845), _py("y2a"), payment_mode, FS["fs7"], DARK, FONT, align="right", max_width=_sx(130))


def build_tax_invoice_pdf(order: dict, copy_label: str = "ORIGINAL FOR RECIPIENT") -> bytes:
    """Generate a one-page tax invoice PDF using the uploaded DSF bill template."""
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=(PAGE_WIDTH, PAGE_HEIGHT))

    if TEMPLATE_PATH.exists():
        c.drawImage(ImageReader(str(TEMPLATE_PATH)), 0, 0, width=PAGE_WIDTH, height=PAGE_HEIGHT, mask="auto")
    else:
        c.setFillColor(colors.white)
        c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, stroke=0, fill=1)

    created = _parse_dt(order.get("created_at") or order.get("updated_at"))
    invoice_no = _safe_text(order.get("invoice_number"), _invoice_number(order))
    metadata = (order.get("shipping_address") or {}).get("shipping_metadata") or {}
    rows, total_qty, taxable_total, gst_total, amount_total = _order_rows(order, metadata)

    # The source background sits very close to the right PDF edge; redraw a clean
    # right boundary inside the page so browser/PDF viewers do not clip it.
    c.setStrokeColor(colors.Color(128 / 255, 128 / 255, 128 / 255))
    c.setLineWidth(0.55)
    c.line(PAGE_WIDTH - 7, _py("y19") + _sx(14), PAGE_WIDTH - 7, _py("y21") - _sx(4))
    c.line(PAGE_WIDTH - 7, _py("y3d") + _sx(10), PAGE_WIDTH - 7, _py("y2a") - _sx(6))

    _draw_header(c, copy_label)
    _draw_party_blocks(c, order, invoice_no, created)
    _draw_items(c, rows, total_qty, taxable_total, gst_total, amount_total)
    _draw_footer(c, order, metadata, taxable_total, gst_total)

    c.save()
    return buffer.getvalue()


def build_tax_invoice_attachment(order: dict) -> dict:
    pdf_bytes = build_tax_invoice_pdf(order)
    invoice_no = _safe_text(order.get("invoice_number"), _invoice_number(order))
    return {
        "filename": f"Tax Invoice_{invoice_no}.pdf",
        "content": f"data:application/pdf;base64,{base64.b64encode(pdf_bytes).decode('ascii')}",
    }
