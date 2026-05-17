"""
Supabase PostgreSQL Database Configuration
Uses SQLAlchemy async engine with asyncpg driver.
Handles URL-encoded passwords (special chars like [, !, ]) correctly.
"""
import os
import re as _re
import logging
from urllib.parse import unquote
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
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created / verified.")
