"""
Database Schema Migration Script
Runs ALTER TABLE statements to add missing columns (specifically media_urls in the products table)
to the Supabase PostgreSQL database.
"""
import os
import asyncio
import logging
from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Load environment
load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("migration")

DATABASE_URL_RAW = os.environ.get('DATABASE_URL', '')
if not DATABASE_URL_RAW:
    raise RuntimeError("DATABASE_URL environment variable is missing in .env")

import re as _re
from urllib.parse import unquote
from sqlalchemy.engine import URL as _SAURL

_m = _re.match(r'postgresql(?:\+asyncpg)?://([^:@]+):(.+)@([^:/]+):(\d+)/(.+)', DATABASE_URL_RAW)
if _m:
    _user, _enc_pw, _host, _port, _db = _m.groups()
    _password = unquote(_enc_pw)   # decode special characters
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

async def run_migrations():
    logger.info("Connecting to Supabase PostgreSQL database...")
    engine = create_async_engine(
        _async_url,
        echo=False,
        connect_args={"ssl": "require"},
    )
    
    async with engine.begin() as conn:
        logger.info("Checking and altering 'products' table...")
        
        # 1. Add media_urls if it doesn't exist
        await conn.execute(text(
            "ALTER TABLE products ADD COLUMN IF NOT EXISTS media_urls JSONB DEFAULT '[]'::jsonb;"
        ))
        logger.info("Column 'media_urls' checked/added to 'products' table.")
        
        # 2. Add other potential new columns just in case
        await conn.execute(text(
            "ALTER TABLE products ADD COLUMN IF NOT EXISTS width VARCHAR(50) DEFAULT '295mm';"
        ))
        await conn.execute(text(
            "ALTER TABLE products ADD COLUMN IF NOT EXISTS base_name VARCHAR(255);"
        ))
        await conn.execute(text(
            "ALTER TABLE products ADD COLUMN IF NOT EXISTS variant_sku VARCHAR(100);"
        ))
        await conn.execute(text(
            "ALTER TABLE products ADD COLUMN IF NOT EXISTS created_by UUID;"
        ))
        await conn.execute(text(
            "ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;"
        ))
        logger.info("Other columns (width, base_name, variant_sku, created_by, updated_at) checked/added.")

        logger.info("Checking and altering 'orders' table...")
        await conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS carrier VARCHAR(120);"))
        await conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_id VARCHAR(255);"))
        await conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_url TEXT;"))
        await conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ;"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_orders_tracking_id ON orders(tracking_id);"))
        logger.info("Order shipment tracking columns checked/added.")

        # Let's check contacts table
        logger.info("Checking and altering 'contacts' table...")
        await conn.execute(text("ALTER TABLE contacts ADD COLUMN IF NOT EXISTS reply_message TEXT;"))
        await conn.execute(text("ALTER TABLE contacts ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ;"))
        logger.info("Contacts reply columns checked/added.")

        # Let's check the current columns in the products table to verify
        result = await conn.execute(text(
            "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'products';"
        ))
        columns = result.fetchall()
        logger.info("Current 'products' table columns:")
        for col in columns:
            logger.info(f" - {col[0]}: {col[1]}")

    await engine.dispose()
    logger.info("Migrations completed successfully.")

if __name__ == "__main__":
    asyncio.run(run_migrations())
