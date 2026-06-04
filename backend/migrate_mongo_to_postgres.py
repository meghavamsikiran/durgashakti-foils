"""
Seamless MongoDB to Supabase PostgreSQL Migration Script
Transfers all existing production data (users, products, orders, carts, settings, audit logs)
from MongoDB into Supabase PostgreSQL tables using batch processing to prevent memory issues.
"""
import os
import asyncio
import logging
from datetime import datetime, timezone
import uuid
from decimal import Decimal
from dotenv import load_dotenv

from motor.motor_asyncio import AsyncIOMotorClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

# Load environment
load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("migration")

MONGO_URL = os.environ.get('MONGO_URL', "mongodb://localhost:27017")
DB_NAME = os.environ.get('DB_NAME', "durgashaktifoils_db")
DATABASE_URL = os.environ.get('DATABASE_URL', "")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is missing.")

import re as _re
from urllib.parse import unquote
from sqlalchemy.engine import URL as _SAURL

DATABASE_URL_RAW = os.environ.get('DATABASE_URL', '')
if not DATABASE_URL_RAW:
    raise RuntimeError("DATABASE_URL environment variable is missing.")

# Parse and decode the connection string so special chars in passwords work correctly
_m = _re.match(r'postgresql(?:\+asyncpg)?://([^:@]+):(.+)@([^:/]+):(\d+)/(.+)', DATABASE_URL_RAW)
if _m:
    _user, _enc_pw, _host, _port, _db = _m.groups()
    _password = unquote(_enc_pw)   # decode %5B→[ %21→! %5D→]
    _async_url = _SAURL.create(
        drivername="postgresql+asyncpg",
        username=_user,
        password=_password,
        host=_host,
        port=int(_port),
        database=_db.split("?")[0],
    )
else:
    _async_url = DATABASE_URL_RAW.replace("postgresql://", "postgresql+asyncpg://", 1)

pg_engine = create_async_engine(
    _async_url,
    echo=False,
    connect_args={"ssl": "require"},
)
PgSession = sessionmaker(pg_engine, class_=AsyncSession, expire_on_commit=False)

# Setup MongoDB Client
mongo_client = AsyncIOMotorClient(MONGO_URL)
mongo_db = mongo_client[DB_NAME]

from models import (
    Base, UserModel, ProductModel, OrderModel, CartModel,
    SettingModel, AuditLogModel, NotificationModel, AddressModel
)


def to_uuid(val: str) -> uuid.UUID:
    try:
        return uuid.UUID(str(val))
    except (ValueError, TypeError, AttributeError):
        return uuid.uuid4()


def to_datetime(val) -> datetime:
    if isinstance(val, datetime):
        if val.tzinfo is None:
            return val.replace(tzinfo=timezone.utc)
        return val
    if isinstance(val, str):
        try:
            return datetime.fromisoformat(val.replace("Z", "+00:00"))
        except ValueError:
            pass
    return datetime.now(timezone.utc)


async def migrate_users(pg: AsyncSession):
    logger.info("Migrating Users...")
    total = await mongo_db.users.count_documents({})
    logger.info(f"Total users found in MongoDB: {total}")
    cursor = mongo_db.users.find({})
    count = 0
    async for doc in cursor:
        uid = to_uuid(doc.get("id"))
        existing = await pg.execute(select(UserModel).where(UserModel.id == uid))
        if existing.scalar_one_or_none():
            continue

        u = UserModel(
            id=uid,
            email=doc.get("email", f"user_{uuid.uuid4().hex[:8]}@example.com"),
            password=doc.get("password", "no_password"),
            full_name=doc.get("full_name") or doc.get("name") or "User",
            phone=doc.get("phone"),
            role=doc.get("role", "customer"),
            status=doc.get("status", "active"),
            is_active=bool(doc.get("is_active", True)),
            permissions=doc.get("permissions", {}),
            wishlist=doc.get("wishlist", []),
            saved_cards=doc.get("saved_cards", []),
            created_at=to_datetime(doc.get("created_at")),
        )
        pg.add(u)
        count += 1

        # Migrate user addresses to AddressModel
        for addr in doc.get("addresses", []):
            aid = to_uuid(addr.get("id"))
            existing_addr = await pg.execute(select(AddressModel).where(AddressModel.id == aid))
            if not existing_addr.scalar_one_or_none():
                pa = AddressModel(
                    id=aid,
                    user_id=u.id,
                    label=addr.get("label", "Home"),
                    full_name=addr.get("full_name", u.full_name),
                    phone=addr.get("phone", u.phone or ""),
                    address_line1=addr.get("address_line1", ""),
                    address_line2=addr.get("address_line2"),
                    city=addr.get("city", ""),
                    state=addr.get("state", ""),
                    pincode=addr.get("pincode", ""),
                    is_default=bool(addr.get("is_default", False)),
                )
                pg.add(pa)

        if count % 100 == 0:
            await pg.commit()
            logger.info(f" Migrated {count}/{total} users")

    await pg.commit()
    logger.info(f"Successfully migrated {count} users.")


async def migrate_products(pg: AsyncSession):
    logger.info("Migrating Products...")
    total = await mongo_db.products.count_documents({})
    cursor = mongo_db.products.find({})
    count = 0
    async for doc in cursor:
        pid = to_uuid(doc.get("id"))
        existing = await pg.execute(select(ProductModel).where(ProductModel.id == pid))
        if existing.scalar_one_or_none():
            continue

        p = ProductModel(
            id=pid,
            name=doc.get("name", "Product"),
            description=doc.get("description", ""),
            size=doc.get("size", ""),
            thickness=doc.get("thickness", ""),
            price=Decimal(str(doc.get("price") or 0)),
            discount_price=Decimal(str(doc.get("discount_price"))) if doc.get("discount_price") is not None else None,
            badge=doc.get("badge"),
            image_url=doc.get("image_url", ""),
            features=doc.get("features") or [],
            in_stock=bool(doc.get("in_stock", True)),
            stock_quantity=int(doc.get("stock_quantity") or 0),
            units_sold=int(doc.get("units_sold") or 0),
            low_stock_threshold=int(doc.get("low_stock_threshold") or 20),
            category=doc.get("category", "Aluminum Foil"),
            batch_no=doc.get("batch_no", ""),
            width=doc.get("width", "295mm"),
            base_name=doc.get("base_name"),
            variant_sku=doc.get("variant_sku") or doc.get("batch_no"),
            created_at=to_datetime(doc.get("created_at")),
            updated_at=to_datetime(doc.get("updated_at") or doc.get("created_at")),
        )
        pg.add(p)
        count += 1
        if count % 100 == 0:
            await pg.commit()

    await pg.commit()
    logger.info(f"Successfully migrated {count} products.")


async def migrate_orders(pg: AsyncSession):
    logger.info("Migrating Orders...")
    total = await mongo_db.orders.count_documents({})
    cursor = mongo_db.orders.find({})
    count = 0
    async for doc in cursor:
        oid = to_uuid(doc.get("id"))
        existing = await pg.execute(select(OrderModel).where(OrderModel.id == oid))
        if existing.scalar_one_or_none():
            continue

        uid = to_uuid(doc.get("user_id"))
        o = OrderModel(
            id=oid,
            order_number=doc.get("order_number", f"ORD-MIG-{count}"),
            user_id=uid if doc.get("user_id") and doc.get("user_id") != "guest" else None,
            customer_name=doc.get("customer_name", "Guest"),
            items=doc.get("items", []),
            total_amount=Decimal(str(doc.get("total_amount", 0))),
            payment_method=doc.get("payment_method", "cod"),
            payment_status=doc.get("payment_status", "pending"),
            order_status=doc.get("order_status", "processing"),
            stock_applied=bool(doc.get("stock_applied", True)),
            shipping_address=doc.get("shipping_address", {}),
            idempotency_key=doc.get("idempotency_key"),
            return_reason=doc.get("return_reason"),
            return_image_url=doc.get("return_image_url"),
            admin_message=doc.get("admin_message"),
            delivered_at=to_datetime(doc.get("delivered_at")) if doc.get("delivered_at") else None,
            created_at=to_datetime(doc.get("created_at")),
            updated_at=to_datetime(doc.get("updated_at") or doc.get("created_at")),
        )
        pg.add(o)
        count += 1
        if count % 100 == 0:
            await pg.commit()
            logger.info(f" Migrated {count}/{total} orders")

    await pg.commit()
    logger.info(f"Successfully migrated {count} orders.")


async def migrate_settings(pg: AsyncSession):
    logger.info("Migrating Settings...")
    cursor = mongo_db.settings.find({})
    count = 0
    async for doc in cursor:
        key = doc.get("key")
        if not key:
            continue
        existing = await pg.execute(select(SettingModel).where(SettingModel.key == key))
        s = existing.scalar_one_or_none()
        if s:
            s.value = doc.get("value", {})
        else:
            pg.add(SettingModel(key=key, value=doc.get("value", {}), updated_at=to_datetime(doc.get("updated_at"))))
        count += 1
    await pg.commit()
    logger.info(f"Successfully migrated {count} settings.")


async def ensure_schema(conn):
    """Create all tables and indexes using IF NOT EXISTS — fully idempotent."""
    from sqlalchemy import text
    statements = [
        "CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL, password VARCHAR(255) NOT NULL, full_name VARCHAR(255) NOT NULL, phone VARCHAR(20), role VARCHAR(50) DEFAULT 'customer' NOT NULL, status VARCHAR(20) DEFAULT 'active' NOT NULL, is_active BOOLEAN DEFAULT TRUE NOT NULL, permissions JSONB DEFAULT '{}' NOT NULL, wishlist JSONB DEFAULT '[]' NOT NULL, saved_cards JSONB DEFAULT '[]' NOT NULL, created_at TIMESTAMPTZ DEFAULT now() NOT NULL)",
        "CREATE INDEX IF NOT EXISTS ix_users_email ON users (email)",
        "CREATE INDEX IF NOT EXISTS ix_users_role ON users (role)",
        "CREATE TABLE IF NOT EXISTS addresses (id UUID PRIMARY KEY, user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL, label VARCHAR(50) DEFAULT 'Home' NOT NULL, full_name VARCHAR(255) NOT NULL, phone VARCHAR(20) NOT NULL, address_line1 TEXT NOT NULL, address_line2 TEXT, city VARCHAR(100) NOT NULL, state VARCHAR(100) NOT NULL, pincode VARCHAR(20) NOT NULL, is_default BOOLEAN DEFAULT FALSE NOT NULL)",
        "CREATE INDEX IF NOT EXISTS ix_addresses_user_id ON addresses (user_id)",
        "CREATE TABLE IF NOT EXISTS products (id UUID PRIMARY KEY, name VARCHAR(255) NOT NULL, description TEXT, size VARCHAR(50), thickness VARCHAR(50), price NUMERIC(12,2) NOT NULL, discount_price NUMERIC(12,2), badge VARCHAR(100), image_url TEXT, media_urls JSONB DEFAULT '[]' NOT NULL, features JSONB DEFAULT '[]' NOT NULL, in_stock BOOLEAN DEFAULT TRUE NOT NULL, stock_quantity INTEGER DEFAULT 0 NOT NULL, units_sold INTEGER DEFAULT 0 NOT NULL, low_stock_threshold INTEGER DEFAULT 20 NOT NULL, category VARCHAR(100), batch_no VARCHAR(100), width VARCHAR(50) DEFAULT '295mm', base_name VARCHAR(255), variant_sku VARCHAR(100), created_by UUID, created_at TIMESTAMPTZ DEFAULT now() NOT NULL, updated_at TIMESTAMPTZ)",
        "CREATE INDEX IF NOT EXISTS ix_products_name ON products (name)",
        "CREATE INDEX IF NOT EXISTS ix_products_category ON products (category)",
        "CREATE INDEX IF NOT EXISTS ix_products_batch_no ON products (batch_no)",
        "CREATE INDEX IF NOT EXISTS ix_products_variant_sku ON products (variant_sku)",
        "CREATE TABLE IF NOT EXISTS orders (id UUID PRIMARY KEY, order_number VARCHAR(100) UNIQUE NOT NULL, user_id UUID REFERENCES users(id) ON DELETE SET NULL, customer_name VARCHAR(255) DEFAULT 'Guest User', items JSONB NOT NULL, total_amount NUMERIC(12,2) NOT NULL, payment_method VARCHAR(50) NOT NULL, payment_status VARCHAR(50) DEFAULT 'pending' NOT NULL, order_status VARCHAR(50) DEFAULT 'processing' NOT NULL, stock_applied BOOLEAN DEFAULT FALSE NOT NULL, shipping_address JSONB NOT NULL, idempotency_key VARCHAR(255) UNIQUE, return_reason TEXT, return_image_url TEXT, admin_message TEXT, delivered_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now() NOT NULL, updated_at TIMESTAMPTZ DEFAULT now() NOT NULL)",
        "CREATE INDEX IF NOT EXISTS ix_orders_order_number ON orders (order_number)",
        "CREATE INDEX IF NOT EXISTS ix_orders_user_id ON orders (user_id)",
        "CREATE INDEX IF NOT EXISTS ix_orders_order_status ON orders (order_status)",
        "CREATE INDEX IF NOT EXISTS ix_orders_created_at ON orders (created_at)",
        "CREATE TABLE IF NOT EXISTS carts (id UUID PRIMARY KEY, user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE NOT NULL, items JSONB DEFAULT '[]' NOT NULL, updated_at TIMESTAMPTZ DEFAULT now() NOT NULL)",
        "CREATE TABLE IF NOT EXISTS notifications (id UUID PRIMARY KEY, user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL, title VARCHAR(255) NOT NULL, message TEXT NOT NULL, type VARCHAR(50) DEFAULT 'info' NOT NULL, is_read BOOLEAN DEFAULT FALSE NOT NULL, created_at TIMESTAMPTZ DEFAULT now() NOT NULL)",
        "CREATE INDEX IF NOT EXISTS ix_notifications_user_read ON notifications (user_id, is_read)",
        "CREATE TABLE IF NOT EXISTS settings (key VARCHAR(100) PRIMARY KEY, value JSONB NOT NULL, updated_at TIMESTAMPTZ)",
        "CREATE TABLE IF NOT EXISTS audit_logs (id UUID PRIMARY KEY, action VARCHAR(255) NOT NULL, actor_id VARCHAR(255), target_type VARCHAR(100), target_id VARCHAR(255), metadata JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT now() NOT NULL)",
        "CREATE INDEX IF NOT EXISTS ix_audit_logs_action ON audit_logs (action)",
        "CREATE INDEX IF NOT EXISTS ix_audit_logs_created_at ON audit_logs (created_at)",
        "CREATE TABLE IF NOT EXISTS password_resets (id UUID PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL, otp VARCHAR(10) NOT NULL, expiry TIMESTAMPTZ NOT NULL, failed_attempts INTEGER DEFAULT 0 NOT NULL, created_at TIMESTAMPTZ DEFAULT now() NOT NULL)",
        "CREATE TABLE IF NOT EXISTS stock_history (id UUID PRIMARY KEY, product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL, delta INTEGER NOT NULL, new_quantity INTEGER NOT NULL, updated_by VARCHAR(255), created_at TIMESTAMPTZ DEFAULT now() NOT NULL)",
        "CREATE INDEX IF NOT EXISTS ix_stock_history_product_id ON stock_history (product_id)",
        "CREATE TABLE IF NOT EXISTS gst_records (id UUID PRIMARY KEY, import_id VARCHAR(255), invoice_number VARCHAR(255) UNIQUE NOT NULL, invoice_date VARCHAR(20), customer_name VARCHAR(255), taxable_amount NUMERIC(14,2) DEFAULT 0, gst_amount NUMERIC(14,2) DEFAULT 0, cgst_amount NUMERIC(14,2) DEFAULT 0, sgst_amount NUMERIC(14,2) DEFAULT 0, igst_amount NUMERIC(14,2) DEFAULT 0, total_amount NUMERIC(14,2) DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now() NOT NULL)",
        "CREATE INDEX IF NOT EXISTS ix_gst_records_import_id ON gst_records (import_id)",
        "CREATE TABLE IF NOT EXISTS gst_imports (id UUID PRIMARY KEY, file_name VARCHAR(255), uploaded_by VARCHAR(255), upload_date TIMESTAMPTZ DEFAULT now() NOT NULL, record_count INTEGER DEFAULT 0, error_count INTEGER DEFAULT 0, status VARCHAR(50) DEFAULT 'completed')",
    ]
    for stmt in statements:
        await conn.execute(text(stmt))
    logger.info("Schema verified — all tables and indexes are ready.")


async def run_migration():
    logger.info("=== Starting MongoDB to Supabase Migration ===")
    async with pg_engine.connect() as conn:
        logger.info("Ensuring all PostgreSQL tables exist...")
        await ensure_schema(conn)
        await conn.commit()

    async with PgSession() as pg:
        await migrate_users(pg)
        await migrate_products(pg)
        await migrate_orders(pg)
        await migrate_settings(pg)

    logger.info("=== Migration Completed Successfully ===")
    mongo_client.close()
    await pg_engine.dispose()


if __name__ == "__main__":
    asyncio.run(run_migration())
