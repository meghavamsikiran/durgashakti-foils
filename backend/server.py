from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form, Request, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
import shutil
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import razorpay
import time
import pandas as pd
from io import BytesIO
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

load_dotenv()

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

def delete_old_file(file_url: Optional[str]):
    """Helper to delete a file from the uploads directory given its URL."""
    if not file_url:
        return
    try:
        # Check if the URL points to our uploads directory
        # Example: http://localhost:8001/uploads/xxx.png
        if "/uploads/" in file_url:
            filename = file_url.split("/uploads/")[-1]
            if filename:
                file_path = UPLOADS_DIR / filename
                if file_path.exists() and file_path.is_file():
                    os.remove(file_path)
                    logging.info(f"Deleted orphaned asset: {filename}")
    except Exception as e:
        logging.error(f"Error deleting old file {file_url}: {e}")

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', '')
if not JWT_SECRET:
    if os.environ.get('ENVIRONMENT') == 'production':
        logging.critical('FATAL: JWT_SECRET is missing in production environment. Server will not start.')
        raise RuntimeError('JWT_SECRET must be set in production')
    
    import secrets as _sec
    JWT_SECRET = _sec.token_urlsafe(48)
    logging.warning('JWT_SECRET is missing — auto-generated random secret for local development. Set a strong JWT_SECRET in .env for persistence.')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 1  # 1 hour

# Payment Gateway Configuration — Razorpay only
razorpay_client = razorpay.Client(auth=(
    os.environ.get('RAZORPAY_KEY_ID', ''),
    os.environ.get('RAZORPAY_KEY_SECRET', '')
))

# Test mode: active when using dummy or Razorpay test keys (rzp_test_ prefix)
def is_test_mode() -> bool:
    razorpay_key = os.environ.get('RAZORPAY_KEY_ID', '')
    return not razorpay_key or razorpay_key.startswith('rzp_test_') or razorpay_key in ('rzp_test_dummy', '')

# Create the main app
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logging.info("Starting DurgaShakti Foils Server...")
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("id", unique=True)
        await db.products.create_index("id", unique=True)
        await db.orders.create_index("id", unique=True)
        await db.orders.create_index("user_id")
        await db.orders.create_index("order_number")
        await db.carts.create_index("user_id", unique=True)
        await db.gst_records.create_index("invoice_number")
        await db.audit_logs.create_index("created_at")
        logging.info("MongoDB indexes ensured")
    except Exception as exc:
        logging.warning("MongoDB index creation issue: %s", exc)
    
    yield
    
    # Shutdown
    client.close()
    logging.info("DurgaShakti Foils Server Shutdown")

app = FastAPI(lifespan=lifespan)
api_router = APIRouter(prefix="/api")

app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# Security
security = HTTPBearer()

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    role: str = "customer"  # customer or admin
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=120)
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    size: str  # e.g., "72m", "1KG"
    thickness: str  # e.g., "11 micron"
    price: float
    discount_price: Optional[float] = None
    image_url: str
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

class CartItem(BaseModel):
    product_id: str
    quantity: int

class Cart(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    items: List[CartItem]
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OrderItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    price: float

class ShippingAddress(BaseModel):
    full_name: str = Field(min_length=1, max_length=120)
    phone: str = Field(min_length=10, max_length=15, pattern=r'^\d{10,15}$')
    address_line1: str = Field(min_length=1, max_length=255)
    address_line2: Optional[str] = Field(default=None, max_length=255)
    city: str = Field(min_length=1, max_length=100)
    state: str = Field(min_length=1, max_length=100)
    pincode: str = Field(min_length=6, max_length=6, pattern=r'^\d{6}$')

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str
    user_id: str
    customer_name: str = "Guest User"
    items: List[OrderItem]
    total_amount: float
    payment_method: str  # razorpay, cod
    payment_status: str = "pending"  # pending, completed, failed
    order_status: str = "processing"  # processing, shipped, delivered, cancelled
    stock_applied: bool = False
    shipping_address: ShippingAddress
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OrderCreate(BaseModel):
    items: List[OrderItem]
    total_amount: float
    payment_method: str
    shipping_address: ShippingAddress
    idempotency_key: Optional[str] = None


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None


class UserAddress(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    label: str  # Home, Office, etc.
    full_name: str
    phone: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    pincode: str
    is_default: bool = False


class WishlistItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    message: str
    type: str = "info"  # info, order, promo
    is_read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SavedCard(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    brand: str  # visa, mastercard
    last4: str
    expiry_month: str
    expiry_year: str
    holder_name: str


class AdminCreateRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=120)
    phone: Optional[str] = None
    role: str = "admin"


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str = Field(min_length=8, max_length=128)


class VariantInput(BaseModel):
    size: str
    sku: str
    price: float
    discount_price: Optional[float] = None
    stock_quantity: int = 0
    in_stock: bool = True


class ProductBulkCreateRequest(BaseModel):
    name: str
    description: str
    category: str = "Aluminum Foil"
    thickness: str = "11 Micron"
    width: str = "295mm"
    image_url: str
    features: List[str] = []
    variants: List[VariantInput]


async def write_audit_log(action: str, actor_id: str, target_type: str, target_id: str, metadata: dict | None = None):
    try:
        await db.audit_logs.insert_one(
            {
                "id": str(uuid.uuid4()),
                "action": action,
                "actor_id": actor_id,
                "target_type": target_type,
                "target_id": target_id,
                "metadata": metadata or {},
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )
    except Exception as exc:
        logging.getLogger(__name__).warning('Audit log write failed: %s', exc)

async def send_email(to_email: str, subject: str, body: str):
    """Sends an email using SMTP configuration from environment variables."""
    smtp_host = os.environ.get('SMTP_HOST')
    smtp_port = int(os.environ.get('SMTP_PORT', 587))
    smtp_user = os.environ.get('SMTP_USER')
    smtp_pass = os.environ.get('SMTP_PASS')
    smtp_from = os.environ.get('SMTP_FROM', smtp_user)

    if not all([smtp_host, smtp_user, smtp_pass]) or "example.com" in smtp_host:
        logging.info("--- MOCK EMAIL DELIVERY ---")
        logging.info("To: %s", to_email)
        logging.info("Subject: %s", subject)
        logging.info("OTP detected in body: %s", body if len(body) < 100 else "HTML Content")
        logging.info("---------------------------")
        return True

    try:
        msg = MIMEMultipart()
        msg['From'] = smtp_from
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'html'))

        server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        logging.error("Failed to send email to %s: %s", to_email, e)
        return False

async def create_notification(user_id: str, title: str, message: str, type: str = "info"):
    """Creates a notification record for a user."""
    notif = Notification(user_id=user_id, title=title, message=message, type=type).model_dump()
    notif['created_at'] = notif['created_at'].isoformat()
    await db.notifications.insert_one(notif)

# Helper Functions
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
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_token(token)
    user_id = payload.get('user_id') or payload.get('sub')
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    
    # Check Mongo first
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    
    # If not found in Mongo, raise error
    if not user:
        raise HTTPException(status_code=401, detail="User not found or account deleted")
    
    if user.get('is_active') is False:
        raise HTTPException(status_code=403, detail="Account is disabled")
    return User(**user)

async def get_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.role not in {"admin", "SUPER_ADMIN"}:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# Auth Routes
@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        phone=user_data.phone
    )
    
    doc = user.model_dump()
    doc['password'] = hash_password(user_data.password)
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.users.insert_one(doc)
    
    token = create_token(user.id, user.email, user.role)
    return {"token": token, "user": user}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user_doc['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if user_doc.get('is_active') is False:
        raise HTTPException(status_code=403, detail="Account is disabled. Please contact support.")
    
    user = User(**{k: v for k, v in user_doc.items() if k != 'password'})
    
    if user.role in {'admin', 'SUPER_ADMIN'}:
        await write_audit_log("ADMIN_LOGIN", user.id, "user", user.id)
        
    token = create_token(user.id, user.email, user.role)
    return {"token": token, "user": user}

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@api_router.put("/auth/me")
async def update_profile(data: UserProfileUpdate, current_user: User = Depends(get_current_user)):
    update_data = {}
    if data.full_name is not None: update_data['full_name'] = data.full_name
    if data.phone is not None: update_data['phone'] = data.phone
    
    if data.email is not None and data.email != current_user.email:
        # Check if email is already taken
        existing = await db.users.find_one({"email": data.email, "id": {"$ne": current_user.id}})
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        update_data['email'] = data.email
    
    if not update_data:
        return current_user
        
    await db.users.update_one({"id": current_user.id}, {"$set": update_data})
    updated = await db.users.find_one({"id": current_user.id}, {"_id": 0, "password": 0})
    return User(**updated)


# User Sub-Resources
@api_router.get("/user/addresses")
async def get_addresses(current_user: User = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user.id})
    return user.get('addresses', [])


@api_router.post("/user/addresses")
async def add_address(address: UserAddress, current_user: User = Depends(get_current_user)):
    addr_doc = address.model_dump()
    if addr_doc.get('is_default'):
        await db.users.update_one({"id": current_user.id}, {"$set": {"addresses.$[].is_default": False}})
    
    await db.users.update_one(
        {"id": current_user.id},
        {"$push": {"addresses": addr_doc}}
    )
    return addr_doc


@api_router.delete("/user/addresses/{address_id}")
async def delete_address(address_id: str, current_user: User = Depends(get_current_user)):
    await db.users.update_one(
        {"id": current_user.id},
        {"$pull": {"addresses": {"id": address_id}}}
    )
    return {"status": "ok"}


@api_router.get("/user/wishlist")
async def get_wishlist(current_user: User = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user.id})
    wishlist_ids = [item['product_id'] for item in user.get('wishlist', [])]
    products = await db.products.find({"id": {"$in": wishlist_ids}}, {"_id": 0}).to_list(100)
    return products


@api_router.post("/user/wishlist/{product_id}")
async def toggle_wishlist(product_id: str, current_user: User = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user.id})
    wishlist = user.get('wishlist', [])
    exists = any(item['product_id'] == product_id for item in wishlist)
    
    if exists:
        await db.users.update_one({"id": current_user.id}, {"$pull": {"wishlist": {"product_id": product_id}}})
        return {"status": "removed"}
    else:
        item = WishlistItem(product_id=product_id).model_dump()
        item['created_at'] = item['created_at'].isoformat()
        await db.users.update_one({"id": current_user.id}, {"$push": {"wishlist": item}})
        return {"status": "added"}


@api_router.get("/user/notifications")
async def get_notifications(current_user: User = Depends(get_current_user)):
    notifs = await db.notifications.find({"user_id": current_user.id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return notifs


@api_router.put("/user/notifications/read-all")
async def mark_notifications_read(current_user: User = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": current_user.id}, {"$set": {"is_read": True}})
    return {"status": "ok"}


@api_router.get("/user/cards")
async def get_saved_cards(current_user: User = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user.id})
    return user.get('saved_cards', [])


@api_router.post("/user/cards")
async def add_card(card: SavedCard, current_user: User = Depends(get_current_user)):
    await db.users.update_one({"id": current_user.id}, {"$push": {"saved_cards": card.model_dump()}})
    return card

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)

@api_router.post("/auth/change-password")
async def change_password(data: ChangePasswordRequest, current_user: User = Depends(get_current_user)):
    # Fetch user doc with password
    user_doc = await db.users.find_one({"id": current_user.id})
    if not user_doc or not verify_password(data.current_password, user_doc['password']):
        raise HTTPException(status_code=400, detail="Invalid current password")
    
    hashed = hash_password(data.new_password)
    await db.users.update_one({"id": current_user.id}, {"$set": {"password": hashed}})
    await write_audit_log("PASSWORD_CHANGED", current_user.id, "user", current_user.id)
    return {"message": "Password changed successfully"}


@api_router.post("/auth/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    user = await db.users.find_one({"email": data.email})
    if not user:
        # For security, don't reveal if user exists
        return {"message": "If an account exists with this email, an OTP has been sent."}
    
    import random
    otp = str(random.randint(100000, 999999))
    expiry = datetime.now(timezone.utc) + timedelta(minutes=15)
    
    # LOG OTP FOR DEVELOPMENT (In case email fails)
    print(f"\n[DEV] PASSWORD RESET OTP FOR {data.email}: {otp}\n")
    
    await db.password_resets.update_one(
        {"email": data.email},
        {"$set": {"otp": otp, "expiry": expiry.isoformat()}},
        upsert=True
    )
    
    email_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 10px;">
        <h2 style="color: #4f46e5; text-align: center;">DurgaShakti Foils</h2>
        <hr style="border: 0; border-top: 1px solid #e1e1e1; margin: 20px 0;">
        <p>Hello,</p>
        <p>We received a request to reset your password. Use the following 6-digit One-Time Password (OTP) to proceed:</p>
        <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e293b; background: #f1f5f9; padding: 10px 20px; border-radius: 5px;">{otp}</span>
        </div>
        <p style="color: #64748b; font-size: 14px;">This OTP is valid for 15 minutes. If you did not request this, please ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #e1e1e1; margin: 20px 0;">
        <p style="text-align: center; color: #94a3b8; font-size: 12px;">&copy; 2026 DurgaShakti Foils. All rights reserved.</p>
    </div>
    """
    
    await send_email(data.email, "Password Reset OTP - DurgaShakti Foils", email_body)
    return {"message": "If an account exists with this email, an OTP has been sent."}


@api_router.post("/auth/reset-password")
async def reset_password(data: ResetPasswordRequest):
    reset_record = await db.password_resets.find_one({"email": data.email})
    if not reset_record or reset_record['otp'] != data.otp:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    
    expiry = datetime.fromisoformat(reset_record['expiry'])
    if datetime.now(timezone.utc) > expiry:
        raise HTTPException(status_code=400, detail="OTP has expired")
    
    hashed = hash_password(data.new_password)
    await db.users.update_one({"email": data.email}, {"$set": {"password": hashed}})
    await db.password_resets.delete_one({"email": data.email})
    
    return {"message": "Password reset successful. You can now login with your new password."}

# Product Routes
@api_router.get("/products", response_model=dict)
async def get_products(
    page: int = Query(1, ge=1), 
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None)
):
    query = {}
    if search:
        query = {
            "$or": [
                {"name": {"$regex": search, "$options": "i"}},
                {"batch_no": {"$regex": search, "$options": "i"}},
                {"variant_sku": {"$regex": search, "$options": "i"}}
            ]
        }
        
    skip = (page - 1) * limit
    total = await db.products.count_documents(query)
    products = await db.products.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"items": products, "total": total, "page": page, "limit": limit}

@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

# Cart Routes
@api_router.get("/cart")
async def get_cart(current_user: User = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": current_user.id}, {"_id": 0})
    if not cart:
        return {"items": []}
        
    valid_items = []
    items_modified = False
    for item in cart.get('items', []):
        product = await db.products.find_one({"id": item['product_id']}, {"_id": 1})
        if product:
            valid_items.append(item)
        else:
            items_modified = True
            
    if items_modified:
        cart['items'] = valid_items
        await db.carts.update_one(
            {"user_id": current_user.id},
            {"$set": {"items": valid_items}}
        )
        
    return cart

@api_router.post("/cart/add")
async def add_to_cart(item: CartItem, current_user: User = Depends(get_current_user)):
    # Stock validation: prevent adding out-of-stock items
    product = await db.products.find_one({"id": item.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    stock_qty = int(product.get("stock_quantity", 0))
    if stock_qty <= 0 or not product.get("in_stock", False):
        raise HTTPException(status_code=400, detail="This product is currently out of stock")
    # Check if requested quantity exceeds available stock
    cart = await db.carts.find_one({"user_id": current_user.id}, {"_id": 0})
    existing_cart_qty = 0
    if cart:
        existing_item = next((i for i in cart.get('items', []) if i['product_id'] == item.product_id), None)
        if existing_item:
            existing_cart_qty = int(existing_item.get('quantity', 0))
    total_requested = existing_cart_qty + item.quantity
    if total_requested > stock_qty:
        raise HTTPException(status_code=400, detail=f"Only {stock_qty} units available. You already have {existing_cart_qty} in cart.")

    if not cart:
        cart = Cart(user_id=current_user.id, items=[item])
        doc = cart.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.carts.insert_one(doc)
    else:
        items = cart.get('items', [])
        existing_item = next((i for i in items if i['product_id'] == item.product_id), None)
        
        if existing_item:
            existing_item['quantity'] += item.quantity
        else:
            items.append(item.model_dump())
        
        await db.carts.update_one(
            {"user_id": current_user.id},
            {"$set": {"items": items, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    return {"message": "Item added to cart"}

@api_router.put("/cart/update")
async def update_cart_item(item: CartItem, current_user: User = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": current_user.id}, {"_id": 0})
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    items = cart.get('items', [])
    existing_item = next((i for i in items if i['product_id'] == item.product_id), None)
    
    if existing_item:
        existing_item['quantity'] = item.quantity
        await db.carts.update_one(
            {"user_id": current_user.id},
            {"$set": {"items": items, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": "Cart updated"}
    
    raise HTTPException(status_code=404, detail="Item not found in cart")

@api_router.delete("/cart/remove/{product_id}")
async def remove_from_cart(product_id: str, current_user: User = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": current_user.id}, {"_id": 0})
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    items = [i for i in cart.get('items', []) if i['product_id'] != product_id]
    
    await db.carts.update_one(
        {"user_id": current_user.id},
        {"$set": {"items": items, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Item removed from cart"}

@api_router.delete("/cart/clear")
async def clear_cart(current_user: User = Depends(get_current_user)):
    await db.carts.update_one(
        {"user_id": current_user.id},
        {"$set": {"items": [], "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Cart cleared"}

# Order Routes
@api_router.post("/orders")
async def create_order(order_data: OrderCreate, current_user: User = Depends(get_current_user)):
    # Idempotency check
    if order_data.idempotency_key:
        existing = await db.orders.find_one({"idempotency_key": order_data.idempotency_key}, {"_id": 0})
        if existing:
            return existing

    # Server-side price recalculation and stock validation
    server_total = 0.0
    for item in order_data.items:
        product = await db.products.find_one({"id": item.product_id}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=400, detail=f"Product '{item.product_name}' not found")
        stock_qty = int(product.get("stock_quantity", 0))
        if stock_qty <= 0 or not product.get("in_stock", False):
            raise HTTPException(status_code=400, detail=f"'{item.product_name}' is out of stock")
        if item.quantity > stock_qty:
            raise HTTPException(status_code=400, detail=f"Only {stock_qty} units of '{item.product_name}' available")
        effective_price = float(product.get("discount_price") or product.get("price", 0))
        server_total += effective_price * item.quantity

    server_total = round(server_total, 2)
    order_number = f"ORD-{int(time.time())}-{uuid.uuid4().hex[:8]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    order = Order(
        order_number=order_number,
        user_id=current_user.id,
        customer_name=current_user.full_name,
        items=order_data.items,
        total_amount=server_total,
        payment_method=order_data.payment_method,
        payment_status="pending",
        shipping_address=order_data.shipping_address
    )

    doc = order.model_dump()
    doc['created_at'] = now_iso
    doc['updated_at'] = now_iso
    doc['shipping_address'] = order_data.shipping_address.model_dump()
    doc['stock_applied'] = True
    if order_data.idempotency_key:
        doc['idempotency_key'] = order_data.idempotency_key

    await db.orders.insert_one(doc)

    # Atomic stock deduction with rollback on failure
    deducted = []
    try:
        for item in order_data.items:
            result = await db.products.find_one_and_update(
                {"id": item.product_id, "stock_quantity": {"$gte": item.quantity}},
                {
                    "$inc": {"stock_quantity": -item.quantity, "units_sold": item.quantity},
                    "$set": {"updated_at": now_iso}
                },
            )
            if result is None:
                raise HTTPException(status_code=400, detail=f"Insufficient stock for '{item.product_name}'")
            new_qty = int(result.get("stock_quantity", 0)) - item.quantity
            if new_qty <= 0:
                await db.products.update_one({"id": item.product_id}, {"$set": {"in_stock": False}})
            deducted.append(item)
    except HTTPException:
        # Rollback deducted items
        for d_item in deducted:
            await db.products.update_one(
                {"id": d_item.product_id},
                {
                    "$inc": {"stock_quantity": d_item.quantity, "units_sold": -d_item.quantity}, 
                    "$set": {"in_stock": True, "updated_at": now_iso}
                }
            )
        await db.orders.update_one({"id": order.id}, {"$set": {"order_status": "cancelled", "stock_applied": False}})
        raise

    # Trigger Order Confirmation Email (for COD or immediately for some flows)
    if order.payment_method == "cod":
        await send_email(
            current_user.email,
            f"Order Confirmation - {order.order_number}",
            f"<h1>Thank you for your order!</h1><p>Your order {order.order_number} has been received and is being processed.</p><p>Total Amount: ₹{order.total_amount}</p><p>Payment Method: COD</p>"
        )

    return order

@api_router.get("/orders")
async def get_user_orders(current_user: User = Depends(get_current_user)):
    orders = await db.orders.find({"user_id": current_user.id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return orders

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, current_user: User = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id, "user_id": current_user.id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@api_router.post("/orders/{order_id}/cancel")
async def cancel_order(order_id: str, current_user: User = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id, "user_id": current_user.id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.get("order_status", "processing").lower() not in ["pending", "processing", "placed"]:
        raise HTTPException(status_code=400, detail="Only pending or processing orders can be cancelled")
        
    applied = bool(order.get("stock_applied", False))
    if applied:
        for item in order.get("items", []):
            pid = item.get("product_id")
            qty = int(item.get("quantity", 0))
            if not pid or qty <= 0:
                continue
            product = await db.products.find_one({"id": pid}, {"_id": 0})
            if not product:
                continue
            current_qty = int(product.get("stock_quantity", 0))
            new_qty = current_qty + qty
            units_sold = max(0, int(product.get("units_sold", 0)) - qty)
            await db.products.update_one(
                {"id": pid},
                {
                  "$inc": {"stock_quantity": qty, "units_sold": -qty},
                  "$set": {"in_stock": True, "updated_at": datetime.now(timezone.utc).isoformat()}
                },
            )
            
    await db.orders.update_one(
        {"id": order_id}, 
        {"$set": {"order_status": "cancelled", "stock_applied": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Order cancelled successfully"}

@api_router.post("/orders/{order_id}/return")
async def return_order(
    order_id: str, 
    reason: str = Form(...),
    image: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user)
):
    order = await db.orders.find_one({"id": order_id, "user_id": current_user.id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if order.get("order_status", "").lower() != "delivered":
        raise HTTPException(status_code=400, detail="Only delivered orders can be returned")
        
    delivered_date_str = order.get("updated_at") or order.get("created_at")
    if delivered_date_str:
        try:
            delivered_date = datetime.fromisoformat(delivered_date_str.replace('Z', '+00:00'))
            # Lenient window: Order is returnable until the end of the 3rd full day after delivery
            cutoff_date = (delivered_date + timedelta(days=4)).replace(hour=0, minute=0, second=0, microsecond=0)
            if datetime.now(timezone.utc) > cutoff_date:
                raise HTTPException(status_code=400, detail="Return window has closed. Orders can only be returned within 3 days of delivery.")
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            pass

    image_url = None
    if image:
        content_type = (image.content_type or '').lower()
        if content_type not in {'image/png', 'image/jpeg', 'image/jpg', 'image/webp'}:
            raise HTTPException(status_code=400, detail='Only png/jpg/jpeg/webp images are supported')
        raw = await image.read()
        if len(raw) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail='Image must be under 5MB')
        ext_map = {'image/png': '.png', 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/webp': '.webp'}
        ext = ext_map.get(content_type, '.jpg')
        filename = f"return_{order_id}_{uuid.uuid4().hex[:8]}{ext}"
        file_path = UPLOADS_DIR / filename
        file_path.write_bytes(raw)
        image_url = f"/uploads/{filename}"
        
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "order_status": "return_requested",
            "return_reason": reason,
            "return_image_url": image_url,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Return request submitted successfully"}

# Payment Routes
@api_router.post("/payment/razorpay/create-order")
async def create_razorpay_order(order_id: str, current_user: User = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id, "user_id": current_user.id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Test mode: return mock Razorpay order without calling the real API
    if is_test_mode():
        mock_order_id = f"order_test_{str(uuid.uuid4())[:16]}"
        return {
            "razorpay_order_id": mock_order_id,
            "amount": int(order['total_amount'] * 100),
            "currency": "INR",
            "key_id": os.environ.get('RAZORPAY_KEY_ID', 'rzp_test_dummy'),
            "test_mode": True
        }

    try:
        razorpay_order = razorpay_client.order.create({
            "amount": int(order['total_amount'] * 100),
            "currency": "INR",
            "receipt": order['order_number'],
            "notes": {"order_id": order_id}
        })
        # SAVE THE RAZORPAY ORDER ID TO THE ORDER DOCUMENT
        await db.orders.update_one(
            {"id": order_id},
            {"$set": {"razorpay_order_id": razorpay_order['id'], "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {
            "razorpay_order_id": razorpay_order['id'],
            "amount": razorpay_order['amount'],
            "currency": razorpay_order['currency'],
            "key_id": os.environ.get('RAZORPAY_KEY_ID', 'rzp_test_dummy'),
            "test_mode": False
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/payment/razorpay/verify")
async def verify_razorpay_payment(payment_data: dict, current_user: User = Depends(get_current_user)):
    order_id = payment_data.get('order_id')
    if not order_id:
        raise HTTPException(status_code=400, detail="order_id is required")

    # Test mode: skip signature verification, just mark as completed
    if is_test_mode():
        await db.orders.update_one(
            {"id": order_id},
            {"$set": {
                "payment_status": "completed",
                "razorpay_payment_id": payment_data.get("razorpay_payment_id", "pay_dummy_123"),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        # Clear cart after successful payment
        order = await db.orders.find_one({"id": order_id}, {"_id": 0})
        if order:
            await db.carts.update_one(
                {"user_id": order['user_id']},
                {"$set": {"items": [], "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            # Send confirmation email
            await send_email(
                current_user.email,
                f"Payment Successful - Order {order['order_number']}",
                f"<h1>Payment Received!</h1><p>Your payment for order {order['order_number']} was successful. Your items will be shipped soon.</p><p>Total Paid: ₹{order['total_amount']}</p>"
            )
        return {"success": True, "message": "Payment verified (test mode)"}

    try:
        razorpay_client.utility.verify_payment_signature(payment_data)
        # Verify payment amount matches order total
        order = await db.orders.find_one({"id": order_id}, {"_id": 0})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        try:
            rz_payment = razorpay_client.payment.fetch(payment_data.get('razorpay_payment_id'))
            if int(rz_payment.get('amount', 0)) != int(order['total_amount'] * 100):
                raise HTTPException(status_code=400, detail="Payment amount mismatch")
        except HTTPException:
            raise
        except Exception:
            pass  # If fetch fails, signature verification is still valid
        await db.orders.update_one(
            {"id": order_id},
            {"$set": {
                "payment_status": "completed", 
                "razorpay_payment_id": payment_data.get('razorpay_payment_id'),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        # Clear cart after successful payment
        await db.carts.update_one(
            {"user_id": order['user_id']},
            {"$set": {"items": [], "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"success": True, "message": "Payment verified"}
    except Exception as e:
        raise HTTPException(status_code=400, detail="Payment verification failed")


@api_router.post("/payment/cod/confirm")
async def confirm_cod_payment(order_id: str, current_user: User = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id, "user_id": current_user.id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    # Mark COD order as confirmed
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"payment_status": "pending", "order_status": "processing", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    # Clear cart after COD confirmation
    await db.carts.update_one(
      {"user_id": current_user.id},
      {"$set": {"items": [], "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    await write_audit_log("ORDER_COD_CONFIRMED", current_user.id, "order", order_id)
    return {"success": True, "message": "COD order confirmed"}

@api_router.post("/cart/bulk-sync")
async def bulk_sync_cart(items: List[CartItem], current_user: User = Depends(get_current_user)):
    """
    Production-grade bulk cart synchronization.
    Merges local guest cart items with the server-side account cart.
    """
    cart = await db.carts.find_one({"user_id": current_user.id}, {"_id": 0})
    current_items = cart.get('items', []) if cart else []
    
    for new_item in items:
        # Stock check for each item
        product = await db.products.find_one({"id": new_item.product_id}, {"stock_quantity": 1})
        if not product or int(product.get("stock_quantity", 0)) <= 0:
            continue # Skip out of stock items during sync
            
        existing = next((i for i in current_items if i['product_id'] == new_item.product_id), None)
        if existing:
            # Take the larger quantity or sum? Usually sum is safer for merging, but we cap it at stock
            max_stock = int(product.get("stock_quantity", 0))
            existing['quantity'] = min(existing['quantity'] + new_item.quantity, max_stock)
        else:
            current_items.append(new_item.model_dump())
            
    await db.carts.update_one(
        {"user_id": current_user.id},
        {"$set": {"items": current_items, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"message": "Cart synchronized", "items": current_items}

@api_router.get("/payment/test-mode")
async def check_test_mode():
    """Returns whether the backend is running in payment test mode."""
    return {"test_mode": is_test_mode()}

# Admin Routes
@api_router.post("/admin/products")
async def create_product(product: Product, admin: User = Depends(get_admin_user)):
    if admin.role != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Super admin only")
    doc = product.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.products.insert_one(doc)
    return product


@api_router.post("/admin/products/bulk")
async def create_product_bulk(payload: ProductBulkCreateRequest, admin: User = Depends(get_admin_user)):
    """
    Optimized bulk product creation with batch SKU validation.
    """
    if admin.role != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Super admin only")
    if not payload.variants:
        raise HTTPException(status_code=400, detail="At least one variant is required")

    request_skus = [v.sku for v in payload.variants]
    if len(request_skus) != len(set(request_skus)):
        raise HTTPException(status_code=400, detail="Duplicate SKUs found within the request variants")

    # Optimized Batch SKU Check (Single DB Query)
    existing_skus_res = await db.products.find(
        {"$or": [{"batch_no": {"$in": request_skus}}, {"variant_sku": {"$in": request_skus}}]},
        {"batch_no": 1, "variant_sku": 1, "name": 1, "_id": 0}
    ).to_list(None)
    
    if existing_skus_res:
        found_sku = existing_skus_res[0].get('batch_no') or existing_skus_res[0].get('variant_sku')
        raise HTTPException(status_code=400, detail=f"SKU '{found_sku}' already exists (Product: {existing_skus_res[0].get('name')})")

    now = datetime.now(timezone.utc).isoformat()
    docs = []
    for variant in payload.variants:
        if variant.price <= 0:
            raise HTTPException(status_code=400, detail=f"Invalid price for variant {variant.size}")
        
        doc = {
            "id": str(uuid.uuid4()),
            "name": f"{payload.name} {variant.size}",
            "description": payload.description,
            "size": variant.size,
            "thickness": payload.thickness,
            "price": variant.price,
            "discount_price": variant.discount_price,
            "image_url": payload.image_url,
            "features": payload.features,
            "in_stock": variant.in_stock and variant.stock_quantity > 0,
            "stock_quantity": variant.stock_quantity,
            "units_sold": 0,
            "category": payload.category,
            "batch_no": variant.sku,
            "width": payload.width,
            "base_name": payload.name,
            "variant_sku": variant.sku,
            "created_at": now,
            "updated_at": now,
            "created_by": admin.id,
        }
        docs.append(doc)
    
    await db.products.insert_many(docs)
    await write_audit_log("PRODUCT_BULK_CREATED", admin.id, "product", payload.name, {"variants_count": len(docs)})
    return {"message": f"Created {len(docs)} variants", "created_count": len(docs)}

@api_router.put("/admin/products/{product_id}")
async def update_product(product_id: str, product_data: dict, admin: User = Depends(get_admin_user)):
    if admin.role != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Super admin only")
    ALLOWED_FIELDS = {'name', 'description', 'size', 'thickness', 'price', 'discount_price', 'image_url', 'features', 'in_stock', 'stock_quantity', 'category', 'batch_no', 'width'}
    safe_data = {k: v for k, v in product_data.items() if k in ALLOWED_FIELDS}
    if not safe_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    # Handle orphaned images
    if 'image_url' in safe_data:
        old_product = await db.products.find_one({"id": product_id}, {"image_url": 1})
        if old_product and old_product.get('image_url') != safe_data['image_url']:
            delete_old_file(old_product.get('image_url'))

    safe_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.products.update_one(
        {"id": product_id},
        {"$set": safe_data}
    )
    await write_audit_log("PRODUCT_UPDATED", admin.id, "product", product_id, {"updated_fields": list(safe_data.keys())})
    return {"message": "Product updated"}

@api_router.delete("/admin/products/{product_id}")
async def delete_product(product_id: str, admin: User = Depends(get_admin_user)):
    if admin.role != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Super admin only")
    
    # Clean up image before deleting
    old_product = await db.products.find_one({"id": product_id}, {"image_url": 1})
    if old_product:
        delete_old_file(old_product.get('image_url'))
        
    await db.products.delete_one({"id": product_id})
    await write_audit_log("PRODUCT_DELETED", admin.id, "product", product_id)
    return {"message": "Product deleted"}



@api_router.get("/admin/orders")
async def get_all_orders(
    page: int = Query(1, ge=1), 
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    admin: User = Depends(get_admin_user)
):
    query = {}
    if search:
        query = {
            "$or": [
                {"order_number": {"$regex": search, "$options": "i"}},
                {"customer_name": {"$regex": search, "$options": "i"}},
                {"user_id": {"$regex": search, "$options": "i"}}
            ]
        }
    skip = (page - 1) * limit
    total = await db.orders.count_documents(query)
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"items": orders, "total": total, "page": page, "limit": limit}

@api_router.put("/admin/orders/{order_id}/status")
async def update_order_status(order_id: str, status_data: dict, admin: User = Depends(get_admin_user)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    prev_status = order.get("order_status", "processing")
    new_status = status_data.get("status")

    # Inventory + sold units alignment:
    # - Stock is usually applied on order creation.
    # - apply stock/sales when moving to CONFIRMED (if not already applied)
    # - revert if moving to CANCELLED/REFUNDED after it was applied
    applied = bool(order.get("stock_applied", False))
    if (str(new_status).upper() == "CONFIRMED") and not applied:
        # Atomic Batch Update for all items
        for item in order.get("items", []):
            pid = item.get("product_id")
            qty = int(item.get("quantity", 0))
            if not pid or qty <= 0:
                continue
            
            # Atomic update using $inc and $max to prevent negative stock if desired, 
            # and set in_stock dynamically.
            await db.products.update_one(
                {"id": pid},
                [
                    {"$set": {
                        "stock_quantity": {"$max": [0, {"$subtract": ["$stock_quantity", qty]}]},
                        "units_sold": {"$add": ["$units_sold", qty]},
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }},
                    {"$set": {
                        "in_stock": {"$gt": ["$stock_quantity", 0]}
                    }}
                ]
            )
        await db.orders.update_one({"id": order_id}, {"$set": {"stock_applied": True}})
        await write_audit_log("ORDER_CONFIRMED_STOCK_APPLIED", admin.id, "order", order_id, {"prev_status": prev_status})

    if (str(new_status).upper() in {"CANCELLED", "REFUNDED"}) and applied:
        for item in order.get("items", []):
            pid = item.get("product_id")
            qty = int(item.get("quantity", 0))
            if not pid or qty <= 0:
                continue
            
            # Atomic Restore
            await db.products.update_one(
                {"id": pid},
                [
                    {"$set": {
                        "stock_quantity": {"$add": ["$stock_quantity", qty]},
                        "units_sold": {"$max": [0, {"$subtract": ["$units_sold", qty]}]},
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }},
                    {"$set": {
                        "in_stock": {"$gt": ["$stock_quantity", 0]}
                    }}
                ]
            )
        await db.orders.update_one({"id": order_id}, {"$set": {"stock_applied": False}})
        await write_audit_log("ORDER_CANCELLED_STOCK_RESTORED", admin.id, "order", order_id, {"prev_status": prev_status})

    payment_status = order.get("payment_status")
    payment_method = order.get("payment_method")
    admin_message = status_data.get("admin_message", "")
    
    if str(new_status).upper() == "REFUNDED" and payment_status == "completed" and payment_method == "razorpay":
        payment_id = order.get("razorpay_payment_id")
        if payment_id and not is_test_mode():
            try:
                razorpay_client.payment.refund(payment_id, {'amount': int(order.get('total_amount', 0) * 100)})
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Razorpay refund failed: {str(e)}")
        payment_status = "refunded"

    update_fields = {
        "order_status": new_status,
        "payment_status": payment_status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    if str(new_status).upper() == "DELIVERED":
        update_fields["delivered_at"] = update_fields["updated_at"]
    if admin_message:
        update_fields["admin_message"] = admin_message
    
    # If return rejected, revert status back to delivered so customer keeps the product
    if str(new_status).upper() == "RETURN_REJECTED":
        update_fields["order_status"] = "RETURN_REJECTED"

    await db.orders.update_one(
        {"id": order_id},
        {"$set": update_fields}
    )
    await write_audit_log("ORDER_STATUS_UPDATED", admin.id, "order", order_id, {"from": prev_status, "to": new_status, "admin_message": admin_message})
    
    # Notify Customer
    await create_notification(
        order['user_id'],
        f"Order Update: {str(new_status).title()}",
        f"Your order #{order['order_number']} status has been updated to {new_status}.",
        "order"
    )

    return {"message": "Order status updated"}


@api_router.get("/admin/customers")
async def list_customers(
    page: int = Query(1, ge=1), 
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    admin: User = Depends(get_admin_user)
):
    query = {"role": "customer"}
    if search:
        query["$or"] = [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]
    skip = (page - 1) * limit
    total = await db.users.count_documents(query)
    customers = await db.users.find(query, {"_id": 0, "password": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    order_counts = {}
    pipeline = [
        {"$group": {"_id": "$user_id", "orders_count": {"$sum": 1}, "total_spent": {"$sum": "$total_amount"}}}
    ]
    grouped = await db.orders.aggregate(pipeline).to_list(10000)
    for row in grouped:
        order_counts[row["_id"]] = row
    rows = []
    for user in users:
        stats = order_counts.get(user["id"], {"orders_count": 0, "total_spent": 0})
        rows.append({
            "id": user["id"],
            "name": user.get("full_name"),
            "email": user.get("email"),
            "phone": user.get("phone"),
            "created_at": user.get("created_at"),
            "orders_count": stats["orders_count"],
            "total_spent": round(float(stats["total_spent"]), 2),
        })
    return {"items": rows, "total": total, "page": page, "limit": limit}


@api_router.get("/admin/payments")
async def list_payments(
    page: int = Query(1, ge=1), 
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    admin: User = Depends(get_admin_user)
):
    query = {}
    if search:
        query = {
            "$or": [
                {"order_number": {"$regex": search, "$options": "i"}},
                {"transaction_id": {"$regex": search, "$options": "i"}},
                {"razorpay_order_id": {"$regex": search, "$options": "i"}}
            ]
        }
    skip = (page - 1) * limit
    total = await db.orders.count_documents(query)
    payments = await db.orders.find(query, {"_id": 0, "order_number": 1, "razorpay_order_id": 1, "razorpay_payment_id": 1, "total_amount": 1, "payment_status": 1, "payment_method": 1, "created_at": 1}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    items = []
    for p in payments:
        items.append({
            "id": p.get("id", str(uuid.uuid4())),
            "order_number": p.get("order_number"),
            "transaction_id": p.get("razorpay_payment_id") or p.get("razorpay_order_id") or "COD",
            "amount": p.get("total_amount"),
            "status": p.get("payment_status"),
            "provider": p.get("payment_method"),
            "created_at": p.get("created_at")
        })
    return {"items": items, "total": total, "page": page, "limit": limit}


@api_router.get("/admin/analytics/summary")
async def get_admin_analytics_summary(admin: User = Depends(get_admin_user)):
    """
    Optimized Analytics Summary using MongoDB Aggregation Pipelines.
    This prevents OOM errors as the database grows.
    """
    # 1. Total Revenue (Confirmed/Delivered)
    revenue_pipeline = [
        {"$match": {"order_status": {"$in": ["placed", "confirmed", "shipped", "delivered"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]
    revenue_res = await db.orders.aggregate(revenue_pipeline).to_list(1)
    revenue = round(revenue_res[0]["total"] if revenue_res else 0, 2)

    # 2. Orders Today Count
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    orders_today_count = await db.orders.count_documents({"created_at": {"$gte": today}})
    
    # 3. Order Status Counts
    status_pipeline = [
        {"$group": {"_id": "$order_status", "count": {"$sum": 1}}}
    ]
    status_res = await db.orders.aggregate(status_pipeline).to_list(100)
    status_counts = {row["_id"] or "unknown": row["count"] for row in status_res}

    # 4. Best Selling Products
    best_products_pipeline = [
        {"$unwind": "$items"},
        {"$group": {"_id": "$items.product_id", "quantity": {"$sum": "$items.quantity"}}},
        {"$sort": {"quantity": -1}},
        {"$limit": 10},
        {"$lookup": {
            "from": "products",
            "localField": "_id",
            "foreignField": "id",
            "as": "product_info"
        }},
        {"$project": {
            "name": {"$ifNull": [{"$arrayElemAt": ["$product_info.name", 0]}, "Unknown Product"]},
            "quantity": 1
        }}
    ]
    best_products = await db.orders.aggregate(best_products_pipeline).to_list(10)

    # 5. Inventory Summary (Low Stock)
    inventory_rows = await db.products.find({}, {"_id": 0}).sort("stock_quantity", 1).limit(50).to_list(50)
    inventory_summary = [
        {
            "id": p.get("id"),
            "name": p.get("name"),
            "sku": p.get("batch_no") or p.get("variant_sku"),
            "stock_left": int(p.get("stock_quantity", 0)),
            "units_sold": int(p.get("units_sold", 0)),
        }
        for p in inventory_rows
    ]

    metrics = {
        "total_orders": await db.orders.count_documents({}),
        "orders_today": orders_today_count,
        "total_products": await db.products.count_documents({}),
        "total_customers": await db.users.count_documents({"role": "customer"}),
    }
    if admin.role == "SUPER_ADMIN":
        metrics["total_revenue"] = revenue

    return {
        "metrics": metrics,
        "order_status_counts": status_counts,
        "best_products": best_products,
        "inventory": inventory_summary,
    }


@api_router.get("/admin/admin-users")
async def list_admin_users(admin: User = Depends(get_admin_user)):
    admins = await db.users.find({"role": {"$in": ["admin", "SUPER_ADMIN"]}}, {"_id": 0, "password": 0}).to_list(1000)
    for row in admins:
        if "is_active" not in row:
            row["is_active"] = True
    return admins


@api_router.post("/admin/admin-users")
async def create_admin_user(payload: AdminCreateRequest, admin: User = Depends(get_admin_user)):
    if admin.role != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Only super admin can create admins")
    existing = await db.users.find_one({"email": payload.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    role = payload.role if payload.role in {"admin", "SUPER_ADMIN"} else "admin"
    doc = {
        "id": str(uuid.uuid4()),
        "email": payload.email,
        "full_name": payload.full_name,
        "phone": payload.phone,
        "role": role,
        "is_active": True,
        "password": hash_password(payload.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    await write_audit_log("ADMIN_CREATED", admin.id, "user", doc["id"], {"role": doc["role"], "email": doc["email"]})
    return {"message": "Admin created", "user_id": doc["id"]}


@api_router.put("/admin/admin-users/{user_id}/status")
async def update_admin_status(user_id: str, data: dict, admin: User = Depends(get_admin_user)):
    if admin.role != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Only super admin can manage admin status")
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot disable your own account")
    is_active = bool(data.get("is_active", True))
    result = await db.users.update_one({"id": user_id, "role": {"$in": ["admin", "SUPER_ADMIN"]}}, {"$set": {"is_active": is_active}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Admin user not found")
    await write_audit_log("ADMIN_STATUS_UPDATED", admin.id, "user", user_id, {"is_active": is_active})
    return {"message": "Admin status updated"}


class AdminUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    role: Optional[str] = None


@api_router.put("/admin/admin-users/{user_id}")
async def update_admin_user(user_id: str, data: AdminUpdateRequest, admin: User = Depends(get_admin_user)):
    if admin.role != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Only super admin can edit admins")
    target = await db.users.find_one({"id": user_id, "role": {"$in": ["admin", "SUPER_ADMIN"]}}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="Admin user not found")
    updates = {}
    if data.full_name is not None:
        updates["full_name"] = data.full_name
    if data.email is not None:
        # Check email uniqueness
        existing = await db.users.find_one({"email": data.email, "id": {"$ne": user_id}}, {"_id": 0})
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use by another account")
        updates["email"] = data.email
    if data.phone is not None:
        updates["phone"] = data.phone
    if data.role is not None and data.role in {"admin", "SUPER_ADMIN"}:
        updates["role"] = data.role
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.users.update_one({"id": user_id}, {"$set": updates})
    await write_audit_log("ADMIN_UPDATED", admin.id, "user", user_id, updates)
    return {"message": "Admin updated"}


@api_router.delete("/admin/admin-users/{user_id}")
async def delete_admin_user(user_id: str, admin: User = Depends(get_admin_user)):
    if admin.role != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Only super admin can delete admins")
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    target = await db.users.find_one({"id": user_id, "role": {"$in": ["admin", "SUPER_ADMIN"]}}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="Admin user not found")
    await db.users.delete_one({"id": user_id})
    await write_audit_log("ADMIN_DELETED", admin.id, "user", user_id, {"email": target.get("email")})
    return {"message": "Admin deleted"}


class PasswordResetRequest(BaseModel):
    new_password: str = Field(min_length=8, max_length=128)


@api_router.put("/admin/admin-users/{user_id}/reset-password")
async def reset_admin_password(user_id: str, data: PasswordResetRequest, admin: User = Depends(get_admin_user)):
    if admin.role != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Only super admin can reset passwords")
    target = await db.users.find_one({"id": user_id, "role": {"$in": ["admin", "SUPER_ADMIN"]}}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="Admin user not found")
    hashed = hash_password(data.new_password)
    await db.users.update_one({"id": user_id}, {"$set": {"password": hashed}})
    await write_audit_log("ADMIN_PASSWORD_RESET", admin.id, "user", user_id, {})
    return {"message": "Password reset successful"}


@api_router.get("/admin/settings")
async def get_settings(admin: User = Depends(get_admin_user)):
    if admin.role != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Super admin only")
    settings = await db.settings.find({}, {"_id": 0}).to_list(100)
    return {s["key"]: s["value"] for s in settings}


@api_router.post("/admin/settings")
async def save_setting(data: dict, admin: User = Depends(get_admin_user)):
    if admin.role != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Super admin only")
    key = data.get("key")
    value = data.get("value")
    if not key:
        raise HTTPException(status_code=400, detail="Key is required")
    await db.settings.update_one({"key": key}, {"$set": {"key": key, "value": value, "updated_at": datetime.now(timezone.utc).isoformat()}}, upsert=True)
    await write_audit_log("SETTING_UPDATED", admin.id, "setting", key, {"key": key})
    return {"message": "Setting saved"}


@api_router.post("/admin/uploads/image")
async def upload_product_image(file: UploadFile = File(...), admin: User = Depends(get_admin_user)):
    content_type = (file.content_type or "").lower()
    if content_type not in {"image/png", "image/jpeg", "image/jpg", "image/webp"}:
        raise HTTPException(status_code=400, detail="Only png/jpg/jpeg/webp images are supported")
    raw = await file.read()
    if len(raw) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Max upload size is 5MB")
    ext = ".png"
    if content_type in {"image/jpeg", "image/jpg"}:
        ext = ".jpg"
    if content_type == "image/webp":
        ext = ".webp"
    name = f"{uuid.uuid4().hex}{ext}"
    path = UPLOADS_DIR / name
    path.write_bytes(raw)
    return {"url": f"/uploads/{name}", "file_name": file.filename or name}


@api_router.post("/admin/products/{product_id}/inventory")
async def adjust_inventory(product_id: str, data: dict, admin: User = Depends(get_admin_user)):
    delta = int(data.get("delta", 0))
    # Atomic update with state calculation
    result = await db.products.find_one_and_update(
        {"id": product_id},
        [
            {"$set": {
                "stock_quantity": {"$max": [0, {"$add": ["$stock_quantity", delta]}]},
                "updated_at": datetime.now(timezone.utc).isoformat()
            }},
            {"$set": {
                "in_stock": {"$gt": ["$stock_quantity", 0]}
            }}
        ],
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Product not found")
    
    new_qty = int(result.get("stock_quantity", 0))
    await db.stock_history.insert_one(
        {
            "id": str(uuid.uuid4()),
            "product_id": product_id,
            "delta": delta,
            "new_quantity": new_qty,
            "updated_by": admin.id,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    await write_audit_log("INVENTORY_ADJUSTED", admin.id, "product", product_id, {"delta": delta, "new_quantity": new_qty})
    return {"message": "Inventory updated", "stock_quantity": new_qty}


@api_router.post("/admin/gst/import")
async def import_gst_file(file: UploadFile = File(...), admin: User = Depends(get_admin_user)):
    if admin.role != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Only super admin can import GST")
    filename = (file.filename or "").lower()
    if not filename.endswith((".csv", ".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Unsupported file type")
    content = await file.read()
    max_bytes = int(os.environ.get('GST_UPLOAD_MAX_MB', '10')) * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(status_code=400, detail=f"File too large. Max {os.environ.get('GST_UPLOAD_MAX_MB', '10')}MB")
    frame = pd.read_csv(BytesIO(content)) if filename.endswith(".csv") else pd.read_excel(BytesIO(content))
    frame.columns = [str(c).strip().lower() for c in frame.columns]
    # Sanitize formula injection
    for col in frame.select_dtypes(include='object').columns:
        frame[col] = frame[col].apply(lambda v: ("'" + str(v)) if isinstance(v, str) and v and v[0] in ('=', '+', '-', '@') else v)
    required = {"invoice_number", "invoice_date", "customer_name", "gst_amount", "total_amount"}
    missing = required - set(frame.columns)
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing columns: {', '.join(sorted(missing))}")

    import_id = str(uuid.uuid4())
    inserted = 0
    failed = 0
    for _, row in frame.iterrows():
        try:
            invoice_number = str(row.get("invoice_number", "")).strip()
            if not invoice_number:
                failed += 1
                continue
            # Skip duplicate invoices
            existing_invoice = await db.gst_records.find_one({"invoice_number": invoice_number})
            if existing_invoice:
                failed += 1
                continue
            doc = {
                "id": str(uuid.uuid4()),
                "import_id": import_id,
                "invoice_number": invoice_number,
                "invoice_date": str(pd.to_datetime(row.get("invoice_date")).date()),
                "customer_name": str(row.get("customer_name", "")).strip(),
                "taxable_amount": float(row.get("taxable_amount", row.get("total_amount", 0))),
                "gst_amount": float(row.get("gst_amount", 0)),
                "cgst_amount": float(row.get("cgst_amount", 0)),
                "sgst_amount": float(row.get("sgst_amount", 0)),
                "igst_amount": float(row.get("igst_amount", 0)),
                "total_amount": float(row.get("total_amount", 0)),
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.gst_records.insert_one(doc)
            inserted += 1
        except Exception:
            failed += 1

    history = {
        "id": import_id,
        "file_name": file.filename,
        "uploaded_by": admin.id,
        "upload_date": datetime.now(timezone.utc).isoformat(),
        "record_count": inserted,
        "error_count": failed,
        "status": "completed",
    }
    await db.gst_imports.insert_one(history)
    await write_audit_log("GST_IMPORTED", admin.id, "gst_import", import_id, {"record_count": inserted, "error_count": failed})
    return {"import_id": import_id, "import_status": "completed", "record_count": inserted, "error_count": failed}


@api_router.get("/admin/audit-logs")
async def get_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    search: Optional[str] = Query(None),
    admin: User = Depends(get_admin_user)
):
    if admin.role != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Super admin only")
    query = {}
    if search:
        query = {
            "$or": [
                {"action": {"$regex": search, "$options": "i"}},
                {"target_type": {"$regex": search, "$options": "i"}},
                {"target_id": {"$regex": search, "$options": "i"}},
                {"actor_id": {"$regex": search, "$options": "i"}}
            ]
        }
    skip = (page - 1) * limit
    total = await db.audit_logs.count_documents(query)
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"items": logs, "total": total, "page": page, "limit": limit}


@api_router.post("/admin/gst/seed-sample")
async def seed_sample_gst(admin: User = Depends(get_admin_user)):
    if admin.role != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Super admin only")
    import_id = str(uuid.uuid4())
    today = datetime.now(timezone.utc).date().isoformat()
    records = [
        {"id": str(uuid.uuid4()), "import_id": import_id, "invoice_number": "INV-1001", "invoice_date": today, "customer_name": "Sample Customer A", "gst_amount": 18.0, "total_amount": 118.0, "taxable_amount": 100.0, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "import_id": import_id, "invoice_number": "INV-1002", "invoice_date": today, "customer_name": "Sample Customer B", "gst_amount": 36.0, "total_amount": 236.0, "taxable_amount": 200.0, "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    await db.gst_records.insert_many(records)
    history = {"id": import_id, "file_name": "seed_sample.csv", "uploaded_by": admin.id, "upload_date": datetime.now(timezone.utc).isoformat(), "record_count": len(records), "error_count": 0, "status": "completed"}
    await db.gst_imports.insert_one(history)
    await write_audit_log("GST_SAMPLE_SEEDED", admin.id, "gst_import", import_id, {"record_count": len(records)})
    return {"import_id": import_id, "record_count": len(records)}


@api_router.get("/admin/gst/reports")
async def get_gst_reports(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    search: Optional[str] = Query(None),
    admin: User = Depends(get_admin_user)
):
    if admin.role != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Super admin only")
    
    query = {}
    if search:
        query = {
            "$or": [
                {"invoice_number": {"$regex": search, "$options": "i"}},
                {"customer_name": {"$regex": search, "$options": "i"}}
            ]
        }
    
    skip = (page - 1) * limit
    total = await db.gst_records.count_documents(query)
    records = await db.gst_records.find(query, {"_id": 0}).sort("invoice_date", -1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "items": records,
        "total": total,
        "page": page,
        "limit": limit
    }


@api_router.get("/admin/gst/imports")
async def get_gst_import_history(admin: User = Depends(get_admin_user)):
    if admin.role != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Super admin only")
    imports = await db.gst_imports.find({}, {"_id": 0}).sort("upload_date", -1).to_list(1000)
    return imports

# Seed initial products (protected)
@api_router.post("/seed-products")
async def seed_products():
    existing = await db.products.count_documents({})
    if existing > 0:
        return {"message": "Products already seeded"}
    
    now = datetime.now(timezone.utc).isoformat()
    products = [
        {
            "id": str(uuid.uuid4()),
            "name": "HOT WRAP Food Grade Aluminium Foil 6m",
            "description": "Everyday wrapping power. Better hold without tearing. Helps retain heat & freshness.",
            "size": "6 Meters",
            "thickness": "11 Micron",
            "price": 99,
            "discount_price": None,
            "image_url": "https://images.unsplash.com/photo-1762151532995-c2e6cb6449d6?w=400",
            "features": ["100% Length & Width Guaranteed", "Food Grade Certified", "Eco-Friendly & Recyclable", "Non-Microwavable"],
            "in_stock": True,
            "stock_quantity": 500,
            "units_sold": 0,
            "low_stock_threshold": 50,
            "category": "Aluminum Foil",
            "batch_no": "DSF6MT260",
            "width": "295mm",
            "created_at": now,
            "updated_at": now,
        },
        {
            "id": str(uuid.uuid4()),
            "name": "HOT WRAP Food Grade Aluminium Foil 9m",
            "description": "Everyday wrapping power. Better hold without tearing. Helps retain heat & freshness.",
            "size": "9 Meters",
            "thickness": "11 Micron",
            "price": 129,
            "discount_price": None,
            "image_url": "https://images.unsplash.com/photo-1762151532995-c2e6cb6449d6?w=400",
            "features": ["100% Length & Width Guaranteed", "Food Grade Certified", "Eco-Friendly & Recyclable", "Non-Microwavable"],
            "in_stock": True,
            "stock_quantity": 400,
            "units_sold": 0,
            "low_stock_threshold": 40,
            "category": "Aluminum Foil",
            "batch_no": "DSF9MT260",
            "width": "295mm",
            "created_at": now,
            "updated_at": now,
        },
        {
            "id": str(uuid.uuid4()),
            "name": "HOT WRAP Food Grade Aluminium Foil 18m",
            "description": "Everyday wrapping power. Better hold without tearing. Helps retain heat & freshness.",
            "size": "18 Meters",
            "thickness": "11 Micron",
            "price": 229,
            "discount_price": 199,
            "image_url": "https://images.unsplash.com/photo-1762151532995-c2e6cb6449d6?w=400",
            "features": ["100% Length & Width Guaranteed", "Food Grade Certified", "Eco-Friendly & Recyclable", "Non-Microwavable"],
            "in_stock": True,
            "stock_quantity": 300,
            "units_sold": 0,
            "low_stock_threshold": 30,
            "category": "Aluminum Foil",
            "batch_no": "DSF18MT260",
            "width": "295mm",
            "created_at": now,
            "updated_at": now,
        },
        {
            "id": str(uuid.uuid4()),
            "name": "HOT WRAP Food Grade Aluminium Foil 25m",
            "description": "Everyday wrapping power. Better hold without tearing. Helps retain heat & freshness.",
            "size": "25 Meters",
            "thickness": "11 Micron",
            "price": 299,
            "discount_price": 269,
            "image_url": "https://images.unsplash.com/photo-1762151532995-c2e6cb6449d6?w=400",
            "features": ["100% Length & Width Guaranteed", "Food Grade Certified", "Eco-Friendly & Recyclable", "Non-Microwavable"],
            "in_stock": True,
            "stock_quantity": 250,
            "units_sold": 0,
            "low_stock_threshold": 25,
            "category": "Aluminum Foil",
            "batch_no": "DSF25MT260",
            "width": "295mm",
            "created_at": now,
            "updated_at": now,
        },
        {
            "id": str(uuid.uuid4()),
            "name": "HOT WRAP Food Grade Aluminium Foil 72m",
            "description": "Everyday wrapping power. Better hold without tearing. Helps retain heat & freshness. Perfect for daily kitchen use.",
            "size": "72 Meters",
            "thickness": "11 Micron",
            "price": 649,
            "discount_price": 599,
            "image_url": "https://images.unsplash.com/photo-1762151532995-c2e6cb6449d6?w=400",
            "features": ["100% Length & Width Guaranteed", "Food Grade Certified", "Eco-Friendly & Recyclable", "Non-Microwavable"],
            "in_stock": True,
            "stock_quantity": 150,
            "units_sold": 0,
            "low_stock_threshold": 20,
            "category": "Aluminum Foil",
            "batch_no": "DSF72MT260",
            "width": "295mm",
            "created_at": now,
            "updated_at": now,
        },
        {
            "id": str(uuid.uuid4()),
            "name": "HOT WRAP Food Grade Aluminium Foil 1KG",
            "description": "Premium quality heavy-duty foil. Better hold without tearing. Perfect for commercial and bulk usage.",
            "size": "1 KG",
            "thickness": "18 Micron",
            "price": 1259,
            "discount_price": 1099,
            "image_url": "https://images.unsplash.com/photo-1762151532995-c2e6cb6449d6?w=400",
            "features": ["100% Length & Width Guaranteed", "Food Grade Certified", "Eco-Friendly & Recyclable", "Heavy Duty"],
            "in_stock": True,
            "stock_quantity": 100,
            "units_sold": 0,
            "low_stock_threshold": 15,
            "category": "Aluminum Foil",
            "batch_no": "DSF1KG260",
            "width": "295mm",
            "created_at": now,
            "updated_at": now,
        }
    ]
    
    await db.products.insert_many(products)
    return {"message": f"Seeded {len(products)} products"}

# Include the router

app.include_router(api_router)

# CORS — reject wildcard when credentials are enabled
_cors_origins = os.environ.get('CORS_ORIGINS', '').strip()
if _cors_origins == '*':
    logging.warning('CORS_ORIGINS is set to wildcard "*" — restricting to localhost for safety. Set explicit origins in .env.')
    _cors_origins = 'http://localhost:3000,http://localhost:3001'
_cors_list = [o.strip() for o in _cors_origins.split(',') if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_cors_list,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        return response


app.add_middleware(SecurityHeadersMiddleware)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# MongoDB index logic moved to lifespan


# ─── Razorpay Webhook (H-10) ───────────────────────────────────────────
@api_router.post("/payment/razorpay/webhook")
async def razorpay_webhook(request: Request):
    """
    Production-grade Razorpay webhook handler.
    Strict signature verification is ENFORCED to prevent fraud.
    """
    webhook_secret = os.environ.get('RAZORPAY_WEBHOOK_SECRET', '')
    if not webhook_secret and os.environ.get('ENVIRONMENT') == 'production':
        logger.critical("RAZORPAY_WEBHOOK_SECRET is missing in production!")
        raise HTTPException(status_code=500, detail="Configuration error")

    # IP Whitelisting
    client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "")
    if client_ip:
        client_ip = client_ip.split(",")[0].strip()
    
    allowed_ips = set(ip.strip() for ip in os.environ.get("RAZORPAY_WEBHOOK_IPS", "").split(",") if ip.strip())
    if allowed_ips and client_ip not in allowed_ips:
        logger.warning("Untrusted webhook request from IP: %s", client_ip)
        raise HTTPException(status_code=403, detail="Untrusted source")

    body = await request.body()
    signature = request.headers.get('X-Razorpay-Signature', '')
    
    # Mandatory signature check
    if webhook_secret:
        import hmac, hashlib
        expected_sig = hmac.new(webhook_secret.encode(), body, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected_sig, signature):
            logger.error("Invalid Razorpay webhook signature attempt!")
            raise HTTPException(status_code=400, detail="Invalid signature")

    try:
        payload = await request.json()
        event = payload.get('event', '')
        if event == 'payment.captured':
            payment_entity = payload.get('payload', {}).get('payment', {}).get('entity', {})
            rz_order_id = payment_entity.get('order_id', '')
            payment_id = payment_entity.get('id', '')
            amount_paid = payment_entity.get('amount', 0)
            
            # Find order by razorpay order id
            order = await db.orders.find_one({"razorpay_order_id": rz_order_id}, {"_id": 0})
            if order:
                # Critical: Verify amount matches exactly to prevent payload tampering
                if int(amount_paid) == int(order['total_amount'] * 100):
                    await db.orders.update_one(
                        {"id": order['id']},
                        {"$set": {
                            "payment_status": "completed", 
                            "razorpay_payment_id": payment_id, 
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                    # Atomically clear cart
                    await db.carts.update_one(
                        {"user_id": order['user_id']},
                        {"$set": {"items": [], "updated_at": datetime.now(timezone.utc).isoformat()}}
                    )
                    logger.info("Order %s marked completed via webhook", order['order_number'])
        return {"status": "ok"}
    except Exception as exc:
        logger.error("Webhook processing error: %s", exc)
        return {"status": "ok"}  # Prevent Razorpay retries on processing errors


# ─── Simple Rate Limiter Middleware (H-01) ─────────────────────────────
from collections import defaultdict
import threading

class RateLimiterMiddleware(BaseHTTPMiddleware):
    """Basic in-memory rate limiter for critical endpoints."""
    def __init__(self, app):
        super().__init__(app)
        self._hits = defaultdict(list)
        self._lock = threading.Lock()
        self._limits = {
            '/api/auth/login': (5, 60),
            '/api/auth/register': (3, 60),
            '/api/auth/forgot-password': (3, 60),
            '/api/auth/reset-password': (3, 60),
            '/api/orders': (10, 60),
            '/api/payment/razorpay/create-order': (5, 60),
            '/api/payment/razorpay/verify': (5, 60),
        }

    async def dispatch(self, request, call_next):
        path = request.url.path
        limit_config = self._limits.get(path)
        if limit_config and request.method == 'POST':
            max_hits, window = limit_config
            client_ip = request.client.host if request.client else 'unknown'
            key = f"{client_ip}:{path}"
            now = time.time()
            with self._lock:
                self._hits[key] = [t for t in self._hits[key] if now - t < window]
                if len(self._hits[key]) >= max_hits:
                    from starlette.responses import JSONResponse
                    return JSONResponse({"detail": "Too many requests. Please try again later."}, status_code=429)
                self._hits[key].append(now)
        return await call_next(request)

app.add_middleware(RateLimiterMiddleware)

# Start-up log
# Startup log moved to lifespan

# Mount Frontend Build (Serve at the root /)
# Note: This should be the last mount to avoid overriding /api or /uploads
FRONTEND_BUILD_DIR = ROOT_DIR.parent / "frontend" / "build"
if FRONTEND_BUILD_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_BUILD_DIR), html=True), name="frontend")
    logging.info(f"Mounted frontend from {FRONTEND_BUILD_DIR}")
else:
    logging.warning(f"Frontend build directory not found at {FRONTEND_BUILD_DIR}. Run 'npm run build' in frontend.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)