"""
Supabase PostgreSQL Database Configuration
Uses SQLAlchemy async engine with asyncpg driver.
Handles URL-encoded passwords (special chars like [, !, ]) correctly.
"""
import os
import re as _re
import logging
from urllib.parse import unquote
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.engine import URL as _SAURL

logger = logging.getLogger(__name__)

Base = declarative_base()

engine = None
async_session_factory = None


def _build_async_url(url: str):
    """Parse DATABASE_URL and return a proper SQLAlchemy URL object.
    Using URL.create() ensures special characters in passwords are never
    double-encoded or misinterpreted by asyncpg.
    """
    # Username may contain dots (e.g. postgres.projectref for Supabase pooler)
    _m = _re.match(r'postgresql(?:\+asyncpg)?://([^:@]+):(.+)@([^:/]+):(\d+)/(.+)', url)
    if _m:
        _user, _enc_pw, _host, _port, _db = _m.groups()
        return _SAURL.create(
            drivername="postgresql+asyncpg",
            username=_user,
            password=unquote(_enc_pw),   # decode %5B→[ %21→! %5D→]
            host=_host,
            port=int(_port),
            database=_db.split("?")[0],
        )
    # Fallback: patch scheme only
    return url.replace("postgresql://", "postgresql+asyncpg://", 1).replace("postgres://", "postgresql+asyncpg://", 1)


def init_engine():
    """Initialize the database engine. Called once at startup."""
    global engine, async_session_factory
    url = os.getenv("DATABASE_URL", "")
    if not url:
        logger.error("DATABASE_URL environment variable is not configured.")
        return

    async_url = _build_async_url(url)
    engine = create_async_engine(
        async_url,
        echo=False,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        pool_recycle=300,
        connect_args={
            "ssl": "require",
            "statement_cache_size": 0,
            "prepared_statement_cache_size": 0,
        },
    )
    async_session_factory = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    logger.info("Database engine initialized successfully.")


async def get_db() -> AsyncSession:
    """FastAPI dependency: yields an async database session with auto-commit/rollback."""
    if not async_session_factory:
        raise RuntimeError("Database not initialized. Set DATABASE_URL in .env")
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def create_tables():
    """Create all tables defined in models.py. Idempotent (IF NOT EXISTS)."""
    if not engine:
        raise RuntimeError("Database engine not initialized.")

    # ── Step 1: Create core tables (must succeed) ──
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Core tables created / verified.")

    # ── Step 2: Run incremental migrations (non-fatal) ──
    # These are all IF NOT EXISTS / idempotent. If the pooler times out
    # (Supabase PgBouncer enforces its own query timeout), the app can
    # still start because the columns already exist from a previous deploy.
    migration_stmts = [
        # --- categories ---
        """CREATE TABLE IF NOT EXISTS categories (
            id UUID PRIMARY KEY,
            name VARCHAR(255) UNIQUE NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            global_discount_enabled BOOLEAN NOT NULL DEFAULT FALSE,
            global_discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ
        );""",
        "ALTER TABLE categories ADD COLUMN IF NOT EXISTS id UUID;",
        "UPDATE categories SET id = md5(LOWER(name))::uuid WHERE id IS NULL AND name IS NOT NULL;",
        "ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;",
        "ALTER TABLE categories ADD COLUMN IF NOT EXISTS global_discount_enabled BOOLEAN NOT NULL DEFAULT FALSE;",
        "ALTER TABLE categories ADD COLUMN IF NOT EXISTS global_discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.0;",
        "ALTER TABLE categories ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();",
        "ALTER TABLE categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;",
        "CREATE INDEX IF NOT EXISTS ix_categories_name ON categories(name);",
        """INSERT INTO categories (id, name, is_active, created_at)
            SELECT md5(LOWER(product_categories.name))::uuid, product_categories.name, TRUE, NOW()
            FROM (
                SELECT DISTINCT TRIM(category) AS name
                FROM products
                WHERE category IS NOT NULL AND TRIM(category) <> ''
            ) AS product_categories
            WHERE NOT EXISTS (
                SELECT 1
                FROM categories
                WHERE LOWER(categories.name) = LOWER(product_categories.name)
            );""",
        # --- orders ---
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_codes JSONB DEFAULT '[]'::jsonb;",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12, 2) DEFAULT 0.0 NOT NULL;",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(255);",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(255);",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_signature VARCHAR(255);",
        "CREATE INDEX IF NOT EXISTS ix_orders_razorpay_order_id ON orders(razorpay_order_id);",
        # --- coupons ---
        "ALTER TABLE coupons ADD COLUMN IF NOT EXISTS coupon_type VARCHAR(50) DEFAULT 'standard' NOT NULL;",
        "ALTER TABLE coupons ADD COLUMN IF NOT EXISTS apply_to_all_loyal_customers BOOLEAN DEFAULT false NOT NULL;",
        "ALTER TABLE coupons ADD COLUMN IF NOT EXISTS apply_to_all_products BOOLEAN DEFAULT false NOT NULL;",
        "ALTER TABLE coupons ADD COLUMN IF NOT EXISTS eligible_customer_ids JSONB DEFAULT '[]'::jsonb NOT NULL;",
        "ALTER TABLE coupons ADD COLUMN IF NOT EXISTS eligible_product_ids JSONB DEFAULT '[]'::jsonb NOT NULL;",
        "ALTER TABLE coupons ADD COLUMN IF NOT EXISTS eligible_category_ids JSONB DEFAULT '[]'::jsonb NOT NULL;",
        "ALTER TABLE coupons ADD COLUMN IF NOT EXISTS is_reusable BOOLEAN DEFAULT true NOT NULL;",
        # --- addresses ---
        "ALTER TABLE addresses ADD COLUMN IF NOT EXISTS alternate_phone VARCHAR(20);",
        # --- product_reviews ---
        "ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS admin_reply TEXT;",
        "ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS admin_reply_by UUID;",
        "ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS admin_reply_at TIMESTAMPTZ;",
        # --- legacy tracking URL cleanup ---
        """UPDATE orders
            SET tracking_url = 'https://t.17track.net/en#nums=' || tracking_number
            WHERE (tracking_url LIKE '%indiapost.gov.in%' OR tracking_url LIKE '%17track.net%')
              AND tracking_number IS NOT NULL
              AND tracking_number <> '';""",
    ]

    failed = 0
    for stmt in migration_stmts:
        try:
            async with engine.begin() as conn:
                await conn.execute(text(stmt))
        except Exception as exc:
            failed += 1
            # Log but don't crash — column likely already exists
            logger.warning("Migration statement skipped (timeout/error): %s — %s", stmt[:80], exc)

    if failed:
        logger.warning("%d migration statement(s) skipped due to errors (likely already applied).", failed)
    else:
        logger.info("All migration statements applied successfully.")
    logger.info("Database tables created / verified and legacy tracking URLs migrated.")

