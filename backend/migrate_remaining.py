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

import re as _re
from urllib.parse import unquote
from sqlalchemy.engine import URL as _SAURL

DATABASE_URL_RAW = os.environ.get('DATABASE_URL', '')
if not DATABASE_URL_RAW:
    raise RuntimeError("DATABASE_URL environment variable is missing.")

_m = _re.match(r'postgresql(?:\+asyncpg)?://([^:@]+):(.+)@([^:/]+):(\d+)/(.+)', DATABASE_URL_RAW)
if _m:
    _user, _enc_pw, _host, _port, _db = _m.groups()
    _password = unquote(_enc_pw)
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
    CartModel, NotificationModel, AuditLogModel,
    StockHistoryModel, GstRecordModel, GstImportModel
)

def to_uuid(val: str) -> uuid.UUID:
    if val is None:
        return None
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

async def get_valid_users(pg: AsyncSession):
    from models import UserModel
    result = await pg.execute(select(UserModel.id))
    return {row[0] for row in result.all()}

async def get_valid_products(pg: AsyncSession):
    from models import ProductModel
    result = await pg.execute(select(ProductModel.id))
    return {row[0] for row in result.all()}

async def migrate_carts(pg: AsyncSession, valid_users: set):
    logger.info("Migrating Carts...")
    cursor = mongo_db.carts.find({})
    count = 0
    async for doc in cursor:
        uid = to_uuid(doc.get("user_id"))
        if not uid or uid not in valid_users:
            continue
        existing = await pg.execute(select(CartModel).where(CartModel.user_id == uid))
        if existing.scalar_one_or_none():
            continue
            
        c = CartModel(
            id=to_uuid(doc.get("id")) or uuid.uuid4(),
            user_id=uid,
            items=doc.get("items", []),
            updated_at=to_datetime(doc.get("updated_at") or datetime.utcnow()),
        )
        pg.add(c)
        count += 1
    await pg.commit()
    logger.info(f"Successfully migrated {count} carts.")

async def migrate_notifications(pg: AsyncSession, valid_users: set):
    logger.info("Migrating Notifications...")
    cursor = mongo_db.notifications.find({})
    count = 0
    async for doc in cursor:
        nid = to_uuid(doc.get("id"))
        existing = await pg.execute(select(NotificationModel).where(NotificationModel.id == nid))
        if existing.scalar_one_or_none():
            continue
            
        uid = to_uuid(doc.get("user_id"))
        if not uid or uid not in valid_users:
            continue
            
        n = NotificationModel(
            id=nid,
            user_id=uid,
            title=doc.get("title", ""),
            message=doc.get("message", ""),
            type=doc.get("type", "info"),
            is_read=bool(doc.get("is_read", False)),
            created_at=to_datetime(doc.get("created_at") or datetime.utcnow()),
        )
        pg.add(n)
        count += 1
    await pg.commit()
    logger.info(f"Successfully migrated {count} notifications.")

async def migrate_audit_logs(pg: AsyncSession):
    logger.info("Migrating Audit Logs...")
    cursor = mongo_db.audit_logs.find({})
    count = 0
    async for doc in cursor:
        aid = to_uuid(doc.get("id"))
        existing = await pg.execute(select(AuditLogModel).where(AuditLogModel.id == aid))
        if existing.scalar_one_or_none():
            continue
            
        a = AuditLogModel(
            id=aid,
            action=doc.get("action", ""),
            actor_id=str(doc.get("actor_id")) if doc.get("actor_id") else None,
            target_type=doc.get("target_type"),
            target_id=str(doc.get("target_id")) if doc.get("target_id") else None,
            metadata_=doc.get("metadata", {}),
            created_at=to_datetime(doc.get("created_at") or datetime.utcnow()),
        )
        pg.add(a)
        count += 1
        if count % 100 == 0:
            await pg.commit()
    await pg.commit()
    logger.info(f"Successfully migrated {count} audit logs.")

async def migrate_stock_history(pg: AsyncSession, valid_products: set):
    logger.info("Migrating Stock History...")
    cursor = mongo_db.stock_history.find({})
    count = 0
    async for doc in cursor:
        sid = to_uuid(doc.get("id"))
        existing = await pg.execute(select(StockHistoryModel).where(StockHistoryModel.id == sid))
        if existing.scalar_one_or_none():
            continue
            
        pid = to_uuid(doc.get("product_id"))
        if not pid or pid not in valid_products:
            continue
            
        s = StockHistoryModel(
            id=sid,
            product_id=pid,
            delta=int(doc.get("delta", 0)),
            new_quantity=int(doc.get("new_quantity", 0)),
            updated_by=doc.get("updated_by"),
            created_at=to_datetime(doc.get("created_at") or datetime.utcnow()),
        )
        pg.add(s)
        count += 1
    await pg.commit()
    logger.info(f"Successfully migrated {count} stock history records.")

async def migrate_gst_imports(pg: AsyncSession):
    logger.info("Migrating GST Imports...")
    cursor = mongo_db.gst_imports.find({})
    count = 0
    async for doc in cursor:
        gid = to_uuid(doc.get("id"))
        existing = await pg.execute(select(GstImportModel).where(GstImportModel.id == gid))
        if existing.scalar_one_or_none():
            continue
            
        g = GstImportModel(
            id=gid,
            file_name=doc.get("file_name"),
            uploaded_by=doc.get("uploaded_by"),
            upload_date=to_datetime(doc.get("upload_date") or datetime.utcnow()),
            record_count=int(doc.get("record_count", 0)),
            error_count=int(doc.get("error_count", 0)),
            status=doc.get("status", "completed"),
        )
        pg.add(g)
        count += 1
    await pg.commit()
    logger.info(f"Successfully migrated {count} GST imports.")

async def migrate_gst_records(pg: AsyncSession):
    logger.info("Migrating GST Records...")
    cursor = mongo_db.gst_records.find({})
    count = 0
    async for doc in cursor:
        grid = to_uuid(doc.get("id"))
        existing = await pg.execute(select(GstRecordModel).where(GstRecordModel.id == grid))
        if existing.scalar_one_or_none():
            continue
            
        g = GstRecordModel(
            id=grid,
            import_id=doc.get("import_id"),
            invoice_number=doc.get("invoice_number", f"INV-{uuid.uuid4().hex[:8]}"),
            invoice_date=doc.get("invoice_date"),
            customer_name=doc.get("customer_name"),
            taxable_amount=Decimal(str(doc.get("taxable_amount") or 0)),
            gst_amount=Decimal(str(doc.get("gst_amount") or 0)),
            cgst_amount=Decimal(str(doc.get("cgst_amount") or 0)),
            sgst_amount=Decimal(str(doc.get("sgst_amount") or 0)),
            igst_amount=Decimal(str(doc.get("igst_amount") or 0)),
            total_amount=Decimal(str(doc.get("total_amount") or 0)),
            created_at=to_datetime(doc.get("created_at") or datetime.utcnow()),
        )
        pg.add(g)
        count += 1
    await pg.commit()
    logger.info(f"Successfully migrated {count} GST records.")

async def run_migration():
    logger.info("=== Starting Remaining MongoDB to Supabase Migration ===")
    async with PgSession() as pg:
        valid_users = await get_valid_users(pg)
        valid_products = await get_valid_products(pg)
        
        await migrate_carts(pg, valid_users)
        await migrate_notifications(pg, valid_users)
        await migrate_audit_logs(pg)
        await migrate_stock_history(pg, valid_products)
        await migrate_gst_imports(pg)
        await migrate_gst_records(pg)
        
    logger.info("=== Remaining Migration Completed Successfully ===")
    mongo_client.close()
    await pg_engine.dispose()

if __name__ == "__main__":
    asyncio.run(run_migration())
