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

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

# Initialize DB engine
load_dotenv()
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from database import init_engine
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

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize PostgreSQL Async Engine + Supabase Storage
    logger.info("Starting DurgaShakti Foils Server (Supabase PostgreSQL)...")
    init_engine()
    from storage_service import ensure_bucket_exists
    await ensure_bucket_exists()
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
        response.headers["X-XSS-Protection"] = "1; mode=block"
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
