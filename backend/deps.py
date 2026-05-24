"""
Shared dependencies: auth, helpers, Pydantic schemas.
Imported by all route modules.
"""
import os
import re
import uuid
import logging
import time
import bcrypt
import jwt
import smtplib
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from fastapi import HTTPException, Depends, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, ConfigDict, EmailStr, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models import UserModel, AuditLogModel, NotificationModel

import phonenumbers
from phonenumbers import NumberParseException

logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# ── JWT Config ───────────────────────────────────────────────────────────
JWT_SECRET = os.environ.get('JWT_SECRET', '')
if not JWT_SECRET:
    JWT_SECRET = "super_secret_local_dev_only_key_ds_foils"

JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 168  # 7 days

security = HTTPBearer()

def validate_phone_number(v: str) -> str:
    if not v:
        raise ValueError("Phone number cannot be empty")
    
    # Strip spaces, hyphens, and parentheses
    cleaned = re.sub(r"[\s\-\(\)]", "", v)
    
    # Auto-format local Indian numbers:
    if cleaned.isdigit() and len(cleaned) == 10:
        cleaned = "+91" + cleaned
    elif cleaned.isdigit() and len(cleaned) == 11 and cleaned.startswith("0"):
        cleaned = "+91" + cleaned[1:]
        
    # Enforce country code starting with '+'
    if not cleaned.startswith("+"):
        raise ValueError("Phone number must include a valid country code starting with '+' (e.g. +91 83675 42954)")
        
    # Verify remaining characters are digits
    digits_only = cleaned[1:]
    if not digits_only.isdigit():
        raise ValueError("Phone number must contain only digits after the '+' prefix")
        
    # Prevent obvious fake/test sequences in local part (last 10 digits)
    if len(digits_only) >= 10:
        local_part = digits_only[-10:]
        if len(set(local_part)) == 1:
            raise ValueError("Phone number cannot consist of the same repeating digit (e.g. 0000000000)")
        if local_part in ["1234567890", "0123456789", "9876543210", "1234567891"]:
            raise ValueError("Invalid phone number sequence (e.g. 1234567890)")
            
    # Deep validation via Google phonenumbers library to ensure it actually exists
    try:
        parsed = phonenumbers.parse(cleaned, None)
        if not phonenumbers.is_valid_number(parsed):
            raise ValueError("The phone number provided does not exist or is invalid for its country code")
        return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
    except NumberParseException as e:
        raise ValueError(f"Invalid phone number format: {str(e)}")

def validate_gmail_address(v: str) -> str:
    if not v:
        raise ValueError("Email address cannot be empty")
    cleaned = v.strip().lower()
    
    # Enforce strict @gmail.com suffix
    if not cleaned.endswith("@gmail.com"):
        raise ValueError("Email address must end strictly with '@gmail.com'")
        
    # Check domain deliverability / existence using email-validator
    from email_validator import validate_email, EmailNotValidError
    try:
        validate_email(cleaned, check_deliverability=True)
    except EmailNotValidError as e:
        raise ValueError(f"Email domain does not exist or is unreachable: {str(e)}")
        
    return cleaned


# ── Pydantic Schemas ─────────────────────────────────────────────────────
class UserSchema(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    role: str = "customer"
    status: str = "active"
    permissions: dict = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    wishlist: List[dict] = []
    addresses: List[dict] = []

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=120)
    phone: Optional[str] = None

    @field_validator("email")
    @classmethod
    def validate_email_address(cls, v):
        return validate_gmail_address(v)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        if v is not None and v != "":
            return validate_phone_number(v)
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

    @field_validator("email")
    @classmethod
    def validate_email_address(cls, v):
        return validate_gmail_address(v)

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None

    @field_validator("email")
    @classmethod
    def validate_email_address(cls, v):
        if v is not None and v != "":
            return validate_gmail_address(v)
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        if v is not None and v != "":
            return validate_phone_number(v)
        return v

class UserAddress(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    label: str
    full_name: str
    phone: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    pincode: str
    is_default: bool = False

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        return validate_phone_number(v)

class CartItem(BaseModel):
    product_id: str
    quantity: int = Field(ge=1)

class ShippingAddress(BaseModel):
    full_name: str = Field(min_length=1, max_length=120)
    phone: str
    address_line1: str = Field(min_length=1, max_length=255)
    address_line2: Optional[str] = Field(default=None, max_length=255)
    city: str = Field(min_length=1, max_length=100)
    state: str = Field(min_length=1, max_length=100)
    pincode: str = Field(min_length=6, max_length=6, pattern=r'^\d{6}$')

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        return validate_phone_number(v)

class OrderItemSchema(BaseModel):
    product_id: str
    product_name: str
    image_url: Optional[str] = None
    quantity: int = Field(ge=1)
    price: float

class OrderCreate(BaseModel):
    items: List[OrderItemSchema]
    total_amount: float
    payment_method: str
    shipping_address: ShippingAddress
    idempotency_key: Optional[str] = None
    coupon_codes: Optional[List[str]] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

    @field_validator("email")
    @classmethod
    def validate_email_address(cls, v):
        return validate_gmail_address(v)

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def validate_email_address(cls, v):
        return validate_gmail_address(v)

class AdminCreateRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=120)
    phone: Optional[str] = None
    role: str = "admin"
    permissions: dict = {}
    role_template: Optional[str] = None

    @field_validator("email")
    @classmethod
    def validate_email_address(cls, v):
        return validate_gmail_address(v)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        if v is not None and v != "":
            return validate_phone_number(v)
        return v

class AdminUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    permissions: Optional[dict] = None

    @field_validator("email")
    @classmethod
    def validate_email_address(cls, v):
        if v is not None and v != "":
            return validate_gmail_address(v)
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        if v is not None and v != "":
            return validate_phone_number(v)
        return v

class PasswordResetRequest(BaseModel):
    new_password: str = Field(min_length=8, max_length=128)

class ContactCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    message: str = Field(min_length=1, max_length=1000)
    phone: Optional[str] = None

    @field_validator("email")
    @classmethod
    def validate_email_address(cls, v):
        return validate_gmail_address(v)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        if v is not None and v != "":
            return validate_phone_number(v)
        return v

class VariantInput(BaseModel):
    size: str
    sku: str
    price: float
    discount_price: Optional[float] = None
    stock_quantity: int = 0
    in_stock: bool = True
    badge: Optional[str] = None

class ProductBulkCreateRequest(BaseModel):
    name: str
    description: str
    category: str = "Aluminum Foil"
    thickness: str = "11 Micron"
    width: str = "295mm"
    image_url: str
    media_urls: List[dict] = []
    features: List[str] = []
    variants: List[VariantInput]
    is_active: bool = True

class SavedCard(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    brand: str
    last4: str
    expiry_month: str
    expiry_year: str
    holder_name: str

class WishlistItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NotificationSchema(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    message: str
    type: str = "info"
    is_read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductSchema(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    size: str
    thickness: str
    price: float
    discount_price: Optional[float] = None
    badge: Optional[str] = None
    image_url: str
    media_urls: List[dict] = []
    features: List[str]
    in_stock: bool = True
    stock_quantity: int = 0
    units_sold: int = 0
    low_stock_threshold: int = 20
    category: str = "Aluminum Foil"
    batch_no: str = ""
    width: str = "295mm"
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None


# ── Helpers ──────────────────────────────────────────────────────────────
def validate_uuid(val: str | None) -> str:
    if not val or val == "None":
        raise HTTPException(status_code=400, detail="Invalid ID format")
    try:
        uuid.UUID(str(val))
        return str(val)
    except (ValueError, TypeError, AttributeError):
        raise HTTPException(status_code=400, detail="Invalid ID format")

def is_valid_uuid(val: str | None) -> bool:
    if not val or val == "None":
        return False
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, TypeError, AttributeError):
        return False

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        'user_id': user_id,
        'email': email,
        'role': role,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def sanitize_search_term(term: str | None, max_length: int = 100) -> str | None:
    if not term:
        return None
    term = str(term).strip()
    if len(term) > max_length:
        term = term[:max_length]
    return term

def is_super_admin_role(role: str | None) -> bool:
    return role == "SUPER_ADMIN"

def delete_old_file(file_url: Optional[str]):
    if not file_url:
        return
    try:
        if "/uploads/" in file_url:
            filename = file_url.split("/uploads/")[-1]
            if filename:
                file_path = UPLOADS_DIR / filename
                if file_path.exists() and file_path.is_file():
                    os.remove(file_path)
                    logging.info(f"Deleted orphaned asset: {filename}")
    except Exception as e:
        logging.error(f"Error deleting old file {file_url}: {e}")

def row_to_dict(row) -> dict:
    """Convert an SQLAlchemy model instance to a plain dict."""
    d = {}
    for c in row.__table__.columns:
        key = c.key
        if key == 'metadata' or key == 'metadata_':
            key = 'metadata_'
        val = getattr(row, key)
        col_name = c.name  # actual DB column name
        if isinstance(val, uuid.UUID):
            val = str(val)
        elif isinstance(val, datetime):
            val = val.isoformat()
        elif hasattr(val, 'is_finite'):  # Decimal
            val = float(val)
        d[col_name] = val
    return d



# ── Auth Dependencies ────────────────────────────────────────────────────
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token = credentials.credentials
    payload = decode_token(token)
    user_id = payload.get('user_id') or payload.get('sub')
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    result = await db.execute(select(UserModel).where(UserModel.id == user_id))
    user_row = result.scalar_one_or_none()
    if not user_row:
        raise HTTPException(status_code=401, detail="User not found")
    if user_row.status == "inactive" or not user_row.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")
    d = row_to_dict(user_row)
    d.pop('password', None)
    return UserSchema(**d)


async def get_admin_user(current_user: UserSchema = Depends(get_current_user)):
    if current_user.role not in {"admin", "SUPER_ADMIN"}:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

def require_permission(permission: str):
    async def permission_checker(admin: UserSchema = Depends(get_admin_user)):
        if admin.role == "SUPER_ADMIN":
            return admin
        if not admin.permissions:
            raise HTTPException(status_code=403, detail=f"Permission denied: requires {permission}")
        
        # Direct check
        if admin.permissions.get(permission) is True:
            return admin
            
        # Permission Mapping
        PERMISSION_MAPPING = {
            'manage_orders': ['view_orders', 'update_order_status', 'cancel_orders', 'view_order_details'],
            'manage_products': ['view_products', 'create_products', 'edit_products', 'delete_products'],
            'manage_inventory': ['view_inventory', 'update_stock'],
            'manage_customers': ['view_customers', 'view_customer_history', 'view_inquiries', 'update_inquiry_status', 'reply_inquiry'],
            'access_financial_reports': ['view_transactions', 'update_payment_status', 'export_payment_reports', 'view_analytics'],
            'access_gst_reports': ['view_gst_reports', 'export_gst_reports', 'upload_gst_files', 'import_gst_data'],
            'manage_admins': ['create_admin', 'edit_admin', 'disable_admin', 'delete_admin', 'assign_permissions', 'view_audit_logs'],
            'manage_settings': ['manage_settings']
        }
        
        # Check if legacy permission requested and any granular sub-permission is true
        if permission in PERMISSION_MAPPING:
            if any(admin.permissions.get(p) is True for p in PERMISSION_MAPPING[permission]):
                return admin
                
        # Check if granular sub-permission requested and legacy parent permission is true
        for legacy, granular_list in PERMISSION_MAPPING.items():
            if permission in granular_list and admin.permissions.get(legacy) is True:
                return admin
                
        raise HTTPException(status_code=403, detail=f"Permission denied: requires {permission}")
    return permission_checker


# ── Shared DB Helpers ────────────────────────────────────────────────────
async def write_audit_log(db: AsyncSession, action: str, actor_id: str, target_type: str, target_id: str, metadata: dict | None = None):
    try:
        log = AuditLogModel(
            action=action,
            actor_id=actor_id,
            target_type=target_type,
            target_id=target_id,
            metadata_=metadata or {},
        )
        db.add(log)
        await db.flush()
    except Exception as exc:
        logger.warning('Audit log write failed: %s', exc)

async def create_notification(db: AsyncSession, user_id: str, title: str, message: str, type: str = "info"):
    import uuid as _uuid
    notif_user_id = _uuid.UUID(str(user_id))
    notif = NotificationModel(
        user_id=notif_user_id,
        title=title,
        message=message,
        type=type,
    )
    db.add(notif)
    await db.flush()

import urllib.request
import json
import asyncio

def _send_vercel_relay(url: str, payload: dict):
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=data,
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    with urllib.request.urlopen(req, timeout=12) as response:
        return response.status, response.read().decode('utf-8')

async def send_email(to_email: str, subject: str, body: str, attachments: list = None) -> bool:
    """Send an email via Vercel HTTPS SMTP Relay or fallback directly to SMTP."""
    try:
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        from email.mime.base import MIMEBase
        from email import encoders
        import smtplib
        import os
        import base64
        import asyncio
        import logging
    except ImportError:
        return False, "Failed to import email modules"

    smtp_host = os.environ.get('SMTP_HOST', '')
    smtp_port = int(os.environ.get('SMTP_PORT', 587))
    smtp_user = os.environ.get('SMTP_USER', '')
    smtp_pass = os.environ.get('SMTP_PASS', '').replace(' ', '')
    smtp_from = os.environ.get('SMTP_FROM', smtp_user)
    is_production = os.environ.get('ENVIRONMENT') == 'production'
    
    if not all([smtp_host, smtp_user, smtp_pass]) or "example.com" in smtp_host:
        logging.warning("SMTP not configured. Host=%s User=%s PassLen=%d", smtp_host, smtp_user, len(smtp_pass))
        if is_production:
            return False, "SMTP not configured or placeholder values detected on production."
        logging.info("--- MOCK EMAIL ---  To: %s  Subject: %s", to_email, subject)
        return True, "Mock Sent"

    # Route 1: Try high-deliverability Vercel HTTPS SMTP Relay (never blocked by Render)
    try:
        vercel_url = "https://durgashakti-foils.vercel.app/api/send-email"
        logging.info("Attempting email dispatch via Vercel HTTPS Relay to %s...", to_email)
        payload = {
            "to": to_email,
            "subject": subject,
            "body": body,
            "smtp_user": smtp_user,
            "smtp_pass": smtp_pass
        }
        if attachments:
            payload["attachments"] = attachments
            
        status, res_text = await asyncio.to_thread(_send_vercel_relay, vercel_url, payload)
        if status == 200:
            logging.info("Email successfully sent via Vercel HTTPS Relay: %s", res_text)
            return True, "Sent"
        logging.warning("Vercel Relay returned non-200 status (%d): %s. Falling back to local SMTP...", status, res_text)
    except Exception as ev:
        logging.warning("Vercel HTTPS Relay failed: %s. Falling back to direct SMTP...", ev)

    # Route 2: Fallback to direct SMTP (usually port 587)
    msg = MIMEMultipart()
    msg['From'] = smtp_from
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'html'))
    
    if attachments:
        for att in attachments:
            part = MIMEBase('application', 'octet-stream')
            content = att['content']
            if ',' in content:
                content = content.split(',')[-1]
            part.set_payload(base64.b64decode(content))
            encoders.encode_base64(part)
            part.add_header('Content-Disposition', f"attachment; filename= {att['filename']}")
            msg.attach(part)

    try:
        logging.info("Attempting direct SMTP connection on %s:%d...", smtp_host, smtp_port)
        if smtp_port == 465:
            server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10)
        else:
            server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
            server.starttls()
            
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()
        logging.info("Email sent successfully directly via port %d", smtp_port)
        return True, "Sent"
    except Exception as e1:
        logging.warning("Direct SMTP Port %d failed: %s. Attempting fallback to SMTP_SSL on Port 465...", smtp_port, e1)
        
        # Fallback to SSL on 465
        try:
            logging.info("Attempting direct fallback SMTP_SSL connection on %s:465...", smtp_host)
            server = smtplib.SMTP_SSL(smtp_host, 465, timeout=10)
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
            server.quit()
            logging.info("Email sent successfully directly via fallback port 465")
            return True, "Sent"
        except Exception as e2:
            err_msg = f"Vercel Relay failed. Direct Port {smtp_port} failed ({type(e1).__name__}: {e1}). Direct Fallback Port 465 failed ({type(e2).__name__}: {e2})."
            logging.error("All email delivery routes failed to send to %s: %s", to_email, err_msg)
            return False, err_msg


# ── Order Status Machine ────────────────────────────────────────────────
ORDER_STATUS_TRANSITIONS = {
    "pending_payment": ["confirmed", "cancelled", "overdue"],
    "overdue": ["cancelled"],
    "pending": ["confirmed", "cancelled"],
    "processing": ["confirmed", "packaging", "cancelled"],
    "placed": ["confirmed", "packaging", "cancelled"],
    "confirmed": ["packaging", "cancelled"],
    "packaging": ["shipped", "cancelled"],
    "shipped": ["out_for_delivery", "cancelled"],
    "out_for_delivery": ["delivered", "failed", "cancelled"],
    "delivered": [],
    "cancelled": [],
    "refunded": [],
    "failed": [],
    "return_requested": ["return_approved", "return_rejected"],
    "return_approved": [],
    "return_rejected": [],
}

def normalize_order_status(status: str | None) -> str:
    if not status:
        raise HTTPException(status_code=400, detail="Status is required")
    normalized = status.strip().lower()
    aliases = {
        "confirm": "confirmed",
        "ship": "shipped",
        "deliver": "delivered",
        "cancel": "cancelled",
        "refund": "refunded",
        "package": "packaging",
        "packed": "packaging",
        "packaging": "packaging",
        "out_for_delivery": "out_for_delivery",
        "failed": "failed"
    }
    return aliases.get(normalized, normalized)
