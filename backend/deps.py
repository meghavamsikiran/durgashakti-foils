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
from sqlalchemy import select, func

from database import get_db
from models import UserModel, AuditLogModel, NotificationModel

import phonenumbers
from phonenumbers import NumberParseException

logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# ── JWT Config ───────────────────────────────────────────────────────────
JWT_SECRET = os.environ.get('JWT_SECRET', '').strip()
if not JWT_SECRET:
    if os.environ.get('ENVIRONMENT') == 'production':
        raise RuntimeError("JWT_SECRET must be configured in production.")
    JWT_SECRET = "local_dev_only_ds_foils_jwt_secret_change_me"
    logger.warning("JWT_SECRET is not configured; using local development fallback.")

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


def normalize_gmail_identifier(v: str) -> str:
    """Allow staff/customer login with either full Gmail address or Gmail username."""
    if not v:
        raise ValueError("Email or username cannot be empty")
    cleaned = v.strip().lower()
    if "@" not in cleaned:
        if not re.fullmatch(r"[a-zA-Z0-9._%+-]{3,64}", cleaned):
            raise ValueError("Enter a valid Gmail username or @gmail.com address")
        cleaned = f"{cleaned}@gmail.com"
    return validate_gmail_address(cleaned)


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
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email_address(cls, v):
        return normalize_gmail_identifier(v)

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
    alternate_phone: Optional[str] = None
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

    @field_validator("alternate_phone")
    @classmethod
    def validate_alternate_phone(cls, v):
        if v:
            return validate_phone_number(v)
        return v

class CartItem(BaseModel):
    product_id: str
    quantity: int = Field(ge=1)

class ShippingAddress(BaseModel):
    label: Optional[str] = None
    full_name: str = Field(min_length=1, max_length=120)
    phone: str
    alternate_phone: Optional[str] = None
    address_line1: str = Field(min_length=1, max_length=255)
    address_line2: Optional[str] = Field(default=None, max_length=255)
    city: str = Field(min_length=1, max_length=100)
    state: str = Field(min_length=1, max_length=100)
    pincode: str = Field(min_length=6, max_length=6, pattern=r'^\d{6}$')

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        return validate_phone_number(v)

    @field_validator("alternate_phone")
    @classmethod
    def validate_shipping_alternate_phone(cls, v):
        if v:
            return validate_phone_number(v)
        return v

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
    role_template: Optional[str] = None

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


def normalize_category_name(name: str | None) -> str:
    return str(name or "").strip()


async def ensure_category_exists(db: AsyncSession, name: str | None):
    """Create a saved category row for a product category name if needed."""
    category_name = normalize_category_name(name)
    if not category_name:
        return None

    from models import CategoryModel

    existing = await db.execute(
        select(CategoryModel).where(func.lower(CategoryModel.name) == category_name.lower())
    )
    category = existing.scalar_one_or_none()
    if category:
        return category

    category = CategoryModel(
        id=str(uuid.uuid4()),
        name=category_name,
        is_active=True,
    )
    db.add(category)
    await db.flush()
    return category


async def sync_product_categories(db: AsyncSession):
    """Backfill saved categories from product.category values."""
    from models import ProductModel

    result = await db.execute(
        select(func.distinct(ProductModel.category)).where(
            ProductModel.category.is_not(None),
            func.trim(ProductModel.category) != "",
        )
    )
    for category_name in result.scalars().all():
        await ensure_category_exists(db, category_name)


def _best_price(base_price, item_discount_price=None, category_discount_percent=0):
    base = float(base_price or 0)
    category_percent = float(category_discount_percent or 0)
    if category_percent > 0 and base > 0:
        return round(base * (1 - (category_percent / 100)), 2)
    item_discount = float(item_discount_price or 0)
    if item_discount > 0 and item_discount < base:
        return round(item_discount, 2)
    return round(base, 2)


async def get_category_discount_map(db: AsyncSession, category_names):
    from models import CategoryModel

    names = [normalize_category_name(name) for name in (category_names or [])]
    names = [name for name in names if name]
    if not names:
        return {}

    result = await db.execute(
        select(CategoryModel).where(func.lower(CategoryModel.name).in_([name.lower() for name in names]))
    )
    discounts = {}
    for category in result.scalars().all():
        percent = float(category.global_discount_percent or 0)
        discounts[category.name.lower()] = percent if category.global_discount_enabled and percent > 0 else 0
    return discounts


async def apply_effective_product_pricing(db: AsyncSession, products: list[dict]) -> list[dict]:
    discounts = await get_category_discount_map(db, [product.get("category") for product in products])
    for product in products:
        base_price = float(product.get("price") or 0)
        category_percent = discounts.get(normalize_category_name(product.get("category")).lower(), 0)
        effective_price = _best_price(base_price, product.get("discount_price"), category_percent)
        product["base_price"] = base_price
        product["effective_price"] = effective_price
        product["category_global_discount_percent"] = category_percent
        if effective_price < base_price:
            product["discount_price"] = effective_price
    return products


def _coupon_is_current(coupon) -> bool:
    now = datetime.now(timezone.utc)
    expiry = getattr(coupon, "expiry_date", None)
    if expiry and expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    usage_cap = getattr(coupon, "max_usage_count", None)
    return (
        bool(getattr(coupon, "is_active", False))
        and (not expiry or expiry >= now)
        and (usage_cap is None or int(getattr(coupon, "total_uses", 0) or 0) < int(usage_cap))
    )


def _coupon_display_payload(coupon) -> dict:
    return {
        "id": str(coupon.id),
        "code": coupon.code,
        "coupon_type": coupon.coupon_type or "product",
        "discount_type": coupon.discount_type,
        "discount_value": float(coupon.discount_value or 0),
        "min_cart_value": float(coupon.min_cart_value or 0),
        "max_discount_limit": float(coupon.max_discount_limit) if coupon.max_discount_limit is not None else None,
        "expiry_date": coupon.expiry_date.isoformat() if coupon.expiry_date else None,
    }


async def attach_applicable_product_coupons(db: AsyncSession, products: list[dict]) -> list[dict]:
    """Attach active product/category coupon codes to public product payloads."""
    if not products:
        return products

    from models import CategoryModel, CouponModel

    result = await db.execute(
        select(CouponModel)
        .where(CouponModel.coupon_type == "product")
        .order_by(CouponModel.created_at.desc())
    )
    coupons = [coupon for coupon in result.scalars().all() if _coupon_is_current(coupon)]
    if not coupons:
        for product in products:
            product["applicable_coupons"] = []
        return products

    category_names = [normalize_category_name(product.get("category")) for product in products]
    category_names = [name for name in category_names if name]
    category_ids_by_name = {}
    if category_names:
        category_result = await db.execute(
            select(CategoryModel).where(func.lower(CategoryModel.name).in_([name.lower() for name in category_names]))
        )
        category_ids_by_name = {
            category.name.lower(): str(category.id)
            for category in category_result.scalars().all()
        }

    for product in products:
        product_id = str(product.get("id") or "")
        category_id = category_ids_by_name.get(normalize_category_name(product.get("category")).lower())
        product_coupons = []
        for coupon in coupons:
            eligible_product_ids = [str(pid) for pid in (coupon.eligible_product_ids or [])]
            eligible_category_ids = [str(cid) for cid in (coupon.eligible_category_ids or [])]
            applies_to_all_products = bool(getattr(coupon, "apply_to_all_products", False))
            # Older product coupons were saved before apply_to_all_products existed.
            if not applies_to_all_products and not eligible_product_ids and not eligible_category_ids:
                applies_to_all_products = True

            if (
                applies_to_all_products
                or product_id in eligible_product_ids
                or (category_id and category_id in eligible_category_ids)
            ):
                product_coupons.append(_coupon_display_payload(coupon))
        product["applicable_coupons"] = product_coupons[:3]
    return products


async def get_effective_product_price(db: AsyncSession, product) -> float:
    discounts = await get_category_discount_map(db, [getattr(product, "category", None)])
    category_percent = discounts.get(normalize_category_name(getattr(product, "category", None)).lower(), 0)
    return _best_price(getattr(product, "price", 0), getattr(product, "discount_price", 0), category_percent)



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
            'access_gst_reports': ['view_gst_reports', 'export_gst_reports'],
            'manage_admins': ['create_admin', 'edit_admin', 'disable_admin', 'delete_admin', 'assign_permissions', 'view_audit_logs'],
            'manage_settings': ['manage_settings', 'manage_banner'],
            'manage_coupons': ['manage_coupons', 'manage_settings'],
            'manage_reviews': ['view_reviews', 'moderate_reviews', 'reply_reviews']
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
        meta = (metadata or {}).copy()
        # Enrich metadata with actor snapshot when possible
        try:
            if actor_id and 'actor_name' not in meta:
                res = await db.execute(select(UserModel).where(UserModel.id == actor_id))
                u = res.scalar_one_or_none()
                if u:
                    meta.setdefault('actor_name', u.full_name or u.email)
                    meta.setdefault('actor_email', u.email)
                    meta.setdefault('actor_role', u.role)
                    if u.role == "SUPER_ADMIN":
                        meta.setdefault('actor_role_label', "Super Admin")
                    else:
                        role_labels = {
                            "OPERATIONS_ADMIN": "Operations Admin",
                            "ORDER_MANAGER": "Order Manager",
                            "PRODUCT_MANAGER": "Product Manager",
                            "INVENTORY_MANAGER": "Inventory Manager",
                            "CUSTOMER_SUPPORT": "Customer Support Admin",
                            "SHIPPING_MANAGER": "Shipping Manager",
                            "FINANCE_ADMIN": "Finance Admin",
                            "ANALYTICS_VIEWER": "Analytics Viewer",
                            "CUSTOM": "Custom Admin",
                        }
                        role_template = str((u.permissions or {}).get("role_template") or "CUSTOM").upper()
                        meta.setdefault('actor_role_label', role_labels.get(role_template, "Custom Admin"))
        except Exception:
            # don't block audit logging on enrichment failure
            pass

        log = AuditLogModel(
            action=action,
            actor_id=actor_id,
            target_type=target_type,
            target_id=target_id,
            metadata_=meta,
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
import base64

def _post_json(url: str, payload: dict, headers: dict | None = None, timeout: int = 15):
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=data,
        headers={'Content-Type': 'application/json', **(headers or {})},
        method='POST'
    )
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return response.status, response.read().decode('utf-8')

def _send_direct_smtp(smtp_host: str, smtp_port: int, smtp_user: str, smtp_pass: str, msg) -> tuple[bool, str]:
    import smtplib
    import logging
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
            err_msg = f"Direct Port {smtp_port} failed ({type(e1).__name__}: {e1}). Direct Fallback Port 465 failed ({type(e2).__name__}: {e2})."
            logging.error("All direct SMTP delivery routes failed: %s", err_msg)
            return False, err_msg

def _attachment_content(att: dict) -> str:
    content = str(att.get('content') or '')
    return content.split(',')[-1] if ',' in content else content

def _email_from_address(default_from: str) -> str:
    return os.environ.get('EMAIL_FROM') or os.environ.get('SMTP_FROM') or default_from

def _email_from_name() -> str:
    return os.environ.get('EMAIL_FROM_NAME', 'Durga Shakti Foils')

def _send_resend_email(api_key: str, to_email: str, subject: str, body: str, attachments: list | None, sender: str):
    payload = {
        "from": f"{_email_from_name()} <{sender}>",
        "to": [to_email],
        "subject": subject,
        "html": body,
    }
    if attachments:
        payload["attachments"] = [
            {"filename": att.get("filename", "attachment.pdf"), "content": _attachment_content(att)}
            for att in attachments if att and att.get("content")
        ]
    return _post_json(
        "https://api.resend.com/emails",
        payload,
        {"Authorization": f"Bearer {api_key}"},
        timeout=20,
    )

def _send_brevo_email(api_key: str, to_email: str, subject: str, body: str, attachments: list | None, sender: str):
    payload = {
        "sender": {"name": _email_from_name(), "email": sender},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": body,
    }
    if attachments:
        payload["attachment"] = [
            {"name": att.get("filename", "attachment.pdf"), "content": _attachment_content(att)}
            for att in attachments if att and att.get("content")
        ]
    return _post_json(
        "https://api.brevo.com/v3/smtp/email",
        payload,
        {"api-key": api_key, "accept": "application/json"},
        timeout=20,
    )

def _send_sendgrid_email(api_key: str, to_email: str, subject: str, body: str, attachments: list | None, sender: str):
    payload = {
        "personalizations": [{"to": [{"email": to_email}]}],
        "from": {"email": sender, "name": _email_from_name()},
        "subject": subject,
        "content": [{"type": "text/html", "value": body}],
    }
    if attachments:
        payload["attachments"] = [
            {
                "filename": att.get("filename", "attachment.pdf"),
                "content": _attachment_content(att),
                "type": att.get("contentType", "application/octet-stream"),
                "disposition": "attachment",
            }
            for att in attachments if att and att.get("content")
        ]
    return _post_json(
        "https://api.sendgrid.com/v3/mail/send",
        payload,
        {"Authorization": f"Bearer {api_key}"},
        timeout=20,
    )

async def _send_via_email_api(to_email: str, subject: str, body: str, attachments: list | None, sender: str):
    providers = [
        ("Resend", os.environ.get("RESEND_API_KEY"), _send_resend_email),
        ("Brevo", os.environ.get("BREVO_API_KEY") or os.environ.get("SENDINBLUE_API_KEY"), _send_brevo_email),
        ("SendGrid", os.environ.get("SENDGRID_API_KEY"), _send_sendgrid_email),
    ]
    preferred = (os.environ.get("EMAIL_PROVIDER") or "").strip().lower()
    if preferred:
        providers.sort(key=lambda item: 0 if item[0].lower() == preferred else 1)

    errors = []
    for name, api_key, fn in providers:
        if not api_key:
            continue
        try:
            status, text = await asyncio.to_thread(fn, api_key, to_email, subject, body, attachments, sender)
            if 200 <= status < 300:
                logging.info("Email sent via %s API to %s", name, to_email)
                return True, f"Sent via {name}"
            errors.append(f"{name} API returned {status}: {text[:250]}")
        except Exception as exc:
            errors.append(f"{name} API failed ({type(exc).__name__}: {exc})")
            logging.warning("Email API provider %s failed: %s", name, exc)

    if errors:
        return False, "; ".join(errors)
    return False, "No HTTPS email provider configured. Set RESEND_API_KEY, BREVO_API_KEY, or SENDGRID_API_KEY."

def _send_vercel_relay(url: str, payload: dict):
    return _post_json(url, payload, timeout=12)

async def send_email(to_email: str, subject: str, body: str, attachments: list = None) -> bool:
    """Send email through an HTTPS email API first, with legacy SMTP fallbacks."""
    try:
        from email.mime.base import MIMEBase
        from email import encoders
    except ImportError:
        return False, "Failed to import email modules"

    smtp_host = os.environ.get('SMTP_HOST', '')
    smtp_port = int(os.environ.get('SMTP_PORT', 587))
    smtp_user = os.environ.get('SMTP_USER', '')
    smtp_pass = os.environ.get('SMTP_PASS', '').replace(' ', '')
    smtp_from = os.environ.get('SMTP_FROM', smtp_user)
    sender = _email_from_address(smtp_from or smtp_user)
    is_production = os.environ.get('ENVIRONMENT') == 'production'

    api_sent, api_msg = await _send_via_email_api(to_email, subject, body, attachments, sender)
    if api_sent:
        return True, api_msg
    logging.warning("HTTPS email API unavailable/failed: %s", api_msg)
    
    if not all([smtp_host, smtp_user, smtp_pass]) or "example.com" in smtp_host:
        logging.warning("SMTP not configured. Host=%s User=%s PassLen=%d", smtp_host, smtp_user, len(smtp_pass))
        if is_production:
            return False, f"{api_msg} SMTP not configured or placeholder values detected on production."
        logging.info("--- MOCK EMAIL ---  To: %s  Subject: %s", to_email, subject)
        return True, "Mock Sent"

    # Route 1: Try high-deliverability Vercel HTTPS SMTP Relay (never blocked by Render)
    try:
        vercel_url = "https://durgashakti-foils.vercel.app/api/send-email.js"
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

    sent, err_msg = await asyncio.to_thread(_send_direct_smtp, smtp_host, smtp_port, smtp_user, smtp_pass, msg)
    if sent:
        return True, "Sent"
    
    full_err = f"Vercel Relay failed. " + err_msg
    return False, full_err


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
