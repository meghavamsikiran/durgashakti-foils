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
    await create_tables()
    from storage_service import ensure_bucket_exists
    await ensure_bucket_exists()
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
        from models import OrderModel, ProductModel, UserModel
        from sqlalchemy import select
        from deps import send_email, create_notification
        from email_templates import order_cancelled_email
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

                            logger.info(f"Auto-cancelling expired pending order {order.order_number} (created at {order.created_at})")
                            
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

                            # Update order status
                            order.order_status = "cancelled"
                            order.payment_status = "failed"
                            order.stock_applied = False
                            order.updated_at = datetime.now(timezone.utc)

                            # Create customer notification if user exists
                            if order.user_id:
                                await create_notification(
                                    session,
                                    str(order.user_id),
                                    "Order Cancelled (Payment Timeout)",
                                    f"Your order {order.order_number} has been automatically cancelled because the payment was not completed within the 15-minute window.",
                                    "order"
                                )

                                # Send cancellation email
                                user_stmt = select(UserModel).where(UserModel.id == order.user_id)
                                user_res = await session.execute(user_stmt)
                                user = user_res.scalar_one_or_none()
                                if user and user.email:
                                    try:
                                        subj, body = order_cancelled_email(
                                            user.full_name or user.email,
                                            str(order.order_number),
                                            float(order.total_amount or 0)
                                        )
                                        # Customize template subject and body content for payment timeout
                                        subj = f"Order Cancelled (Payment Timeout) - {order.order_number}"
                                        body = body.replace(
                                            "your order has been cancelled.",
                                            "your order has been automatically cancelled because the payment was not completed within the 15-minute window."
                                        )
                                        asyncio.create_task(send_email(user.email, subj, body))
                                    except Exception:
                                        logger.exception(f"Failed to send email for auto-cancelled order {order.order_number}")

                        if expired_orders:
                            await session.commit()
                except Exception:
                    logger.exception("Pending payment cleanup task failed")
                # Check for expired payments every 60 seconds
                await asyncio.sleep(60)

        asyncio.create_task(_payment_timeout_cleanup_loop())
    except Exception:
        logger.exception("Failed to start payment timeout cleanup task")
    yield
    # Shutdown
    logger.info("DurgaShakti Foils Server Shutdown.")


app = FastAPI(lifespan=lifespan)

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
