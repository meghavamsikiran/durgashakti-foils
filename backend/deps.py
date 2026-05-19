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
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models import UserModel, AuditLogModel, NotificationModel

logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# ── JWT Config ───────────────────────────────────────────────────────────
JWT_SECRET = os.environ.get('JWT_SECRET', '')
if not JWT_SECRET:
    if os.environ.get('ENVIRONMENT') == 'production':
        raise RuntimeError('JWT_SECRET must be set in production')
    import secrets as _sec
    JWT_SECRET = _sec.token_urlsafe(48)
    logging.warning('JWT_SECRET auto-generated for local dev.')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

security = HTTPBearer()


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

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None

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

class CartItem(BaseModel):
    product_id: str
    quantity: int = Field(ge=1)

class ShippingAddress(BaseModel):
    full_name: str = Field(min_length=1, max_length=120)
    phone: str = Field(min_length=10, max_length=20, pattern=r'^\+?[\d\s\-]{10,20}$')
    address_line1: str = Field(min_length=1, max_length=255)
    address_line2: Optional[str] = Field(default=None, max_length=255)
    city: str = Field(min_length=1, max_length=100)
    state: str = Field(min_length=1, max_length=100)
    pincode: str = Field(min_length=6, max_length=6, pattern=r'^\d{6}$')

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

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str = Field(min_length=8, max_length=128)

class AdminCreateRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=120)
    phone: Optional[str] = None
    role: str = "admin"
    permissions: dict = {}

class AdminUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    permissions: Optional[dict] = None

class PasswordResetRequest(BaseModel):
    new_password: str = Field(min_length=8, max_length=128)

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
        if not admin.permissions or not admin.permissions.get(permission):
            raise HTTPException(status_code=403, detail=f"Permission denied: requires {permission}")
        return admin
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
    notif = NotificationModel(
        user_id=user_id,
        title=title,
        message=message,
        type=type,
    )
    db.add(notif)
    await db.flush()

async def send_email(to_email: str, subject: str, body: str):
    smtp_host = os.environ.get('SMTP_HOST', '')
    smtp_port = int(os.environ.get('SMTP_PORT', 587))
    smtp_user = os.environ.get('SMTP_USER', '')
    smtp_pass = os.environ.get('SMTP_PASS', '').replace(' ', '')  # Google App Passwords have display spaces
    smtp_from = os.environ.get('SMTP_FROM', smtp_user)
    is_production = os.environ.get('ENVIRONMENT') == 'production'
    
    if not all([smtp_host, smtp_user, smtp_pass]) or "example.com" in smtp_host:
        logging.warning("SMTP not configured. Host=%s User=%s PassLen=%d", smtp_host, smtp_user, len(smtp_pass))
        if is_production:
            return False, "SMTP not configured or placeholder values detected on production."
        logging.info("--- MOCK EMAIL ---  To: %s  Subject: %s", to_email, subject)
        return True, "Mock Sent"
        
    msg = MIMEMultipart()
    msg['From'] = smtp_from
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'html'))

    # Try standard SMTP (usually port 587)
    try:
        logging.info("Attempting SMTP connection via standard smtplib.SMTP on %s:%d...", smtp_host, smtp_port)
        if smtp_port == 465:
            server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10)
        else:
            server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
            server.starttls()
            
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()
        logging.info("Email sent successfully to %s via port %d", to_email, smtp_port)
        return True, "Sent"
    except Exception as e1:
        logging.warning("SMTP Port %d failed: %s. Attempting fallback to SMTP_SSL on Port 465...", smtp_port, e1)
        
        # Fallback to SSL on 465 (highly reliable in blocked cloud environments)
        try:
            logging.info("Attempting fallback SMTP_SSL connection on %s:465...", smtp_host)
            server = smtplib.SMTP_SSL(smtp_host, 465, timeout=10)
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
            server.quit()
            logging.info("Email sent successfully to %s via fallback port 465", to_email)
            return True, "Sent"
        except Exception as e2:
            err_msg = f"Port {smtp_port} failed ({type(e1).__name__}: {e1}). Fallback Port 465 failed ({type(e2).__name__}: {e2})."
            logging.error("Failed to send email to %s: %s", to_email, err_msg)
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
