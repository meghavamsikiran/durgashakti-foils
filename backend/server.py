"""
DurgaShakti Foils Main API Server — Supabase PostgreSQL Edition
Modularized architecture using FastAPI and SQLAlchemy Asyncpg.
File uploads served via Supabase Storage CDN.
"""
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from pathlib import Path
import os
import logging
import time
from collections import defaultdict
import threading
import asyncio
from datetime import datetime, timezone, timedelta

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import delete

# Initialize DB engine
load_dotenv(override=True)
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env', override=True)

from database import create_tables, init_engine
from deps import UPLOADS_DIR

# Import Modular Routers
from routes.auth import router as auth_router
from routes.user import router as user_router
from routes.products import router as products_router
from routes.cart import router as cart_router
from routes.orders import router as orders_router
from routes.admin import router as admin_router
from routes.analytics import router as analytics_router
from routes.geolocation import router as geolocation_router
from routes.contact import router as contact_router
from routes.reviews import router as reviews_router
from routes.coupons import router as coupons_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize PostgreSQL Async Engine + Supabase Storage
    logger.info("Starting DurgaShakti Foils Server (Supabase PostgreSQL)...")
    init_engine()
    await create_tables(background_migrations=True)
    from storage_service import ensure_bucket_exists
    asyncio.create_task(ensure_bucket_exists())
    logger.info("Supabase storage bucket verification scheduled in the background.")

    async def run_webp_migration():
        await asyncio.sleep(10)
        try:
            from convert_existing_to_webp import main as migrate_webp
            logger.info("Starting WebP image migration on server startup...")
            await migrate_webp()
        except Exception as e:
            logger.exception(f"Failed to run WebP image migration: {e}")

    asyncio.create_task(run_webp_migration())

    # Start background task to repair historical returns (sync items with order status)
    try:
        from database import async_session_factory
        from models import OrderModel
        from sqlalchemy import select
        from sqlalchemy.orm.attributes import flag_modified

        async def _repair_historical_returns():
            await asyncio.sleep(5)
            logger.info("Running background repair task for historical return order items...")
            try:
                async with async_session_factory() as session:
                    res = await session.execute(
                        select(OrderModel).where(
                            OrderModel.order_status.in_(["return_approved", "return_rejected"])
                        )
                    )
                    orders = res.scalars().all()
                    repaired_count = 0
                    now = datetime.now(timezone.utc)
                    for order in orders:
                        status_upper = "RETURN_APPROVED" if order.order_status == "return_approved" else "RETURN_REJECTED"
                        updated_items = []
                        modified = False
                        for item in (order.items or []):
                            if item.get("return_status") == "RETURN_REQUESTED":
                                item["return_status"] = status_upper
                                if "audit_timeline" not in item:
                                    item["audit_timeline"] = []
                                item["audit_timeline"].append({
                                    "status": status_upper,
                                    "timestamp": now.isoformat(),
                                    "remarks": "Synced with order-level status via background startup repair task"
                                })
                                modified = True
                            updated_items.append(item)
                        if modified:
                            order.items = updated_items
                            flag_modified(order, "items")
                            repaired_count += 1
                            logger.info("Repaired return status for items in order %s", order.order_number)
                    # Also, migrate any historical orders marked as 'overdue' to 'cancelled'
                    res_overdue = await session.execute(
                        select(OrderModel).where(OrderModel.order_status == "overdue")
                    )
                    overdue_orders = res_overdue.scalars().all()
                    for order in overdue_orders:
                        order.order_status = "cancelled"
                        order.payment_status = "failed"
                        order.updated_at = now
                        logger.info("Migrated overdue order %s to cancelled/failed", order.order_number)

                    if repaired_count > 0 or len(overdue_orders) > 0:
                        await session.commit()
                        logger.info("Successfully repaired %d return orders and migrated %d overdue orders", repaired_count, len(overdue_orders))
                    else:
                        logger.info("No historical return orders or overdue orders needed repair")
            except Exception:
                logger.exception("Background historical returns repair task failed")

        asyncio.create_task(_repair_historical_returns())
    except Exception:
        logger.exception("Failed to initialize background historical returns repair task")
    # Start background cleanup task for audit logs (delete entries older than 6 months)
    try:
        from database import async_session_factory
        from models import AuditLogModel

        async def _audit_cleanup_loop():
            while True:
                try:
                    cutoff = datetime.now(timezone.utc) - timedelta(days=180)
                    async with async_session_factory() as session:
                        await session.execute(delete(AuditLogModel).where(AuditLogModel.created_at < cutoff))
                        await session.commit()
                except Exception:
                    logger.exception('Audit cleanup failed')
                await asyncio.sleep(24 * 3600)

        asyncio.create_task(_audit_cleanup_loop())
    except Exception:
        logger.exception('Failed to start audit cleanup task')

    # Start background cleanup task for expired pending payment orders (timeout of 15 minutes)
    try:
        from database import async_session_factory
        from models import OrderModel, ProductModel
        from sqlalchemy import select
        from deps import create_notification
        from routes.orders import _reconcile_order_with_razorpay
        async def _payment_timeout_cleanup_loop():
            while True:
                try:
                    cutoff = datetime.now(timezone.utc) - timedelta(minutes=15)
                    async with async_session_factory() as session:
                        stmt = select(OrderModel).where(
                            OrderModel.order_status.in_(["pending_payment", "pending"]),
                            OrderModel.payment_method != "cod",
                            OrderModel.created_at < cutoff
                        )
                        result = await session.execute(stmt)
                        expired_orders = result.scalars().all()

                        for order in expired_orders:
                            reconciled = await _reconcile_order_with_razorpay(order, session, source="timeout_cleanup")
                            if reconciled:
                                logger.info(
                                    "Recovered paid Razorpay order %s during timeout cleanup; skipping cancellation",
                                    order.order_number,
                                )
                                continue

                            logger.info(
                                "Marking online order %s as payment overdue after timeout; keeping payment retry available",
                                order.order_number,
                            )
                            
                            # Release stock if stock was applied
                            if order.stock_applied:
                                items_to_release = [
                                    item for item in (order.items or [])
                                    if item.get("product_id") and int(item.get("quantity", 0)) > 0
                                ]
                                if items_to_release:
                                    prod_ids = [item.get("product_id") for item in items_to_release]
                                    prod_stmt = select(ProductModel).where(ProductModel.id.in_(prod_ids)).with_for_update()
                                    prod_res = await session.execute(prod_stmt)
                                    locked_products = {str(p.id): p for p in prod_res.scalars().all()}
                                    for item in items_to_release:
                                        pid = item.get("product_id")
                                        qty = int(item.get("quantity", 0))
                                        product = locked_products.get(str(pid))
                                        if product:
                                            product.stock_quantity = int(product.stock_quantity or 0) + qty
                                            product.units_sold = max(0, int(product.units_sold or 0) - qty)
                                            product.in_stock = True
                                            product.updated_at = datetime.now(timezone.utc)

                            # Online orders do not reserve stock until payment succeeds.
                            order.order_status = "cancelled"
                            order.payment_status = "failed"
                            order.stock_applied = False
                            order.updated_at = datetime.now(timezone.utc)

                            # Create customer notification if user exists
                            if order.user_id:
                                await create_notification(
                                    session,
                                    str(order.user_id),
                                    "Order Cancelled",
                                    f"Your payment window for order {order.order_number} expired, and the order has been cancelled.",
                                    "order"
                                )

                        if expired_orders:
                            await session.commit()
                except Exception:
                    logger.exception("Pending payment cleanup task failed")
                # Check for expired payments every 60 seconds
                await asyncio.sleep(60)

        asyncio.create_task(_payment_timeout_cleanup_loop())
    except Exception:
        logger.exception("Failed to start payment timeout cleanup task")

    # Start background task to enforce return deadlines and payment timeouts periodically
    try:
        from database import async_session_factory
        async def _enforce_deadlines_loop():
            while True:
                try:
                    await asyncio.sleep(60)
                    async with async_session_factory() as session:
                        from routes.orders import enforce_return_deadlines, enforce_payment_timeouts
                        await enforce_return_deadlines(session)
                        await enforce_payment_timeouts(session)
                except Exception:
                    logger.exception("Background enforce deadlines loop failed")

        asyncio.create_task(_enforce_deadlines_loop())
    except Exception:
        logger.exception("Failed to start background enforce deadlines loop")

    yield
    # Shutdown
    logger.info("DurgaShakti Foils Server Shutdown.")


app = FastAPI(lifespan=lifespan)

@app.get("/api/health")
@app.get("/api/ping")
async def health_check():
    """Health check endpoint for uptime monitors and cron keep-alive pings."""
    return {"status": "healthy", "message": "DurgaShakti Foils API Server is active"}

# ── CORS Middleware ──────────────────────────────────────────────────────
cors_origins = os.environ.get('CORS_ORIGINS', '').strip()
cors_list = [o.strip() for o in cors_origins.split(',') if o.strip() and o.strip() != '*']
if not cors_list:
    frontend_url = os.environ.get("FRONTEND_URL", "").strip()
    cors_list = ["http://localhost:3000", "http://localhost:3001"]
    if frontend_url:
        cors_list.append(frontend_url)

cors_list.extend([
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "https://durgashakti-foils.vercel.app",
    "https://durgashakti-foils-git-main-meghavamsikirans-projects.vercel.app"
])
cors_list = list(set(cors_list))

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=cors_list,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Security Headers Middleware ──────────────────────────────────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(self), payment=(self)"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        if os.environ.get("ENVIRONMENT") == "production" and request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


app.add_middleware(SecurityHeadersMiddleware)


# ── Maintenance Middleware ────────────────────────────────────────────────
class MaintenanceMiddleware(BaseHTTPMiddleware):
    """Intercepts requests during maintenance, serving a 503 Service Unavailable message."""
    async def dispatch(self, request, call_next):
        is_maintenance = os.environ.get('BACKEND_MAINTENANCE_MODE', 'false') == 'true'
        client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else 'unknown')
        client_ip = client_ip.split(",")[0].strip()
        is_local = client_ip in ('127.0.0.1', 'localhost', '::1', '0.0.0.0')
        
        # Intercept api routes for external visitors under maintenance
        if is_maintenance and not is_local and request.url.path.startswith('/api'):
            return JSONResponse(
                status_code=503,
                content={
                    "status": "maintenance",
                    "message": "DurgaShakti Foils API is currently undergoing scheduled systems maintenance. We will be back online shortly."
                }
            )
        return await call_next(request)


app.add_middleware(MaintenanceMiddleware)


# ── Rate Limiter Middleware ──────────────────────────────────────────────
class RateLimiterMiddleware(BaseHTTPMiddleware):
    """In-memory rate limiter for auth & checkout endpoints."""
    def __init__(self, app):
        super().__init__(app)
        self._hits = defaultdict(list)
        self._lock = threading.Lock()
        self._limits = {
            '/api/auth/login': (10, 60),
            '/api/auth/register': (10, 60),
            '/api/auth/forgot-password': (15, 60),
            '/api/auth/reset-password': (15, 60),
            '/api/orders': (20, 60),
        }

    async def dispatch(self, request, call_next):
        path = request.url.path
        limit_config = self._limits.get(path)
        if limit_config and request.method == 'POST':
            max_hits, window = limit_config
            client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else 'unknown')
            client_ip = client_ip.split(",")[0].strip()
            key = f"{client_ip}:{path}"
            now = time.time()
            with self._lock:
                self._hits[key] = [t for t in self._hits[key] if now - t < window]
                if len(self._hits[key]) >= max_hits:
                    return JSONResponse({"detail": "Too many requests. Please try again later."}, status_code=429)
                self._hits[key].append(now)
        return await call_next(request)


app.add_middleware(RateLimiterMiddleware)

# Include All Routers
app.include_router(auth_router)
app.include_router(user_router)
app.include_router(products_router)
app.include_router(cart_router)
app.include_router(orders_router)
app.include_router(admin_router)
app.include_router(analytics_router)
app.include_router(geolocation_router)
app.include_router(contact_router)
app.include_router(reviews_router)
app.include_router(coupons_router)

# Mount Uploads directory
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# Mount React Frontend Build (Serve at root / for fullstack deployment)
FRONTEND_BUILD_DIR = ROOT_DIR.parent / "frontend" / "build"
if FRONTEND_BUILD_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_BUILD_DIR), html=True), name="frontend")
else:
    logger.warning(f"Frontend build directory not found at {FRONTEND_BUILD_DIR}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8001, reload=True)
