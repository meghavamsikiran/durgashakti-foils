"""
SQLAlchemy ORM Models for DurgaShakti Foils — Supabase PostgreSQL
All tables use UUID primary keys for Supabase compatibility.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Boolean, Integer, Numeric, Text, DateTime,
    ForeignKey, Index, UniqueConstraint, CheckConstraint, text
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from database import Base


def utcnow():
    return datetime.now(timezone.utc)


# ── Users ────────────────────────────────────────────────────────────────
class UserModel(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    role = Column(String(50), default="customer", nullable=False, index=True)
    status = Column(String(20), default="active", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    permissions = Column(JSONB, default=dict, nullable=False, server_default=text("'{}'::jsonb"))
    wishlist = Column(JSONB, default=list, nullable=False, server_default=text("'[]'::jsonb"))
    saved_cards = Column(JSONB, default=list, nullable=False, server_default=text("'[]'::jsonb"))
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    __table_args__ = (
        Index("ix_users_role", "role"),
    )


# ── Addresses ────────────────────────────────────────────────────────────
class AddressModel(Base):
    __tablename__ = "addresses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    label = Column(String(50), default="Home", nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=False)
    address_line1 = Column(Text, nullable=False)
    address_line2 = Column(Text, nullable=True)
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    pincode = Column(String(20), nullable=False)
    is_default = Column(Boolean, default=False, nullable=False)


# ── Products ─────────────────────────────────────────────────────────────
class ProductModel(Base):
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    size = Column(String(50), nullable=True)
    thickness = Column(String(50), nullable=True)
    price = Column(Numeric(12, 2), nullable=False)
    discount_price = Column(Numeric(12, 2), nullable=True)
    badge = Column(String(100), nullable=True)
    image_url = Column(Text, nullable=True)
    media_urls = Column(JSONB, default=list, nullable=False, server_default=text("'[]'::jsonb"))  # list of {url, type: 'image'|'video'}
    features = Column(JSONB, default=list, nullable=False, server_default=text("'[]'::jsonb"))
    in_stock = Column(Boolean, default=True, nullable=False)
    stock_quantity = Column(Integer, default=0, nullable=False)
    units_sold = Column(Integer, default=0, nullable=False)
    low_stock_threshold = Column(Integer, default=20, nullable=False)
    category = Column(String(100), nullable=True, index=True)
    batch_no = Column(String(100), nullable=True, index=True)
    width = Column(String(50), default="295mm")
    base_name = Column(String(255), nullable=True)
    variant_sku = Column(String(100), nullable=True, index=True)
    is_active = Column(Boolean, default=True, nullable=False, server_default=text("'true'"))
    created_by = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=True, onupdate=utcnow)

    __table_args__ = (
        Index("ix_products_stock", "stock_quantity"),
    )


# ── Categories ───────────────────────────────────────────────────────────
class ProductReviewModel(Base):
    __tablename__ = "product_reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    rating = Column(Integer, nullable=False)
    title = Column(String(140), nullable=False)
    comment = Column(Text, nullable=True)
    public_name = Column(String(120), nullable=False)
    media_urls = Column(JSONB, default=list, nullable=False, server_default=text("'[]'::jsonb"))
    status = Column(String(30), default="published", nullable=False, index=True)
    helpful_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), nullable=True, onupdate=utcnow)

    __table_args__ = (
        UniqueConstraint("product_id", "user_id", "order_id", name="uq_product_review_purchase"),
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_product_reviews_rating_range"),
        Index("ix_product_reviews_product_status", "product_id", "status"),
    )


class CategoryModel(Base):
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), unique=True, nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False, server_default=text("'true'"))
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=True, onupdate=utcnow)


# ── Orders ───────────────────────────────────────────────────────────────
class OrderModel(Base):
    __tablename__ = "orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_number = Column(String(100), unique=True, nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    customer_name = Column(String(255), default="Guest User")
    items = Column(JSONB, nullable=False)  # Snapshot of order items
    total_amount = Column(Numeric(12, 2), nullable=False)
    coupon_codes = Column(JSONB, default=list, nullable=False, server_default=text("'[]'::jsonb"))
    discount_amount = Column(Numeric(12, 2), default=0.0, nullable=False, server_default=text("'0.0'"))
    payment_method = Column(String(50), nullable=False)
    payment_status = Column(String(50), default="pending", nullable=False)
    order_status = Column(String(50), default="processing", nullable=False, index=True)
    stock_applied = Column(Boolean, default=False, nullable=False)
    shipping_address = Column(JSONB, nullable=False)
    idempotency_key = Column(String(255), unique=True, nullable=True)
    razorpay_order_id = Column(String(255), nullable=True)
    razorpay_payment_id = Column(String(255), nullable=True)
    carrier = Column(String(120), nullable=True)
    tracking_id = Column(String(255), nullable=True)
    tracking_url = Column(Text, nullable=True)
    shipped_at = Column(DateTime(timezone=True), nullable=True)
    return_reason = Column(Text, nullable=True)
    return_image_url = Column(Text, nullable=True)
    admin_message = Column(Text, nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)


# ── Carts ────────────────────────────────────────────────────────────────
class CartModel(Base):
    __tablename__ = "carts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    items = Column(JSONB, default=list, nullable=False, server_default=text("'[]'::jsonb"))
    updated_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)


# ── Notifications ────────────────────────────────────────────────────────
class NotificationModel(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="info", nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    __table_args__ = (
        Index("ix_notifications_user_read", "user_id", "is_read"),
    )


# ── Settings ─────────────────────────────────────────────────────────────
class SettingModel(Base):
    __tablename__ = "settings"

    key = Column(String(100), primary_key=True)
    value = Column(JSONB, nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=True, onupdate=utcnow)


# ── Audit Logs ───────────────────────────────────────────────────────────
class AuditLogModel(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    action = Column(String(255), nullable=False, index=True)
    actor_id = Column(String(255), nullable=True)
    target_type = Column(String(100), nullable=True)
    target_id = Column(String(255), nullable=True)
    metadata_ = Column("metadata", JSONB, default=dict, server_default=text("'{}'::jsonb"))
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False, index=True)


# ── Password Resets ──────────────────────────────────────────────────────
class PasswordResetModel(Base):
    __tablename__ = "password_resets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    otp = Column(String(10), nullable=False)
    expiry = Column(DateTime(timezone=True), nullable=False)
    failed_attempts = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)


# ── Stock History ────────────────────────────────────────────────────────
class StockHistoryModel(Base):
    __tablename__ = "stock_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    delta = Column(Integer, nullable=False)
    new_quantity = Column(Integer, nullable=False)
    updated_by = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)


# ── GST Records ──────────────────────────────────────────────────────────
class GstRecordModel(Base):
    __tablename__ = "gst_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    import_id = Column(String(255), nullable=True, index=True)
    invoice_number = Column(String(255), unique=True, nullable=False)
    invoice_date = Column(String(20), nullable=True)
    customer_name = Column(String(255), nullable=True)
    taxable_amount = Column(Numeric(14, 2), default=0)
    gst_amount = Column(Numeric(14, 2), default=0)
    cgst_amount = Column(Numeric(14, 2), default=0)
    sgst_amount = Column(Numeric(14, 2), default=0)
    igst_amount = Column(Numeric(14, 2), default=0)
    total_amount = Column(Numeric(14, 2), default=0)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)


# ── GST Imports ──────────────────────────────────────────────────────────
class GstImportModel(Base):
    __tablename__ = "gst_imports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    file_name = Column(String(255), nullable=True)
    uploaded_by = Column(String(255), nullable=True)
    upload_date = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    record_count = Column(Integer, default=0)
    error_count = Column(Integer, default=0)
    status = Column(String(50), default="completed")

# ── Contact Submissions ──────────────────────────────────────────────────
class ContactModel(Base):
    __tablename__ = "contacts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    message = Column(Text, nullable=False)
    status = Column(String(50), default="pending", nullable=False) # pending, read, replied
    reply_message = Column(Text, nullable=True)
    replied_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False, index=True)


# ── Coupons ──────────────────────────────────────────────────────────────
class CouponModel(Base):
    __tablename__ = "coupons"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(100), unique=True, nullable=False, index=True)
    discount_type = Column(String(50), nullable=False)  # percentage, flat, free_shipping
    discount_value = Column(Numeric(12, 2), nullable=False)
    expiry_date = Column(DateTime(timezone=True), nullable=True)
    min_cart_value = Column(Numeric(12, 2), default=0.0, nullable=False, server_default=text("'0.0'"))
    max_discount_limit = Column(Numeric(12, 2), nullable=True)
    max_usage_count = Column(Integer, nullable=True)
    per_customer_usage_limit = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False, server_default=text("'true'"))
    total_uses = Column(Integer, default=0, nullable=False, server_default=text("'0'"))
    total_discount_given = Column(Numeric(12, 2), default=0.0, nullable=False, server_default=text("'0.0'"))
    revenue_generated = Column(Numeric(12, 2), default=0.0, nullable=False, server_default=text("'0.0'"))
    coupon_type = Column(String(50), default="standard", nullable=False, server_default=text("'standard'"))
    apply_to_all_loyal_customers = Column(Boolean, default=False, nullable=False, server_default=text("'false'"))
    eligible_customer_ids = Column(JSONB, default=list, nullable=False, server_default=text("'[]'::jsonb"))
    eligible_product_ids = Column(JSONB, default=list, nullable=False, server_default=text("'[]'::jsonb"))
    eligible_category_ids = Column(JSONB, default=list, nullable=False, server_default=text("'[]'::jsonb"))
    is_reusable = Column(Boolean, default=True, nullable=False, server_default=text("'true'"))
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=True, onupdate=utcnow)
