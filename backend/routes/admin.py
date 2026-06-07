"""Admin management routes."""
from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func, or_, and_, String
from typing import Optional, List
from sqlalchemy.orm.attributes import flag_modified
from pydantic import BaseModel
from urllib.parse import quote
from database import get_db
from models import (
    ProductModel, OrderModel, UserModel, SettingModel,
    StockHistoryModel, AuditLogModel,
    CategoryModel, AddressModel, ProductReviewModel
)
from deps import (
    UserSchema, ProductSchema, ProductBulkCreateRequest,
    AdminCreateRequest, AdminUpdateRequest, PasswordResetRequest,
    require_permission, sanitize_search_term, is_super_admin_role,
    write_audit_log, row_to_dict, normalize_order_status,
    ORDER_STATUS_TRANSITIONS, UPLOADS_DIR, validate_uuid, is_valid_uuid,
    create_notification, ensure_category_exists, sync_product_categories
)
from storage_service import upload_image, upload_media, delete_asset
from coupon_maintenance import cleanup_expired_coupons
import database
import uuid
from datetime import datetime, timezone
import pandas as pd
from io import BytesIO
import os
import json
import logging
import asyncio

router = APIRouter(prefix="/api")

REFUND_AUDIT_ACTIONS = {
    "PAYMENT_RAZORPAY_REFUND_CREATED",
    "PAYMENT_RAZORPAY_REFUND_INITIATED",
    "PAYMENT_RAZORPAY_REFUND_PENDING",
    "PAYMENT_RAZORPAY_REFUND_FAILED",
    "PAYMENT_RAZORPAY_REFUND_RECONCILED",
    "PAYMENT_RAZORPAY_REFUND_WEBHOOK",
    "ORDER_RAZORPAY_REFUND_RETRY_PENDING",
    "ORDER_RAZORPAY_REFUND_RETRY_FAILED",
    "ORDER_RAZORPAY_REFUND_RETRY_INITIATED",
    "ORDER_RAZORPAY_REFUND_RETRIED",
    "ORDER_REFUND_STATUS_CORRECTED_PENDING_CONFIRMATION",
}


def _payment_status_lower(order: OrderModel) -> str:
    return str(order.payment_status or "").lower()


def _is_refund_bank_confirmed(meta: dict | None) -> bool:
    if not isinstance(meta, dict):
        return False
    if meta.get("has_bank_reference") is True:
        return True
    acquirer_data = meta.get("acquirer_data") or {}
    if isinstance(acquirer_data, dict):
        for key in ("arn", "rrn", "utr", "bank_reference_number", "bank_transaction_id"):
            if str(acquirer_data.get(key) or "").strip():
                return True
    return False


async def _latest_refund_logs_for_orders(db: AsyncSession, order_ids: list[str]) -> dict[str, AuditLogModel]:
    if not order_ids:
        return {}
    res = await db.execute(
        select(AuditLogModel)
        .where(
            AuditLogModel.target_type == "order",
            AuditLogModel.target_id.in_(order_ids),
            AuditLogModel.action.in_(list(REFUND_AUDIT_ACTIONS)),
        )
        .order_by(AuditLogModel.created_at.desc())
    )
    latest: dict[str, AuditLogModel] = {}
    for log in res.scalars().all():
        latest.setdefault(str(log.target_id), log)
    return latest


async def _normalize_refund_rows(db: AsyncSession, orders: list[OrderModel]) -> dict[str, AuditLogModel]:
    refund_orders = [
        order for order in orders
        if _payment_status_lower(order) in {"refund_pending", "refund_failed", "refunded"}
        or str(order.order_status or "").lower() in {"return_approved", "refunded"}
    ]
    latest_logs = await _latest_refund_logs_for_orders(db, [str(order.id) for order in refund_orders])
    now = datetime.now(timezone.utc)

    for order in refund_orders:
        latest = latest_logs.get(str(order.id))
        meta = latest.metadata_ if latest else {}
        payment_status = _payment_status_lower(order)
        order_status = str(order.order_status or "").lower()

        if payment_status == "refunded" or order_status == "refunded":
            if not _is_refund_bank_confirmed(meta):
                order.payment_status = "refund_pending"
                order.order_status = "return_approved"
                order.updated_at = now
                await write_audit_log(
                    db,
                    "ORDER_REFUND_STATUS_CORRECTED_PENDING_CONFIRMATION",
                    "system",
                    "order",
                    str(order.id),
                    {
                        "reason": "Refund was previously marked credited before bank confirmation was available.",
                        "latest_refund_audit_action": latest.action if latest else None,
                        "latest_refund_audit_metadata": meta,
                    },
                )
    if refund_orders:
        await db.flush()
    return latest_logs


def _order_response_dict(order: OrderModel, latest_refund_log: AuditLogModel | None = None) -> dict:
    data = row_to_dict(order)
    payment_status = str(data.get("payment_status") or "").lower()
    meta = latest_refund_log.metadata_ if latest_refund_log else {}
    error = meta.get("error") if isinstance(meta, dict) else None

    if payment_status == "refund_failed":
        data["refund_display_status"] = "failed"
        data["refund_status_label"] = "Refund Failed"
        data["refund_error"] = error or "Razorpay refund failed. Please retry after resolving the issue."
    elif payment_status == "refund_pending":
        data["refund_display_status"] = "initiated"
        data["refund_status_label"] = "Refund Initiated"
        data["refund_error"] = error if error and str(latest_refund_log.action or "").endswith("_FAILED") else None
    elif payment_status == "refunded":
        data["refund_display_status"] = "credited"
        data["refund_status_label"] = "Refund Credited"
        data["refund_error"] = None
    return data

def generate_tracking_url(courier: str, tracking_number: str) -> str:
    if not tracking_number:
        return ""
    c_lower = courier.lower().strip()
    if "india post" in c_lower or "speed post" in c_lower:
        return f"https://t.17track.net/en#nums={tracking_number}"
    elif "dtdc" in c_lower:
        return f"https://www.dtdc.in/tracking/tracking_results.asp?pinno={tracking_number}"
    elif "blue dart" in c_lower:
        return f"https://www.bluedart.com/tracking?trackid={tracking_number}"
    elif "delhivery" in c_lower:
        return f"https://www.delhivery.com/track/package/{tracking_number}"
    elif "ecom express" in c_lower:
        return f"https://ecomexpress.in/tracking/?tracking_id={tracking_number}"
    elif "xpressbees" in c_lower:
        return f"https://www.xpressbees.com/track?tracking_id={tracking_number}"
    elif "professional couriers" in c_lower:
        return "http://www.tpcindia.com/Default.aspx"
    elif "shadowfax" in c_lower:
        return "https://www.shadowfax.in/"
    elif "ekart" in c_lower:
        return f"https://ekartlogistics.com/track/{tracking_number}"
    return ""


async def _process_return_refund_background(order_id: str, actor_id: str = "system") -> None:
    try:
        if not database.async_session_factory:
            logger.warning("Refund background task skipped; database session factory is unavailable")
            return
        from routes.orders import trigger_razorpay_refund

        # 1. Fetch order without lock to validate status and trigger external call
        async with database.async_session_factory() as session:
            res = await session.execute(
                select(OrderModel)
                .where(OrderModel.id == order_id)
            )
            order = res.scalar_one_or_none()
            if not order:
                return
            if str(order.payment_status or "").lower() not in {"paid", "completed", "refund_pending", "refund_failed"}:
                return
            if str(order.payment_method or "").lower() == "cod":
                return

            success, err_msg, refund_info = await trigger_razorpay_refund(order, session)
            await session.commit()

        # 2. Start new database transaction, query order with lock, update status and write audit logs
        async with database.async_session_factory() as session:
            res = await session.execute(
                select(OrderModel)
                .where(OrderModel.id == order_id)
                .with_for_update()
            )
            order = res.scalar_one_or_none()
            if not order:
                return

            if success:
                refund_status = str((refund_info or {}).get("status") or "").lower()
                order.payment_status = "refund_pending"
                order.order_status = "return_approved"
                order.updated_at = datetime.now(timezone.utc)
                await write_audit_log(
                    session,
                    "PAYMENT_RAZORPAY_REFUND_INITIATED",
                    actor_id,
                    "order",
                    order_id,
                    {
                        "razorpay_payment_id": order.razorpay_payment_id,
                        "razorpay_refund_id": (refund_info or {}).get("id"),
                        "refund_status": refund_status,
                        "amount": (refund_info or {}).get("amount"),
                    },
                )
            else:
                order.payment_status = "refund_failed"
                if str(order.order_status or "").lower() == "return_requested":
                    order.order_status = "return_approved"
                order.updated_at = datetime.now(timezone.utc)
                await write_audit_log(
                    session,
                    "PAYMENT_RAZORPAY_REFUND_FAILED",
                    actor_id,
                    "order",
                    order_id,
                    {
                        "razorpay_payment_id": order.razorpay_payment_id,
                        "error": err_msg,
                    },
                )
            await session.commit()
    except Exception:
        logger.exception("Background Razorpay refund task failed for order %s", order_id)

ROLE_TEMPLATE_LABELS = {
    "OPERATIONS_ADMIN": "Operations Admin",
    "ORDER_MANAGER": "Order Manager",
    "PRODUCT_MANAGER": "Product Manager",
    "INVENTORY_MANAGER": "Inventory Manager",
    "CUSTOMER_SUPPORT": "Customer Support Admin",
    "SHIPPING_MANAGER": "Shipping Manager",
    "FINANCE_ADMIN": "Finance Admin",
    "ANALYTICS_VIEWER": "Analytics Viewer",
    "CUSTOM": "Custom Admin",
}

PERMISSION_META_KEYS = {"is_first_login", "role_template"}


def liable_order_filter():
    return and_(
        func.lower(OrderModel.order_status) == "delivered",
        ~func.lower(func.coalesce(OrderModel.payment_status, "")).in_(["refunded", "refund", "failed"]),
    )


def _normalize_role_template(value: Optional[str]) -> str:
    key = str(value or "CUSTOM").upper()
    return key if key in ROLE_TEMPLATE_LABELS else "CUSTOM"


def _admin_role_label(user: UserModel) -> str:
    if user.role == "SUPER_ADMIN":
        return "Super Admin"
    permissions = user.permissions or {}
    template_key = _normalize_role_template(permissions.get("role_template"))
    return ROLE_TEMPLATE_LABELS.get(template_key, "Custom Admin")


def _admin_permission_count(user: UserModel) -> int:
    permissions = user.permissions or {}
    return sum(1 for key, value in permissions.items() if key not in PERMISSION_META_KEYS and value is True)


def _prepare_admin_user(user: UserModel) -> dict:
    data = row_to_dict(user)
    data.pop("password", None)
    permissions = dict(data.get("permissions") or {})
    if user.role != "SUPER_ADMIN":
        permissions["role_template"] = _normalize_role_template(permissions.get("role_template"))
        data["permissions"] = permissions
    data["admin_id"] = str(user.id)
    data["role_label"] = _admin_role_label(user)
    data["permission_count"] = _admin_permission_count(user)
    return data


def _format_updated_by(item: dict) -> None:
    name = item.get("actor_name") or "System Process"
    role = item.get("actor_role_label") or item.get("actor_role") or "SYSTEM"
    item["updated_by_name_role"] = f"{name} ({role})"


async def _enrich_audit_actor_fields(db: AsyncSession, items: list[dict]) -> None:
    actor_ids = {str(it.get("actor_id")) for it in items if it.get("actor_id") and is_valid_uuid(str(it.get("actor_id")))}
    users = {}
    if actor_ids:
        users_q = await db.execute(select(UserModel).where(UserModel.id.in_(list(actor_ids))))
        users = {str(u.id): u for u in users_q.scalars().all()}

    for item in items:
        meta = item.get("metadata") or {}
        actor_id = str(item.get("actor_id") or "")
        user = users.get(actor_id)
        if user:
            item["actor_name"] = user.full_name or user.email or "Unknown"
            item["actor_email"] = user.email
            item["actor_role"] = user.role
            item["actor_role_label"] = _admin_role_label(user)
        else:
            item["actor_name"] = item.get("actor_name") or meta.get("actor_name") or "System Process"
            item["actor_email"] = item.get("actor_email") or meta.get("actor_email")
            item["actor_role"] = item.get("actor_role") or meta.get("actor_role") or "SYSTEM"
            item["actor_role_label"] = item.get("actor_role_label") or meta.get("actor_role_label") or item["actor_role"]
        _format_updated_by(item)


@router.get("/admin/products")
async def get_admin_products(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    stock: Optional[str] = Query(None),
    admin: UserSchema = Depends(require_permission("view_products")),
    db: AsyncSession = Depends(get_db)
):
    search = sanitize_search_term(search)
    q = select(ProductModel, func.count(ProductModel.id).over().label('total_count'))

    filter_clause = None
    if search:
        like_term = f"%{search}%"
        filter_clause = or_(
            ProductModel.name.ilike(like_term),
            ProductModel.batch_no.ilike(like_term),
            ProductModel.variant_sku.ilike(like_term),
            ProductModel.category.ilike(like_term),
        )
        q = q.where(filter_clause)

    # Additional admin filters
    if category:
        q = q.where(ProductModel.category == category)
    if is_active is not None:
        q = q.where(ProductModel.is_active == bool(is_active))
    if stock:
        s = stock.lower()
        if s == 'in':
            q = q.where(ProductModel.in_stock == True)
        elif s == 'out':
            q = q.where(ProductModel.in_stock == False)
        elif s == 'low':
            q = q.where(and_(ProductModel.stock_quantity <= ProductModel.low_stock_threshold, ProductModel.stock_quantity > 0))

    offset = (page - 1) * limit
    result = await db.execute(
        q.order_by(ProductModel.created_at.desc()).offset(offset).limit(limit)
    )
    rows = result.all()

    total = 0
    if rows:
        total = rows[0][1]
    elif page > 1:
        fallback_q = select(func.count(ProductModel.id))
        if filter_clause is not None:
            fallback_q = fallback_q.where(filter_clause)
        if category:
            fallback_q = fallback_q.where(ProductModel.category == category)
        if is_active is not None:
            fallback_q = fallback_q.where(ProductModel.is_active == bool(is_active))
        if stock:
            s = stock.lower()
            if s == 'in':
                fallback_q = fallback_q.where(ProductModel.in_stock == True)
            elif s == 'out':
                fallback_q = fallback_q.where(ProductModel.in_stock == False)
            elif s == 'low':
                fallback_q = fallback_q.where(and_(ProductModel.stock_quantity <= ProductModel.low_stock_threshold, ProductModel.stock_quantity > 0))
        total = (await db.execute(fallback_q)).scalar() or 0

    products = [row_to_dict(row[0]) for row in rows]
    return {"items": products, "total": total, "page": page, "limit": limit}

# ── Products (Admin) ─────────────────────────────────────────────────────
@router.post("/admin/products")
async def create_product(product: ProductSchema, admin: UserSchema = Depends(require_permission("create_products")), db: AsyncSession = Depends(get_db)):
    await ensure_category_exists(db, product.category)
    p = ProductModel(
        id=product.id,
        name=product.name,
        description=product.description,
        size=product.size,
        thickness=product.thickness,
        price=product.price,
        discount_price=product.discount_price,
        badge=product.badge,
        image_url=product.image_url,
        media_urls=product.media_urls,
        features=product.features,
        in_stock=product.in_stock,
        stock_quantity=product.stock_quantity,
        category=product.category,
        batch_no=product.batch_no,
        width=product.width,
        is_active=product.is_active,
        variant_sku=product.batch_no,
        created_by=admin.id,
    )
    db.add(p)
    await db.flush()
    return product


@router.post("/admin/products/bulk")
async def create_product_bulk(payload: ProductBulkCreateRequest, admin: UserSchema = Depends(require_permission("create_products")), db: AsyncSession = Depends(get_db)):
    if not payload.variants:
        raise HTTPException(status_code=400, detail="At least one variant required")
    await ensure_category_exists(db, payload.category)

    skus = [v.sku for v in payload.variants]
    if len(skus) != len(set(skus)):
        raise HTTPException(status_code=400, detail="Duplicate SKUs in request")

    existing_res = await db.execute(select(ProductModel).where(or_(ProductModel.batch_no.in_(skus), ProductModel.variant_sku.in_(skus))))
    if existing_res.first():
        raise HTTPException(status_code=400, detail="SKU already exists")

    count = 0
    for v in payload.variants:
        if v.price <= 0:
            raise HTTPException(status_code=400, detail=f"Invalid price for {v.size}")
        p = ProductModel(
            id=str(uuid.uuid4()),
            name=f"{payload.name} {v.size}",
            description=payload.description,
            size=v.size,
            thickness=payload.thickness,
            price=v.price,
            discount_price=v.discount_price,
            image_url=payload.image_url,
            media_urls=payload.media_urls,
            features=payload.features,
            in_stock=v.in_stock and v.stock_quantity > 0,
            stock_quantity=v.stock_quantity,
            category=payload.category,
            batch_no=v.sku,
            width=payload.width,
            is_active=payload.is_active,
            base_name=payload.name,
            variant_sku=v.sku,
            created_by=admin.id,
        )
        db.add(p)
        count += 1
    await db.flush()
    await write_audit_log(db, "PRODUCT_BULK_CREATED", admin.id, "product", payload.name, {"count": count})
    return {"message": f"Created {count} variants", "created_count": count}


@router.put("/admin/products/{product_id}")
async def update_product(product_id: str, product_data: dict, admin: UserSchema = Depends(require_permission("edit_products")), db: AsyncSession = Depends(get_db)):
    validate_uuid(product_id)
    allowed = {'name', 'description', 'size', 'thickness', 'price', 'discount_price', 'badge', 'image_url', 'media_urls', 'features', 'in_stock', 'stock_quantity', 'category', 'batch_no', 'width', 'low_stock_threshold', 'is_active'}
    safe_data = {k: v for k, v in product_data.items() if k in allowed}
    if not safe_data:
        raise HTTPException(status_code=400, detail="No valid fields")

    res = await db.execute(select(ProductModel).where(ProductModel.id == product_id))
    p = res.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")

    if 'image_url' in safe_data and p.image_url != safe_data['image_url']:
        await delete_asset(p.image_url)
    if 'category' in safe_data:
        await ensure_category_exists(db, safe_data['category'])

    for k, v in safe_data.items():
        setattr(p, k, v)
    p.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await write_audit_log(db, "PRODUCT_UPDATED", admin.id, "product", product_id, {"fields": list(safe_data.keys())})
    return {"message": "Product updated"}


@router.delete("/admin/products/{product_id}")
async def delete_product(product_id: str, admin: UserSchema = Depends(require_permission("delete_products")), db: AsyncSession = Depends(get_db)):
    validate_uuid(product_id)
    res = await db.execute(select(ProductModel).where(ProductModel.id == product_id))
    p = res.scalar_one_or_none()
    if p:
        await delete_asset(p.image_url)
        for mu in (p.media_urls or []):
            await delete_asset(mu.get('url', ''))
        await db.delete(p)
        await db.flush()
        await write_audit_log(db, "PRODUCT_DELETED", admin.id, "product", product_id)
    return {"message": "Product deleted"}


# ── Categories (Admin) ───────────────────────────────────────────────────
@router.get("/admin/categories")
async def get_all_categories(admin: UserSchema = Depends(require_permission("view_products")), db: AsyncSession = Depends(get_db)):
    await sync_product_categories(db)
    result = await db.execute(select(CategoryModel).order_by(CategoryModel.name.asc()))
    categories = result.scalars().all()
    return [row_to_dict(c) for c in categories]


@router.post("/admin/categories")
async def create_category(payload: dict, admin: UserSchema = Depends(require_permission("create_products")), db: AsyncSession = Depends(get_db)):
    name = payload.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Category name is required")
        
    existing = await db.execute(select(CategoryModel).where(func.lower(CategoryModel.name) == name.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Category already exists")

    discount_percent = float(payload.get("global_discount_percent") or 0)
    if discount_percent < 0 or discount_percent > 100:
        raise HTTPException(status_code=400, detail="Global discount must be between 0 and 100")
        
    cat = CategoryModel(
        id=str(uuid.uuid4()),
        name=name,
        is_active=True,
        global_discount_enabled=bool(payload.get("global_discount_enabled", False)),
        global_discount_percent=discount_percent,
    )
    db.add(cat)
    await db.flush()
    await write_audit_log(db, "CATEGORY_CREATED", admin.id, "category", cat.id, {"name": name})
    return row_to_dict(cat)


@router.put("/admin/categories/{category_id}")
async def update_category(category_id: str, payload: dict, admin: UserSchema = Depends(require_permission("edit_products")), db: AsyncSession = Depends(get_db)):
    validate_uuid(category_id)
    res = await db.execute(select(CategoryModel).where(CategoryModel.id == category_id))
    cat = res.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
        
    name = payload.get("name", "").strip()
    if "name" in payload:
        if not name:
            raise HTTPException(status_code=400, detail="Category name cannot be empty")
        
        if name != cat.name:
            existing = await db.execute(select(CategoryModel).where(func.lower(CategoryModel.name) == name.lower()))
            existing_cat = existing.scalar_one_or_none()
            if existing_cat and str(existing_cat.id) != str(cat.id):
                raise HTTPException(status_code=400, detail="Another category with this name already exists")
        old_name = cat.name
        cat.name = name
        await db.execute(
            update(ProductModel)
            .where(ProductModel.category == old_name)
            .values(category=name)
        )
        
    if "is_active" in payload:
        cat.is_active = bool(payload["is_active"])
    if "global_discount_enabled" in payload:
        cat.global_discount_enabled = bool(payload["global_discount_enabled"])
    if "global_discount_percent" in payload:
        discount_percent = float(payload.get("global_discount_percent") or 0)
        if discount_percent < 0 or discount_percent > 100:
            raise HTTPException(status_code=400, detail="Global discount must be between 0 and 100")
        cat.global_discount_percent = discount_percent
        
    cat.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await write_audit_log(db, "CATEGORY_UPDATED", admin.id, "category", category_id, {"name": cat.name, "is_active": cat.is_active, "global_discount_enabled": cat.global_discount_enabled, "global_discount_percent": float(cat.global_discount_percent or 0)})
    return row_to_dict(cat)


@router.delete("/admin/categories/{category_id}")
async def delete_category(category_id: str, admin: UserSchema = Depends(require_permission("delete_products")), db: AsyncSession = Depends(get_db)):
    validate_uuid(category_id)
    res = await db.execute(select(CategoryModel).where(CategoryModel.id == category_id))
    cat = res.scalar_one_or_none()
    if cat:
        await db.execute(
            update(ProductModel)
            .where(ProductModel.category == cat.name)
            .values(category=None)
        )
        await db.delete(cat)
        await db.flush()
        await write_audit_log(db, "CATEGORY_DELETED", admin.id, "category", category_id)
    return {"message": "Category deleted successfully"}


@router.put("/admin/products/{product_id}/status")
async def toggle_product_status(product_id: str, payload: dict, admin: UserSchema = Depends(require_permission("edit_products")), db: AsyncSession = Depends(get_db)):
    validate_uuid(product_id)
    res = await db.execute(select(ProductModel).where(ProductModel.id == product_id))
    product = res.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    is_active = bool(payload.get("is_active", True))
    product.is_active = is_active
    product.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await write_audit_log(db, "PRODUCT_STATUS_TOGGLED", admin.id, "product", product_id, {"is_active": is_active})
    return {"message": "Product status updated", "is_active": is_active}


# ── Orders (Admin) ───────────────────────────────────────────────────────
@router.get("/admin/orders")
async def get_all_orders(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None, alias="status_filter"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    courier: Optional[str] = Query(None),
    tracking_number: Optional[str] = Query(None),
    shipment_status: Optional[str] = Query(None),
    payment_status: Optional[str] = Query(None),
    payment_method: Optional[str] = Query(None),
    admin: UserSchema = Depends(require_permission("view_orders")),
    db: AsyncSession = Depends(get_db)
):
    from routes.orders import enforce_return_deadlines, enforce_payment_timeouts
    await enforce_return_deadlines(db)
    await enforce_payment_timeouts(db)
    search = sanitize_search_term(search)
    
    # Pre-parse date parameters
    sd_dt = None
    if start_date:
        try:
            sd = start_date.rstrip('Z')
            sd_dt = datetime.fromisoformat(sd)
            if sd_dt.tzinfo is None:
                sd_dt = sd_dt.replace(tzinfo=timezone.utc)
        except Exception:
            pass

    ed_dt = None
    if end_date:
        try:
            ed = end_date.rstrip('Z')
            ed_dt = datetime.fromisoformat(ed)
            if ed_dt.tzinfo is None:
                ed_dt = ed_dt.replace(tzinfo=timezone.utc)
        except Exception:
            pass

    # Build filters
    filters = []
    if status and status.upper() != "ALL":
        filters.append(func.lower(OrderModel.order_status) == status.lower())
    if courier:
        filters.append(or_(
            func.lower(OrderModel.carrier) == courier.lower(),
            func.lower(OrderModel.courier_name) == courier.lower()
        ))
    if tracking_number:
        filters.append(or_(
            OrderModel.tracking_id.ilike(f"%{tracking_number}%"),
            OrderModel.tracking_number.ilike(f"%{tracking_number}%")
        ))
    if shipment_status:
        filters.append(func.lower(OrderModel.shipment_status) == shipment_status.lower())
    if payment_status:
        filters.append(func.lower(OrderModel.payment_status) == payment_status.lower())
    if payment_method:
        filters.append(func.lower(OrderModel.payment_method) == payment_method.lower())
    if search:
        like_term = f"%{search}%"
        clause = or_(
            OrderModel.order_number.ilike(like_term),
            OrderModel.customer_name.ilike(like_term),
            OrderModel.tracking_id.ilike(like_term),
            OrderModel.tracking_number.ilike(like_term),
            OrderModel.razorpay_payment_id.ilike(like_term),
            OrderModel.razorpay_order_id.ilike(like_term),
            func.cast(OrderModel.user_id, String).ilike(like_term),
        )
        filters.append(clause)
    if sd_dt:
        filters.append(OrderModel.created_at >= sd_dt)
    if ed_dt:
        filters.append(OrderModel.created_at <= ed_dt)

    # 1. Fast count query
    count_q = select(func.count(OrderModel.id)).where(*filters)
    total = (await db.execute(count_q)).scalar() or 0

    # 2. Page fetch query
    offset = (page - 1) * limit
    q = select(OrderModel).where(*filters).order_by(OrderModel.created_at.desc()).offset(offset).limit(limit)
    res = await db.execute(q)
    orders = res.scalars().all()
    latest_refund_logs = await _normalize_refund_rows(db, orders)
    items = [_order_response_dict(order, latest_refund_logs.get(str(order.id))) for order in orders]
    return {"items": items, "total": total, "page": page, "limit": limit}


async def _send_order_email_background(order_id: str, user_id: str, effective_status: str, admin_message: str):
    from database import async_session_factory
    from sqlalchemy import select as _sel
    from models import UserModel as _UM, OrderModel as _OM
    from deps import send_email as _send, row_to_dict, create_notification
    from email_templates import (
        order_shipped_email, order_delivered_email,
        return_approved_email, return_rejected_email,
        order_cancelled_email,
    )
    
    # Wait a tiny bit to make sure the main request transaction has committed
    await asyncio.sleep(0.5)
    
    async with async_session_factory() as db:
        try:
            user_res = await db.execute(_sel(_UM).where(_UM.id == user_id))
            cust = user_res.scalar_one_or_none()
            if not cust:
                return
                
            order_res = await db.execute(_sel(_OM).where(_OM.id == order_id))
            order = order_res.scalar_one_or_none()
            if not order:
                return

            readable_status = effective_status.replace("_", " ").title()
            await create_notification(
                db,
                str(cust.id),
                f"Order {readable_status}",
                f"Your order {order.order_number} is now {readable_status}.",
                "order"
            )
            await db.commit()
                
            order_dict = row_to_dict(order)
            cust_name = cust.full_name or cust.email
            subj = body = att = None
            
            if effective_status == "shipped":
                subj, body = order_shipped_email(cust_name, order_dict)
            elif effective_status == "delivered":
                subj, body, att = order_delivered_email(cust_name, order_dict)
            elif effective_status == "return_approved":
                subj, body = return_approved_email(cust_name, str(order.order_number), float(order.total_amount or 0))
            elif effective_status == "return_rejected":
                subj, body = return_rejected_email(cust_name, str(order.order_number), admin_message)
            elif effective_status == "cancelled":
                subj, body = order_cancelled_email(cust_name, str(order.order_number), float(order.total_amount or 0))
                
            if subj and body:
                await _send(cust.email, subj, body, attachments=att)
        except Exception:
            logger.exception("Failed to send transactional email in background")


@router.put("/admin/orders/{order_id}/status")
async def update_order_status(order_id: str, status_data: dict, admin: UserSchema = Depends(require_permission("update_order_status")), db: AsyncSession = Depends(get_db)):
    validate_uuid(order_id)
    res = await db.execute(select(OrderModel).where(OrderModel.id == order_id))
    order = res.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    prev_status = (order.order_status or "processing").lower()
    new_status = normalize_order_status(status_data.get("status"))
    if new_status not in ORDER_STATUS_TRANSITIONS:
        raise HTTPException(status_code=400, detail="Invalid status")

    valid_trans = ORDER_STATUS_TRANSITIONS.get(prev_status, [])
    if new_status not in valid_trans:
        raise HTTPException(status_code=400, detail=f"Cannot transition from {prev_status} to {new_status}")

    now = datetime.now(timezone.utc)
    payment_method_lower = str(order.payment_method or "").lower()
    payment_status_lower = str(order.payment_status or "").lower()
    if payment_method_lower != "cod" and payment_status_lower not in ("paid", "completed", "refund_pending", "refund_failed", "refunded"):
        if new_status not in ("cancelled", "overdue"):
            raise HTTPException(status_code=400, detail="Cannot advance unpaid order")

    applied = bool(order.stock_applied)
    if new_status == "confirmed" and not applied:
        items_to_deduct = [item for item in (order.items or []) if item.get("product_id") and is_valid_uuid(item.get("product_id")) and int(item.get("quantity", 0)) > 0]
        if items_to_deduct:
            prod_ids = [item.get("product_id") for item in items_to_deduct]
            p_res = await db.execute(select(ProductModel).where(ProductModel.id.in_(prod_ids)).with_for_update())
            locked_products = {str(p.id): p for p in p_res.scalars().all()}
            for item in items_to_deduct:
                pid = item.get("product_id")
                qty = int(item.get("quantity", 0))
                p = locked_products.get(str(pid))
                if p:
                    if int(p.stock_quantity or 0) < qty:
                        raise HTTPException(status_code=400, detail=f"Insufficient stock for {p.name}")
                    p.stock_quantity = max(0, int(p.stock_quantity or 0) - qty)
                    p.units_sold = int(p.units_sold or 0) + qty
                    p.updated_at = now
                    if p.stock_quantity <= 0:
                        p.in_stock = False
        order.stock_applied = True

    if new_status in {"cancelled", "refunded", "return_approved"} and applied:
        should_release = True
        if new_status == "return_approved":
            should_release = bool(status_data.get("restock", False))
            
        if should_release:
            items_to_release = [item for item in (order.items or []) if item.get("product_id") and is_valid_uuid(item.get("product_id")) and int(item.get("quantity", 0)) > 0]
            if items_to_release:
                prod_ids = [item.get("product_id") for item in items_to_release]
                p_res = await db.execute(select(ProductModel).where(ProductModel.id.in_(prod_ids)).with_for_update())
                locked_products = {str(p.id): p for p in p_res.scalars().all()}
                for item in items_to_release:
                    pid = item.get("product_id")
                    qty = int(item.get("quantity", 0))
                    p = locked_products.get(str(pid))
                    if p:
                        p.stock_quantity = int(p.stock_quantity or 0) + qty
                        p.units_sold = max(0, int(p.units_sold or 0) - qty)
                        p.in_stock = True
                        p.updated_at = now
        order.stock_applied = False

    effective_status = new_status
    refund_warning = None
    should_schedule_refund = False
    if new_status == "return_approved":
        effective_status = "return_approved"
        # Sync all pending return items to approved
        updated_items = []
        for item in (order.items or []):
            if item.get("return_status") == "RETURN_REQUESTED":
                item["return_status"] = "RETURN_APPROVED"
                if "audit_timeline" not in item:
                    item["audit_timeline"] = []
                item["audit_timeline"].append({
                    "status": "RETURN_APPROVED",
                    "timestamp": now.isoformat(),
                    "remarks": status_data.get("admin_message") or "Return approved by order-level status change"
                })
            updated_items.append(item)
        order.items = updated_items
        flag_modified(order, "items")
        
    if new_status == "return_rejected":
        effective_status = "return_rejected"
        # Sync all pending return items to rejected
        updated_items = []
        for item in (order.items or []):
            if item.get("return_status") == "RETURN_REQUESTED":
                item["return_status"] = "RETURN_REJECTED"
                if "audit_timeline" not in item:
                    item["audit_timeline"] = []
                item["audit_timeline"].append({
                    "status": "RETURN_REJECTED",
                    "timestamp": now.isoformat(),
                    "remarks": status_data.get("admin_message") or "Return rejected by order-level status change"
                })
            updated_items.append(item)
        order.items = updated_items
        flag_modified(order, "items")

    order.order_status = effective_status
    order.updated_at = now
    
    warning_message = None
    
    if new_status == "shipped":
        carrier = str(status_data.get("carrier") or status_data.get("courier_name") or "").strip()
        tracking_id = str(status_data.get("tracking_id") or status_data.get("tracking_number") or "").strip()
        if not carrier:
            raise HTTPException(status_code=400, detail="Courier name is required before marking an order shipped")
        if not tracking_id:
            raise HTTPException(status_code=400, detail="Tracking Number is required before marking an order shipped")
            
        dup_res = await db.execute(
            select(OrderModel).where(
                or_(OrderModel.tracking_id == tracking_id, OrderModel.tracking_number == tracking_id),
                OrderModel.id != order.id
            )
        )
        if dup_res.scalars().first():
            warning_message = f"Warning: Tracking number '{tracking_id}' is already assigned to another order."

        order.carrier = carrier
        order.courier_name = carrier
        order.tracking_id = tracking_id
        order.tracking_number = tracking_id
        
        gen_url = generate_tracking_url(carrier, tracking_id)
        if gen_url:
            order.tracking_url = gen_url
        else:
            order.tracking_url = str(status_data.get("tracking_url") or "").strip() or None
            
        order.shipped_at = now
        order.shipment_date = now
        order.shipment_status = "shipped"
        
        if status_data.get("expected_delivery_date"):
            try:
                dt_str = status_data.get("expected_delivery_date").rstrip('Z')
                order.expected_delivery_date = datetime.fromisoformat(dt_str)
            except Exception:
                pass
        if status_data.get("shipment_notes"):
            order.shipment_notes = status_data.get("shipment_notes")
            
    elif new_status == "packaging":
        order.shipment_status = "packed"
    elif new_status == "in_transit":
        order.shipment_status = "in_transit"
    elif new_status == "out_for_delivery":
        order.shipment_status = "out_for_delivery"
    elif new_status == "delivered":
        order.delivered_at = now
        order.shipment_status = "delivered"
        if payment_method_lower == "cod" and status_data.get("mark_paid", True):
            order.payment_status = "Paid"
    elif new_status == "failed":
        order.shipment_status = "failed"
    elif new_status == "returned":
        order.shipment_status = "returned"
        
    if status_data.get("admin_message"):
        order.admin_message = status_data["admin_message"]

    await db.flush()
    await write_audit_log(db, "ORDER_STATUS_UPDATED", admin.id, "order", order_id, {"from": prev_status, "to": effective_status})
    res_payload = {
        "message": f"Order status updated to {effective_status}",
        "order": _order_response_dict(order),
    }
    if warning_message:
        res_payload["warning"] = warning_message
    if refund_warning:
        res_payload["warning"] = refund_warning
    if should_schedule_refund:
        asyncio.create_task(_process_return_refund_background(str(order.id), str(admin.id)))

    if order.user_id:
        asyncio.create_task(
            _send_order_email_background(
                str(order.id),
                str(order.user_id),
                effective_status,
                status_data.get("admin_message", "")
            )
        )

    return res_payload


@router.put("/admin/orders/{order_id}/refund-retry")
@router.put("/admin/orders/{order_id}/refund-manual")
async def retry_order_refund(
    order_id: str,
    admin: UserSchema = Depends(require_permission("update_order_status")),
    db: AsyncSession = Depends(get_db)
):
    validate_uuid(order_id)
    res = await db.execute(select(OrderModel).where(OrderModel.id == order_id))
    order = res.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if str(order.payment_status or "").lower() not in {"refund_pending", "refund_failed"}:
        raise HTTPException(status_code=400, detail="Refund is not pending or failed for this order.")

    prev_payment_status = order.payment_status
    prev_order_status = order.order_status

    from routes.orders import trigger_razorpay_refund
    success, err_msg, refund_info = await trigger_razorpay_refund(order, db)
    if not success:
        order.order_status = "return_approved"
        order.payment_status = "refund_failed"
        order.updated_at = datetime.now(timezone.utc)
        await db.flush()
        await write_audit_log(
            db,
            "ORDER_RAZORPAY_REFUND_RETRY_FAILED",
            admin.id,
            "order",
            order_id,
            {
                "prev_payment_status": prev_payment_status,
                "prev_order_status": prev_order_status,
                "razorpay_payment_id": order.razorpay_payment_id,
                "error": err_msg,
            }
        )
        response_order = _order_response_dict(order)
        response_order["refund_error"] = err_msg
        return {
            "message": f"Razorpay refund failed: {err_msg}",
            "warning": f"Razorpay refund failed: {err_msg}",
            "order": response_order,
        }

    refund_status = str((refund_info or {}).get("status") or "").lower()
    order.payment_status = "refund_pending"
    order.order_status = "return_approved"
    order.updated_at = datetime.now(timezone.utc)

    await db.flush()
    await write_audit_log(
        db,
        "ORDER_RAZORPAY_REFUND_RETRY_INITIATED",
        admin.id,
        "order",
        order_id,
        {
            "prev_payment_status": prev_payment_status,
            "prev_order_status": prev_order_status,
            "razorpay_refund_id": (refund_info or {}).get("id"),
            "refund_status": refund_status,
            "amount": (refund_info or {}).get("amount"),
        }
    )

    message = "Razorpay refund has been initiated and is pending bank confirmation."
    return {"message": message, "order": _order_response_dict(order)}


@router.put("/admin/orders/{order_id}/confirm-manual-refund")
async def confirm_manual_refund(
    order_id: str,
    admin: UserSchema = Depends(require_permission("update_order_status")),
    db: AsyncSession = Depends(get_db)
):
    """Mark a manual refund as completed after admin has paid the customer via UPI/bank transfer."""
    validate_uuid(order_id)
    res = await db.execute(select(OrderModel).where(OrderModel.id == order_id))
    order = res.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if str(order.payment_status or "").lower() not in {"refund_pending", "refund_failed"}:
        raise HTTPException(status_code=400, detail="Refund is not pending for this order.")

    prev_payment_status = order.payment_status
    order.payment_status = "refunded"
    order.order_status = "refunded"
    order.updated_at = datetime.now(timezone.utc)

    # Trigger stock release if it was not released yet
    from routes.orders import _release_stock_once
    await _release_stock_once(order, db, datetime.now(timezone.utc))

    await db.flush()
    await write_audit_log(
        db,
        "MANUAL_REFUND_CONFIRMED",
        admin.id,
        "order",
        order_id,
        {
            "prev_payment_status": prev_payment_status,
            "confirmed_by": str(admin.id),
        }
    )

    # Send Notification and Email Invoice to user
    try:
        from sqlalchemy import select as _sel
        from models import UserModel as _UM
        user_res = await db.execute(_sel(_UM).where(_UM.id == order.user_id))
        cust = user_res.scalar_one_or_none()
        if cust:
            await create_notification(
                db,
                str(cust.id),
                "Refund credited",
                f"Your refund for order {order.order_number} has been credited successfully.",
                "order"
            )
            from deps import send_email, row_to_dict
            from email_templates import refund_credited_email
            
            # Enrich items
            order_dict = row_to_dict(order)
            from routes.orders import _enrich_order_items
            enriched_order = await _enrich_order_items(db, order_dict)
            
            # Identify refunded items
            refunded_items = [i for i in enriched_order.get("items", []) if i.get("return_status") == "REFUND_COMPLETED"]
            if not refunded_items:
                refunded_items = [i for i in enriched_order.get("items", []) if i.get("return_status")]
            if not refunded_items:
                refunded_items = enriched_order.get("items", [])
                
            item_refund_total = sum(
                (float(i.get("refund_calculations", {}).get("refundable_amount") or 0.0) -
                 float(i.get("self_shipping_details", {}).get("courier_cost") or 0.0))
                if i.get("return_status") == "REFUND_COMPLETED"
                else float(i.get("refund_calculations", {}).get("refundable_amount") or 0.0)
                for i in refunded_items
            )
            courier_total = sum(float(i.get("self_shipping_details", {}).get("courier_cost") or 0.0) for i in refunded_items)
            
            subj, body, att = refund_credited_email(
                cust.full_name or cust.email,
                enriched_order,
                refunded_items,
                item_refund_total,
                courier_total
            )
            asyncio.create_task(send_email(cust.email, subj, body, attachments=att))
    except Exception as exc:
        logger.exception("Failed to send manual refund confirmation side effects: %s", exc)

    return {"message": "Manual refund has been confirmed and marked as completed.", "order": _order_response_dict(order)}


@router.get("/admin/orders/{order_id}/payment-vpa")
async def get_order_payment_vpa(
    order_id: str,
    admin: UserSchema = Depends(require_permission("view_orders")),
    db: AsyncSession = Depends(get_db)
):
    """Fetch the original payment VPA details from Razorpay for QR generation."""
    validate_uuid(order_id)
    res = await db.execute(select(OrderModel).where(OrderModel.id == order_id))
    order = res.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if not order.razorpay_payment_id:
        return {"vpa": None, "method": order.payment_method}
        
    from routes.orders import _get_razorpay_client
    client = _get_razorpay_client()
    if not client:
        return {"vpa": "mock_customer@upi", "method": "upi"}
        
    try:
        payment_info = await asyncio.to_thread(client.payment.fetch, order.razorpay_payment_id)
        return {
            "vpa": payment_info.get("vpa"),
            "method": payment_info.get("method"),
            "email": payment_info.get("email"),
            "contact": payment_info.get("contact")
        }
    except Exception as e:
        logger.error(f"Failed to fetch payment details from Razorpay: {e}")
        return {"vpa": None, "method": "unknown", "error": str(e)}




class BulkShipInput(BaseModel):
    courier: str
    expected_delivery_date: Optional[str] = None
    shipment_notes: Optional[str] = None
    shipments: Optional[List[dict]] = None
    pasted_text: Optional[str] = None

@router.post("/admin/orders/bulk-ship")
async def bulk_ship_orders(
    payload: BulkShipInput,
    admin: UserSchema = Depends(require_permission("update_order_status")),
    db: AsyncSession = Depends(get_db)
):
    courier = payload.courier.strip()
    if not courier:
        raise HTTPException(status_code=400, detail="Courier is required")
        
    shipment_pairs = []
    
    # 1. Parse shipments list if provided
    if payload.shipments:
        for s in payload.shipments:
            o_num = str(s.get("order_number") or "").strip()
            t_num = str(s.get("tracking_number") or "").strip()
            if o_num and t_num:
                shipment_pairs.append((o_num, t_num))
                
    # 2. Parse pasted_text if provided (support various separators)
    if payload.pasted_text:
        import re
        lines = payload.pasted_text.strip().split("\n")
        for line in lines:
            line = line.strip()
            if not line:
                continue
            parts = re.split(r'[\s,\-\t]+', line, maxsplit=1)
            if len(parts) == 2:
                o_num = parts[0].strip()
                t_num = parts[1].strip()
                if o_num and t_num:
                    shipment_pairs.append((o_num, t_num))
            else:
                parts = [p.strip() for p in re.split(r'[\s\-]+', line) if p.strip()]
                if len(parts) >= 2:
                    shipment_pairs.append((parts[0], parts[1]))

    if not shipment_pairs:
        raise HTTPException(status_code=400, detail="No valid order number and tracking number pairs found")

    order_numbers = [p[0] for p in shipment_pairs]
    
    res = await db.execute(
        select(OrderModel).where(func.lower(OrderModel.order_number).in_([o.lower() for o in order_numbers]))
    )
    orders = res.scalars().all()
    orders_map = {o.order_number.lower(): o for o in orders}
    
    now = datetime.now(timezone.utc)
    success_count = 0
    errors = []
    warnings = []
    
    expected_date = None
    if payload.expected_delivery_date:
        try:
            expected_date = datetime.fromisoformat(payload.expected_delivery_date.rstrip('Z'))
        except Exception:
            pass
            
    for o_num_raw, tracking_number in shipment_pairs:
        o_key = o_num_raw.lower()
        if o_key not in orders_map:
            errors.append(f"Order '{o_num_raw}' not found")
            continue
            
        order = orders_map[o_key]
        prev_status = (order.order_status or "processing").lower()
        
        valid_trans = ORDER_STATUS_TRANSITIONS.get(prev_status, [])
        if "shipped" not in valid_trans and prev_status != "shipped":
            errors.append(f"Order '{order.order_number}' cannot be transitioned to Shipped from status '{prev_status}'")
            continue
            
        dup_res = await db.execute(
            select(OrderModel).where(
                or_(OrderModel.tracking_id == tracking_number, OrderModel.tracking_number == tracking_number),
                OrderModel.id != order.id
            )
        )
        if dup_res.scalars().first():
            warnings.append(f"Tracking number '{tracking_number}' is already assigned to another order (assigned to '{order.order_number}')")

        if prev_status in ("placed", "processing", "confirmed", "packaging") and not order.stock_applied:
            items_to_deduct = [item for item in (order.items or []) if item.get("product_id") and is_valid_uuid(item.get("product_id")) and int(item.get("quantity", 0)) > 0]
            if items_to_deduct:
                prod_ids = [item.get("product_id") for item in items_to_deduct]
                p_res = await db.execute(select(ProductModel).where(ProductModel.id.in_(prod_ids)).with_for_update())
                locked_products = {str(p.id): p for p in p_res.scalars().all()}
                insufficient_stock = False
                for item in items_to_deduct:
                    pid = item.get("product_id")
                    qty = int(item.get("quantity", 0))
                    p = locked_products.get(str(pid))
                    if p:
                        if int(p.stock_quantity or 0) < qty:
                            errors.append(f"Insufficient stock for product '{p.name}' in order '{order.order_number}'")
                            insufficient_stock = True
                            break
                if insufficient_stock:
                    continue
                    
                for item in items_to_deduct:
                    pid = item.get("product_id")
                    qty = int(item.get("quantity", 0))
                    p = locked_products.get(str(pid))
                    if p:
                        p.stock_quantity = max(0, int(p.stock_quantity or 0) - qty)
                        p.units_sold = int(p.units_sold or 0) + qty
                        p.updated_at = now
                        if p.stock_quantity <= 0:
                            p.in_stock = False
            order.stock_applied = True

        order.order_status = "shipped"
        order.carrier = courier
        order.courier_name = courier
        order.tracking_id = tracking_number
        order.tracking_number = tracking_number
        
        gen_url = generate_tracking_url(courier, tracking_number)
        if gen_url:
            order.tracking_url = gen_url
        else:
            order.tracking_url = None
            
        order.shipped_at = now
        order.shipment_date = now
        order.shipment_status = "shipped"
        order.updated_at = now
        
        if expected_date:
            order.expected_delivery_date = expected_date
        if payload.shipment_notes:
            order.shipment_notes = payload.shipment_notes
            
        await write_audit_log(db, "ORDER_STATUS_UPDATED", admin.id, "order", str(order.id), {"from": prev_status, "to": "shipped", "via": "bulk"})
        
        try:
            user_res = await db.execute(select(UserModel).where(UserModel.id == order.user_id))
            cust = user_res.scalar_one_or_none()
            if cust:
                await create_notification(
                    db,
                    str(cust.id),
                    "Order Shipped",
                    f"Your order {order.order_number} has been shipped via {courier}.",
                    "order"
                )
                import asyncio
                from deps import send_email as _send
                from email_templates import order_shipped_email
                order_dict = row_to_dict(order)
                cust_name = cust.full_name or cust.email
                subj, body = order_shipped_email(cust_name, order_dict)
                if subj and body:
                    asyncio.create_task(_send(cust.email, subj, body))
        except Exception:
            pass
            
        success_count += 1
        
    await db.flush()
    return {
        "message": f"Successfully shipped {success_count} orders",
        "success_count": success_count,
        "errors": errors,
        "warnings": warnings
    }


# ── Customers (Admin) ────────────────────────────────────────────────────
@router.get("/admin/customers")
async def list_customers(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    segment: Optional[str] = Query(None),
    admin: UserSchema = Depends(require_permission("view_customers")),
    db: AsyncSession = Depends(get_db)
):
    search = sanitize_search_term(search)
    loyalty_res = await db.execute(select(SettingModel).where(SettingModel.key == "loyalty_settings"))
    loyalty_setting = loyalty_res.scalar_one_or_none()
    loyalty_config = {"enabled": True, "minimum_orders": 10, "minimum_spend": 15000.0, "criteria_mode": "either"}
    if loyalty_setting and isinstance(loyalty_setting.value, dict):
        loyalty_config.update(loyalty_setting.value)
    loyalty_enabled = loyalty_config.get("enabled", True) is not False
    min_orders = int(loyalty_config.get("minimum_orders") if loyalty_config.get("minimum_orders") is not None else 10)
    min_spend = float(loyalty_config.get("minimum_spend") if loyalty_config.get("minimum_spend") is not None else 15000.0)
    criteria_mode = loyalty_config.get("criteria_mode") if loyalty_config.get("criteria_mode") in {"either", "both", "orders_only", "spend_only"} else "either"

    eligible_order = liable_order_filter()
    orders_expr = func.count(OrderModel.id).filter(eligible_order)
    spend_expr = func.coalesce(func.sum(OrderModel.total_amount).filter(eligible_order), 0)

    loyal_segment = segment == "loyal"

    if not loyal_segment:
        # Fast path: paginate users first, then aggregate order stats for the page only
        user_filters = [UserModel.role == "customer"]
        if search:
            like_term = f"%{search}%"
            clause = or_(
                UserModel.full_name.ilike(like_term),
                UserModel.email.ilike(like_term),
                UserModel.phone.ilike(like_term)
            )
            user_filters.append(clause)

        total_q = select(func.count(UserModel.id)).where(*user_filters)
        total = (await db.execute(total_q)).scalar() or 0

        offset = (page - 1) * limit
        users_q = select(UserModel).where(*user_filters).order_by(UserModel.created_at.desc()).offset(offset).limit(limit)
        res = await db.execute(users_q)
        users = res.scalars().all()

        user_ids = [u.id for u in users]
        stats_map = {}
        if user_ids:
            stats_q = (
                select(
                    OrderModel.user_id,
                    orders_expr.label("orders_count"),
                    spend_expr.label("total_spent")
                )
                .where(OrderModel.user_id.in_(user_ids))
                .group_by(OrderModel.user_id)
            )
            stats_res = await db.execute(stats_q)
            for uid, orders_count, total_spent in stats_res.all():
                stats_map[uid] = (int(orders_count or 0), float(total_spent or 0))

        rows_data = []
        for u in users:
            orders_count, total_spent = stats_map.get(u.id, (0, 0.0))
            orders_ok = orders_count >= min_orders
            spend_ok = total_spent >= min_spend
            if not loyalty_enabled:
                is_loyal = False
            elif criteria_mode == "orders_only":
                is_loyal = orders_ok
            elif criteria_mode == "spend_only":
                is_loyal = spend_ok
            elif criteria_mode == "both":
                is_loyal = orders_ok and spend_ok
            else:
                is_loyal = orders_ok or spend_ok

            rows_data.append({
                "id": str(u.id),
                "name": u.full_name or "Anonymous",
                "email": u.email,
                "phone": u.phone,
                "created_at": u.created_at.isoformat(),
                "orders_count": orders_count,
                "total_spent": round(total_spent, 2),
                "is_loyal": is_loyal,
                "loyalty_criteria": {"enabled": loyalty_enabled, "minimum_orders": min_orders, "minimum_spend": min_spend, "criteria_mode": criteria_mode}
            })
    else:
        # Loyal segment path: first find user_ids that match the loyalty criteria in a subquery
        loyal_users_q = (
            select(
                OrderModel.user_id,
                func.count(OrderModel.id).filter(eligible_order).label("orders_count"),
                func.coalesce(func.sum(OrderModel.total_amount).filter(eligible_order), 0).label("total_spent")
            )
            .group_by(OrderModel.user_id)
        )
        if loyalty_enabled:
            orders_ok = func.count(OrderModel.id).filter(eligible_order) >= min_orders
            spend_ok = func.coalesce(func.sum(OrderModel.total_amount).filter(eligible_order), 0) >= min_spend
            if criteria_mode == "orders_only":
                loyal_users_q = loyal_users_q.having(orders_ok)
            elif criteria_mode == "spend_only":
                loyal_users_q = loyal_users_q.having(spend_ok)
            elif criteria_mode == "both":
                loyal_users_q = loyal_users_q.having(and_(orders_ok, spend_ok))
            else:
                loyal_users_q = loyal_users_q.having(orders_ok | spend_ok)
        else:
            loyal_users_q = loyal_users_q.having(func.count(OrderModel.id) < 0)

        loyal_users_sub = loyal_users_q.subquery()

        # Join UserModel with the subquery results
        user_filters = [UserModel.role == "customer", UserModel.id == loyal_users_sub.c.user_id]
        if search:
            like_term = f"%{search}%"
            clause = or_(
                UserModel.full_name.ilike(like_term),
                UserModel.email.ilike(like_term),
                UserModel.phone.ilike(like_term)
            )
            user_filters.append(clause)

        total_q = select(func.count(UserModel.id)).where(*user_filters)
        total = (await db.execute(total_q)).scalar() or 0

        offset = (page - 1) * limit
        users_q = (
            select(UserModel, loyal_users_sub.c.orders_count, loyal_users_sub.c.total_spent)
            .where(*user_filters)
            .order_by(UserModel.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        res = await db.execute(users_q)
        rows = res.all()

        rows_data = []
        for u, orders_count, total_spent in rows:
            orders_count = int(orders_count or 0)
            total_spent = float(total_spent or 0)
            orders_ok = orders_count >= min_orders
            spend_ok = total_spent >= min_spend
            if not loyalty_enabled:
                is_loyal = False
            elif criteria_mode == "orders_only":
                is_loyal = orders_ok
            elif criteria_mode == "spend_only":
                is_loyal = spend_ok
            elif criteria_mode == "both":
                is_loyal = orders_ok and spend_ok
            else:
                is_loyal = orders_ok or spend_ok

            rows_data.append({
                "id": str(u.id),
                "name": u.full_name or "Anonymous",
                "email": u.email,
                "phone": u.phone,
                "created_at": u.created_at.isoformat(),
                "orders_count": orders_count,
                "total_spent": round(total_spent, 2),
                "is_loyal": is_loyal,
                "loyalty_criteria": {"enabled": loyalty_enabled, "minimum_orders": min_orders, "minimum_spend": min_spend, "criteria_mode": criteria_mode}
            })

    return {"items": rows_data, "total": total, "page": page, "limit": limit}


@router.get("/admin/customers/{customer_id}")
async def get_customer_details(
    customer_id: str,
    admin: UserSchema = Depends(require_permission("view_customers")),
    db: AsyncSession = Depends(get_db)
):
    validate_uuid(customer_id)
    user_res = await db.execute(select(UserModel).where(UserModel.id == customer_id))
    user = user_res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Customer not found")

    addr_res = await db.execute(select(AddressModel).where(AddressModel.user_id == user.id))
    addresses = [row_to_dict(addr) for addr in addr_res.scalars().all()]

    order_res = await db.execute(
        select(OrderModel).where(OrderModel.user_id == user.id).order_by(OrderModel.created_at.desc())
    )
    customer_orders = order_res.scalars().all()
    pending_refund_orders = [
        order for order in customer_orders
        if str(order.payment_status or "").lower() == "refund_pending"
    ]
    if pending_refund_orders:
        from routes.orders import reconcile_order_refund_with_razorpay
        await asyncio.gather(*[
            reconcile_order_refund_with_razorpay(order, db, source="admin_customer_detail")
            for order in pending_refund_orders
        ])
    orders = [row_to_dict(order) for order in customer_orders]

    review_res = await db.execute(
        select(ProductReviewModel, ProductModel.name.label("product_name"), ProductModel.image_url.label("product_image"))
        .join(ProductModel, ProductReviewModel.product_id == ProductModel.id)
        .where(ProductReviewModel.user_id == user.id)
        .order_by(ProductReviewModel.created_at.desc())
    )
    reviews = []
    for row in review_res.all():
        review_data = row_to_dict(row[0])
        review_data["product_name"] = row.product_name
        review_data["product_image"] = row.product_image
        reviews.append(review_data)

    # Compute matched statistics
    eligible_order = liable_order_filter()
    stats_res = await db.execute(
        select(
            func.count(OrderModel.id).label("orders_count"),
            func.coalesce(func.sum(OrderModel.total_amount), 0).label("total_spent")
        ).where(OrderModel.user_id == user.id, eligible_order)
    )
    stats = stats_res.first()
    orders_count = int(stats.orders_count or 0) if stats else 0
    total_spent = float(stats.total_spent or 0) if stats else 0.0

    return {
        "customer": {
            "id": str(user.id),
            "name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "status": user.status,
            "is_active": user.is_active,
            "created_at": user.created_at.isoformat(),
            "orders_count": orders_count,
            "total_spent": total_spent,
        },
        "addresses": addresses,
        "orders": orders,
        "reviews": reviews,
    }


# ── Admins (Admin) ───────────────────────────────────────────────────────
@router.get("/superadmin/admins")
async def list_admin_users(admin: UserSchema = Depends(require_permission("manage_admins")), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(UserModel).where(UserModel.role.in_(["admin", "SUPER_ADMIN"])))
    return [_prepare_admin_user(u) for u in res.scalars().all()]


@router.post("/superadmin/admins")
async def create_admin_user(payload: AdminCreateRequest, admin: UserSchema = Depends(require_permission("create_admin")), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(UserModel).where(UserModel.email == payload.email))
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already exists")
    if payload.phone:
        res_phone = await db.execute(select(UserModel).where(UserModel.phone == payload.phone))
        if res_phone.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Phone number already registered to another account")
    if payload.role == "SUPER_ADMIN":
        raise HTTPException(status_code=400, detail="Only one Super Admin allowed")

    from deps import hash_password, send_email
    import asyncio
    from email_templates import admin_onboarding_email

    # Set first-login password reset requirement
    permissions_dict = dict(payload.permissions or {})
    permissions_dict["role_template"] = _normalize_role_template(payload.role_template)
    permissions_dict["is_first_login"] = True

    uid = str(uuid.uuid4())
    u = UserModel(
        id=uid,
        email=payload.email,
        full_name=payload.full_name,
        phone=payload.phone,
        role="admin",
        is_active=True,
        password=hash_password(payload.password),
        permissions=permissions_dict,
    )
    db.add(u)
    await db.flush()
    await write_audit_log(db, "ADMIN_CREATED", admin.id, "user", uid)

    # Dispatch email
    try:
        subj, body = admin_onboarding_email(payload.full_name, payload.email, payload.password, payload.role_template)
        asyncio.create_task(send_email(payload.email, subj, body))
    except Exception as e:
        pass

    return {"message": "Admin created", "user_id": uid}



@router.put("/superadmin/admins/{user_id}/status")
async def update_admin_status(user_id: str, data: dict, admin: UserSchema = Depends(require_permission("disable_admin")), db: AsyncSession = Depends(get_db)):
    validate_uuid(user_id)
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot disable yourself")
    res = await db.execute(select(UserModel).where(UserModel.id == user_id, UserModel.role.in_(["admin", "SUPER_ADMIN"])))
    u = res.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="Admin not found")
    u.is_active = bool(data.get("is_active", True))
    await db.flush()
    await write_audit_log(db, "ADMIN_STATUS_UPDATED", admin.id, "user", user_id)
    return {"message": "Admin status updated"}


@router.put("/superadmin/admins/{user_id}")
async def update_admin_user(user_id: str, data: AdminUpdateRequest, admin: UserSchema = Depends(require_permission("edit_admin")), db: AsyncSession = Depends(get_db)):
    validate_uuid(user_id)
    res = await db.execute(select(UserModel).where(UserModel.id == user_id, UserModel.role.in_(["admin", "SUPER_ADMIN"])))
    u = res.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="Admin not found")

    if data.full_name: u.full_name = data.full_name
    if data.phone and data.phone != u.phone:
        dup_phone = await db.execute(select(UserModel).where(UserModel.phone == data.phone, UserModel.id != user_id))
        if dup_phone.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Phone number already in use by another account")
        u.phone = data.phone
    if data.email and data.email != u.email:
        dup = await db.execute(select(UserModel).where(UserModel.email == data.email, UserModel.id != user_id))
        if dup.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email already in use")
        u.email = data.email
    if data.permissions is not None:
        permissions_dict = dict(data.permissions or {})
        permissions_dict["role_template"] = _normalize_role_template(data.role_template or permissions_dict.get("role_template"))
        u.permissions = permissions_dict
    await db.flush()
    await write_audit_log(db, "ADMIN_UPDATED", admin.id, "user", user_id)
    return {"message": "Admin updated"}


@router.delete("/superadmin/admins/{user_id}")
async def delete_admin_user(user_id: str, admin: UserSchema = Depends(require_permission("delete_admin")), db: AsyncSession = Depends(get_db)):
    validate_uuid(user_id)
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    res = await db.execute(select(UserModel).where(UserModel.id == user_id, UserModel.role.in_(["admin", "SUPER_ADMIN"])))
    u = res.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="Admin not found")
    if u.role == "SUPER_ADMIN":
        raise HTTPException(status_code=400, detail="Cannot delete Super Admin")
    await db.delete(u)
    await db.flush()
    await write_audit_log(db, "ADMIN_DELETED", admin.id, "user", user_id)
    return {"message": "Admin deleted successfully"}


@router.put("/superadmin/admins/{user_id}/reset-password")
async def reset_admin_password(user_id: str, req: PasswordResetRequest, admin: UserSchema = Depends(require_permission("edit_admin")), db: AsyncSession = Depends(get_db)):
    validate_uuid(user_id)
    res = await db.execute(select(UserModel).where(UserModel.id == user_id, UserModel.role.in_(["admin", "SUPER_ADMIN"])))
    u = res.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="Admin not found")
    from deps import hash_password
    u.password = hash_password(req.new_password)
    await db.flush()
    await write_audit_log(db, "ADMIN_PASSWORD_RESET", admin.id, "user", user_id)
    return {"message": "Admin password reset successfully"}


# ── Legacy aliases for /admin/admin-users (backward-compat with Render) ──
@router.get("/admin/admin-users")
async def list_admin_users_legacy(admin: UserSchema = Depends(require_permission("manage_admins")), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(UserModel).where(UserModel.role.in_(["admin", "SUPER_ADMIN"])))
    return [_prepare_admin_user(u) for u in res.scalars().all()]


@router.post("/admin/admin-users")
async def create_admin_user_legacy(payload: AdminCreateRequest, admin: UserSchema = Depends(require_permission("create_admin")), db: AsyncSession = Depends(get_db)):
    from deps import hash_password, send_email
    import asyncio
    from email_templates import admin_onboarding_email
    res = await db.execute(select(UserModel).where(UserModel.email == payload.email))
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already exists")
    if payload.phone:
        res_phone = await db.execute(select(UserModel).where(UserModel.phone == payload.phone))
        if res_phone.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Phone number already registered to another account")
    if payload.role == "SUPER_ADMIN":
        raise HTTPException(status_code=400, detail="Only one Super Admin allowed")
    permissions_dict = dict(payload.permissions or {})
    permissions_dict["role_template"] = _normalize_role_template(payload.role_template)
    permissions_dict["is_first_login"] = True
    uid = str(uuid.uuid4())
    u = UserModel(id=uid, email=payload.email, full_name=payload.full_name, phone=payload.phone,
                  role="admin", is_active=True, password=hash_password(payload.password), permissions=permissions_dict)
    db.add(u)
    await db.flush()
    await write_audit_log(db, "ADMIN_CREATED", admin.id, "user", uid)
    try:
        subj, body = admin_onboarding_email(payload.full_name, payload.email, payload.password, payload.role_template)
        asyncio.create_task(send_email(payload.email, subj, body))
    except Exception:
        pass
    return {"message": "Admin created", "user_id": uid}


@router.put("/admin/admin-users/{user_id}/status")
async def update_admin_status_legacy(user_id: str, data: dict, admin: UserSchema = Depends(require_permission("disable_admin")), db: AsyncSession = Depends(get_db)):
    validate_uuid(user_id)
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot disable yourself")
    res = await db.execute(select(UserModel).where(UserModel.id == user_id, UserModel.role.in_(["admin", "SUPER_ADMIN"])))
    u = res.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="Admin not found")
    u.is_active = bool(data.get("is_active", True))
    await db.flush()
    await write_audit_log(db, "ADMIN_STATUS_UPDATED", admin.id, "user", user_id)
    return {"message": "Admin status updated"}


@router.put("/admin/admin-users/{user_id}")
async def update_admin_user_legacy(user_id: str, data: AdminUpdateRequest, admin: UserSchema = Depends(require_permission("edit_admin")), db: AsyncSession = Depends(get_db)):
    validate_uuid(user_id)
    res = await db.execute(select(UserModel).where(UserModel.id == user_id, UserModel.role.in_(["admin", "SUPER_ADMIN"])))
    u = res.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="Admin not found")
    if data.full_name: u.full_name = data.full_name
    if data.phone and data.phone != u.phone:
        dup_phone = await db.execute(select(UserModel).where(UserModel.phone == data.phone, UserModel.id != user_id))
        if dup_phone.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Phone number already in use by another account")
        u.phone = data.phone
    if data.email and data.email != u.email:
        dup = await db.execute(select(UserModel).where(UserModel.email == data.email, UserModel.id != user_id))
        if dup.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email already in use")
        u.email = data.email
    if data.permissions is not None:
        permissions_dict = dict(data.permissions or {})
        permissions_dict["role_template"] = _normalize_role_template(data.role_template or permissions_dict.get("role_template"))
        u.permissions = permissions_dict
    await db.flush()
    await write_audit_log(db, "ADMIN_UPDATED", admin.id, "user", user_id)
    return {"message": "Admin updated"}


@router.delete("/admin/admin-users/{user_id}")
async def delete_admin_user_legacy(user_id: str, admin: UserSchema = Depends(require_permission("delete_admin")), db: AsyncSession = Depends(get_db)):
    validate_uuid(user_id)
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    res = await db.execute(select(UserModel).where(UserModel.id == user_id, UserModel.role.in_(["admin", "SUPER_ADMIN"])))
    u = res.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="Admin not found")
    if u.role == "SUPER_ADMIN":
        raise HTTPException(status_code=400, detail="Cannot delete Super Admin")
    await db.delete(u)
    await db.flush()
    await write_audit_log(db, "ADMIN_DELETED", admin.id, "user", user_id)
    return {"message": "Admin deleted successfully"}


@router.put("/admin/admin-users/{user_id}/reset-password")
async def reset_admin_password_legacy(user_id: str, req: PasswordResetRequest, admin: UserSchema = Depends(require_permission("edit_admin")), db: AsyncSession = Depends(get_db)):
    validate_uuid(user_id)
    res = await db.execute(select(UserModel).where(UserModel.id == user_id, UserModel.role.in_(["admin", "SUPER_ADMIN"])))
    u = res.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="Admin not found")
    from deps import hash_password
    u.password = hash_password(req.new_password)
    await db.flush()
    await write_audit_log(db, "ADMIN_PASSWORD_RESET", admin.id, "user", user_id)
    return {"message": "Admin password reset successfully"}


# ── Inventory (Admin) ────────────────────────────────────────────────────
@router.post("/admin/products/{product_id}/inventory")
async def adjust_inventory(product_id: str, data: dict, admin: UserSchema = Depends(require_permission("update_stock")), db: AsyncSession = Depends(get_db)):
    validate_uuid(product_id)
    delta = int(data.get("delta", 0))
    res = await db.execute(select(ProductModel).where(ProductModel.id == product_id).with_for_update())
    p = res.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")

    p.stock_quantity = max(0, int(p.stock_quantity or 0) + delta)
    p.in_stock = p.stock_quantity > 0
    p.updated_at = datetime.now(timezone.utc)

    sh = StockHistoryModel(
        product_id=p.id,
        delta=delta,
        new_quantity=p.stock_quantity,
        updated_by=admin.id,
    )
    db.add(sh)
    await db.flush()
    await write_audit_log(db, "INVENTORY_ADJUSTED", admin.id, "product", product_id, {"delta": delta, "new_qty": p.stock_quantity})
    return {"message": "Inventory updated", "stock_quantity": p.stock_quantity}


# ── Settings (Admin) ─────────────────────────────────────────────────────
@router.get("/admin/settings")
async def get_settings(admin: UserSchema = Depends(require_permission("manage_settings")), db: AsyncSession = Depends(get_db)):
    await cleanup_expired_coupons(db)
    res = await db.execute(select(SettingModel))
    data = {s.key: s.value for s in res.scalars().all()}
    loyalty = dict(data.get("loyalty_settings") or {})
    data["loyalty_settings"] = {
        "enabled": loyalty.get("enabled", True) is not False,
        "minimum_orders": int(loyalty.get("minimum_orders") if loyalty.get("minimum_orders") is not None else 10),
        "minimum_spend": float(loyalty.get("minimum_spend") if loyalty.get("minimum_spend") is not None else 15000.0),
        "criteria_mode": loyalty.get("criteria_mode") if loyalty.get("criteria_mode") in {"either", "both", "orders_only", "spend_only"} else "either",
    }
    feedback = dict(data.get("feedback_settings") or {})
    data["feedback_settings"] = {
        "ratings_enabled": feedback.get("ratings_enabled", True) is not False,
        "comments_enabled": feedback.get("comments_enabled", True) is not False,
    }
    return data


@router.post("/admin/settings")
async def save_setting(data: dict, admin: UserSchema = Depends(require_permission("manage_settings")), db: AsyncSession = Depends(get_db)):
    key = data.get("key")
    val = data.get("value")
    if not key:
        raise HTTPException(status_code=400, detail="Key required")

    res = await db.execute(select(SettingModel).where(SettingModel.key == key))
    s = res.scalar_one_or_none()
    if s:
        s.value = val
    else:
        db.add(SettingModel(key=key, value=val))
    if key == "shipping_settings" and isinstance(val, dict):
        payment_res = await db.execute(select(SettingModel).where(SettingModel.key == "payment_settings"))
        payment_setting = payment_res.scalar_one_or_none()
        payment_value = dict(payment_setting.value or {}) if payment_setting else {}
        payment_value["cod_enabled"] = val.get("codEnabled", True) is not False and val.get("codStatus", "Active") == "Active"
        if payment_setting:
            payment_setting.value = payment_value
        else:
            db.add(SettingModel(key="payment_settings", value=payment_value))
    elif key == "payment_settings" and isinstance(val, dict) and "cod_enabled" in val:
        shipping_res = await db.execute(select(SettingModel).where(SettingModel.key == "shipping_settings"))
        shipping_setting = shipping_res.scalar_one_or_none()
        shipping_value = dict(shipping_setting.value or {}) if shipping_setting else {}
        shipping_value["codEnabled"] = val.get("cod_enabled") is not False
        shipping_value["codStatus"] = "Active" if shipping_value["codEnabled"] else "Inactive"
        if shipping_setting:
            shipping_setting.value = shipping_value
        else:
            db.add(SettingModel(key="shipping_settings", value=shipping_value))
    await db.flush()
    await write_audit_log(db, "SETTING_UPDATED", admin.id, "setting", key)
    return {"message": "Setting saved"}


@router.get("/settings/public")
async def get_public_settings(db: AsyncSession = Depends(get_db)):
    await cleanup_expired_coupons(db)
    res = await db.execute(select(SettingModel).where(SettingModel.key.in_(["company_profile", "payment_settings", "scrolling_banner", "shipping_settings", "popup_banner", "feedback_settings", "loyalty_settings"])))
    d = {s.key: s.value for s in res.scalars().all()}
    if "payment_settings" not in d:
        d["payment_settings"] = {"cod_enabled": True}
    
    # Dynamically filter popup_banner settings for the public response
    from models import CouponModel
    from coupon_maintenance import coupon_is_expired, filter_public_popup_banner
    now = datetime.now(timezone.utc)
    coupons_res = await db.execute(select(CouponModel))
    coupons = coupons_res.scalars().all()
    active_codes = {
        coupon.code.upper()
        for coupon in coupons
        if coupon.code and coupon.is_active and not coupon_is_expired(coupon, now)
    }
    if "popup_banner" in d:
        d["popup_banner"] = filter_public_popup_banner(d["popup_banner"], active_codes)
    else:
        d["popup_banner"] = {"promoted_coupons": []}
    if "feedback_settings" not in d:
        d["feedback_settings"] = {"ratings_enabled": True, "comments_enabled": True}
    else:
        feedback = dict(d["feedback_settings"] or {})
        d["feedback_settings"] = {
            "ratings_enabled": feedback.get("ratings_enabled", True) is not False,
            "comments_enabled": feedback.get("comments_enabled", True) is not False
        }
    if "loyalty_settings" not in d:
        d["loyalty_settings"] = {"enabled": True, "minimum_orders": 10, "minimum_spend": 15000.0, "criteria_mode": "either"}
    else:
        loyalty = dict(d["loyalty_settings"] or {})
        d["loyalty_settings"] = {
            "enabled": loyalty.get("enabled", True) is not False,
            "minimum_orders": int(loyalty.get("minimum_orders") if loyalty.get("minimum_orders") is not None else 10),
            "minimum_spend": float(loyalty.get("minimum_spend") if loyalty.get("minimum_spend") is not None else 15000.0),
            "criteria_mode": loyalty.get("criteria_mode") if loyalty.get("criteria_mode") in {"either", "both", "orders_only", "spend_only"} else "either",
        }
    if "scrolling_banner" not in d:
        d["scrolling_banner"] = {
            "text1": "Durga Shakti Foils: Premium Packing Solutions",
            "text2": "50% off discount sale ends in {timer}",
            "timer_enabled": True,
            "timer_target": "2026-05-20T12:00:00Z"
        }
    if "shipping_settings" not in d:
        d["shipping_settings"] = {
            "enableShipping": True,
            "enableFreeShipping": True,
            "freeShippingThreshold": 1099.0,
            "defaultShippingCharge": 70.0,
            "shippingRuleStatus": "Active",
            "codEnabled": True,
            "codCharge": 0.0,
            "minimumCodAmount": 300.0,
            "maximumCodAmount": 5000.0,
            "codStatus": "Active",
            "standardDeliveryDays": "3–5 Days",
            "expressDeliveryDays": "1–2 Days",
            "packagingTime": "1 Day",
            "processingTime": "1 Day",
            "shippingZonesEnabled": False,
            "shippingCampaignsEnabled": False
        }
    else:
        shipping = dict(d["shipping_settings"] or {})
        if shipping.get("codCharge") is None:
            shipping["codCharge"] = shipping.get("cod_extra_service_charge", shipping.get("cod_charge", 0.0))
        shipping.pop("minimumOrderAmount", None)
        d["shipping_settings"] = shipping
    payment = dict(d.get("payment_settings") or {})
    shipping = d["shipping_settings"]
    payment["cod_enabled"] = shipping.get("codEnabled", True) is not False and shipping.get("codStatus", "Active") == "Active"
    d["payment_settings"] = payment
    return d


# ── GST + Uploads ────────────────────────────────────────────────────────
@router.post("/admin/uploads/image")
async def upload_image_endpoint(file: UploadFile = File(...), admin: UserSchema = Depends(require_permission("manage_products"))):
    ct = (file.content_type or "").lower()
    if ct not in {"image/png", "image/jpeg", "image/jpg", "image/webp"}:
        raise HTTPException(status_code=400, detail="Invalid image format")
    raw = await file.read()
    if len(raw) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Max 5MB")
    url = await upload_image(raw, ct, prefix="product")
    return {"url": url, "file_name": file.filename or url.split("/")[-1]}


@router.post("/admin/uploads/media")
async def upload_media_endpoint(file: UploadFile = File(...), admin: UserSchema = Depends(require_permission("manage_products"))):
    ct = (file.content_type or "").lower()
    allowed_images = {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"}
    allowed_videos = {"video/mp4", "video/webm", "video/ogg", "video/quicktime"}
    
    is_image = ct in allowed_images
    is_video = ct in allowed_videos
    
    if not is_image and not is_video:
        raise HTTPException(
            status_code=400, 
            detail="Invalid media format. Supported: PNG, JPEG, JPG, WEBP, GIF, MP4, WEBM, OGG, MOV"
        )
    
    raw = await file.read()
    # 5MB limit for images, 50MB limit for videos
    limit = 5 * 1024 * 1024 if is_image else 50 * 1024 * 1024
    if len(raw) > limit:
        raise HTTPException(
            status_code=400, 
            detail=f"File too large. Max allowed: {'5MB' if is_image else '50MB'}"
        )
        
    url = await upload_media(raw, ct, prefix="product_media")
    media_type = "image" if is_image else "video"
    return {"url": url, "type": media_type, "file_name": file.filename or url.split("/")[-1]}


def _parse_gstr1_range(filter_type: str, day: Optional[str], month: Optional[str], year: Optional[int], start_date: Optional[str], end_date: Optional[str]):
    now = datetime.now(timezone.utc)
    if filter_type == "day" and day:
        start = datetime.fromisoformat(day).replace(tzinfo=timezone.utc)
        end = start + pd.Timedelta(days=1)
    elif filter_type == "month" and month:
        start = datetime.fromisoformat(f"{month}-01").replace(tzinfo=timezone.utc)
        end = (start + pd.DateOffset(months=1)).to_pydatetime()
    elif filter_type == "year" and year:
        start = datetime(int(year), 1, 1, tzinfo=timezone.utc)
        end = datetime(int(year) + 1, 1, 1, tzinfo=timezone.utc)
    elif filter_type == "range" and start_date and end_date:
        start = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        end = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
        start = start.astimezone(timezone.utc) if start.tzinfo else start.replace(tzinfo=timezone.utc)
        end = end.astimezone(timezone.utc) if end.tzinfo else end.replace(tzinfo=timezone.utc)
    else:
        start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
        end = (start + pd.DateOffset(months=1)).to_pydatetime()
    return start, end


@router.get("/admin/gstr1/export")
async def export_gstr1(
    filter_type: str = Query("month", pattern="^(day|month|year|range)$"),
    day: Optional[str] = Query(None),
    month: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    format: str = Query("excel", pattern="^(excel|csv)$"),
    admin: UserSchema = Depends(require_permission("export_gst_reports")),
    db: AsyncSession = Depends(get_db)
):
    start, end = _parse_gstr1_range(filter_type, day, month, year, start_date, end_date)
    res = await db.execute(
        select(OrderModel)
        .where(
            OrderModel.created_at >= start,
            OrderModel.created_at < end,
            OrderModel.order_status != "cancelled",
        )
        .order_by(OrderModel.created_at.asc())
    )
    orders = [row_to_dict(o) for o in res.scalars().all()]

    from invoice_service import _invoice_number
    rows = []
    for order in orders:
        addr = order.get("shipping_address") or {}
        metadata = addr.get("shipping_metadata") or {}
        items = order.get("items") or []
        subtotal = float(metadata.get("subtotal") or sum(float(i.get("price") or 0) * int(i.get("quantity") or 0) for i in items))
        discount = float(metadata.get("discount_amount") or order.get("discount_amount") or 0)
        taxable_invoice = round(float(metadata.get("taxable_amount") or max(0, subtotal - discount)), 2)
        cgst_invoice = round(float(metadata.get("cgst_amount") or taxable_invoice * 0.09), 2)
        sgst_invoice = round(float(metadata.get("sgst_amount") or taxable_invoice * 0.09), 2)
        tax_invoice = round(cgst_invoice + sgst_invoice, 2)
        shipping = round(float(metadata.get("shipping_cost") or 0), 2)
        cod = round(float(metadata.get("cod_charge") or 0), 2)
        invoice_no = str(order.get("invoice_number") or _invoice_number(order))
        invoice_date = datetime.fromisoformat(str(order.get("created_at")).replace("Z", "+00:00")).date().isoformat()
        place = str(addr.get("state") or "")
        same_state = place.strip().lower() in {"telangana", "36-telangana", "36"} or place.strip().lower().startswith("36")
        remaining_taxable = taxable_invoice
        remaining_cgst = cgst_invoice
        remaining_sgst = sgst_invoice
        remaining_igst = tax_invoice
        valid_items = [i for i in items if int(i.get("quantity") or 0) > 0]
        for idx, item in enumerate(valid_items):
            qty = int(item.get("quantity") or 0)
            gross_line = round(float(item.get("price") or 0) * qty, 2)
            if idx == len(valid_items) - 1:
                taxable = remaining_taxable
                cgst = remaining_cgst if same_state else 0
                sgst = remaining_sgst if same_state else 0
                igst = 0 if same_state else remaining_igst
            else:
                ratio = (gross_line / subtotal) if subtotal else 0
                taxable = round(taxable_invoice * ratio, 2)
                cgst = round(cgst_invoice * ratio, 2) if same_state else 0
                sgst = round(sgst_invoice * ratio, 2) if same_state else 0
                igst = 0 if same_state else round(tax_invoice * ratio, 2)
                remaining_taxable = round(remaining_taxable - taxable, 2)
                remaining_cgst = round(remaining_cgst - cgst, 2)
                remaining_sgst = round(remaining_sgst - sgst, 2)
                remaining_igst = round(remaining_igst - igst, 2)
            rows.append({
                "Invoice Number": invoice_no,
                "Invoice Date": invoice_date,
                "Order Number": order.get("order_number"),
                "Customer Name": order.get("customer_name") or addr.get("full_name"),
                "Seller GSTIN": "36AALCD9777D1Z5",
                "Transaction ID": "COD",
                "Place of Supply": place,
                "Product": item.get("product_name") or item.get("name"),
                "HSN": item.get("hsn") or item.get("hsn_code") or "76071991",
                "Quantity": qty,
                "Tax Rate": "18%",
                "Taxable Value": taxable,
                "CGST": cgst,
                "SGST": sgst,
                "IGST": igst,
                "Invoice Discount": discount if idx == 0 else 0,
                "Shipping Charges": shipping if idx == 0 else 0,
                "COD Charges": cod if idx == 0 else 0,
                "Invoice Total": float(order.get("total_amount") or 0) if idx == 0 else "",
                "Payment Mode": str(order.get("payment_method") or "").upper(),
                "Payment Status": order.get("payment_status"),
            })

    df = pd.DataFrame(rows)
    if df.empty:
        df = pd.DataFrame(columns=[
            "Invoice Number", "Invoice Date", "Order Number", "Customer Name", "Seller GSTIN", "Transaction ID",
            "Place of Supply", "Product", "HSN", "Quantity", "Tax Rate", "Taxable Value",
            "CGST", "SGST", "IGST", "Invoice Discount", "Shipping Charges", "COD Charges",
            "Invoice Total", "Payment Mode", "Payment Status"
        ])

    if format == "csv":
        csv_data = df.to_csv(index=False)
        filename = f"GSTR1_{start.date()}_to_{(end - pd.Timedelta(days=1)).date()}.csv"
        output = BytesIO(csv_data.encode("utf-8"))
        return StreamingResponse(
            output,
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )

    output = BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="GSTR1")
        ws = writer.book["GSTR1"]
        for col in ws.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            ws.column_dimensions[col[0].column_letter].width = min(max(max_len + 2, 12), 42)
    output.seek(0)
    filename = f"GSTR1_{start.date()}_to_{(end - pd.Timedelta(days=1)).date()}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/admin/audit-logs")
async def get_audit_logs(page: int = Query(1), limit: int = Query(50), search: Optional[str] = None, admin: UserSchema = Depends(require_permission("view_audit_logs")), db: AsyncSession = Depends(get_db)):
    search = sanitize_search_term(search)
    q = select(AuditLogModel, func.count(AuditLogModel.id).over().label('total_count'))
    clause = None
    if search:
        clause = or_(AuditLogModel.action.ilike(f"%{search}%"), AuditLogModel.actor_id.ilike(f"%{search}%"), AuditLogModel.target_id.ilike(f"%{search}%"))
        q = q.where(clause)

    offset = (page - 1) * limit
    res = await db.execute(q.order_by(AuditLogModel.created_at.desc()).offset(offset).limit(limit))
    rows = res.all()
    
    total = 0
    if rows:
        total = rows[0][1]
    elif page > 1:
        fallback_q = select(func.count(AuditLogModel.id))
        if clause is not None:
            fallback_q = fallback_q.where(clause)
        total = (await db.execute(fallback_q)).scalar() or 0

    items = [row_to_dict(row[0]) for row in rows]

    await _enrich_audit_actor_fields(db, items)

    return {"items": items, "total": total, "page": page, "limit": limit}


@router.get("/admin/audit-logs/export")
async def export_audit_logs(admin: UserSchema = Depends(require_permission("view_audit_logs")), db: AsyncSession = Depends(get_db)):
    # Export audit logs (last 6 months) as XLSX
    cutoff = datetime.now(timezone.utc) - pd.Timedelta(days=180)
    q = await db.execute(select(AuditLogModel).where(AuditLogModel.created_at >= cutoff).order_by(AuditLogModel.created_at.desc()))
    rows = q.scalars().all()

    items = [row_to_dict(r) for r in rows]
    await _enrich_audit_actor_fields(db, items)

    # Build DataFrame
    df = pd.DataFrame(items)
    # Normalize metadata column (JSON) to a readable string
    if 'metadata' in df.columns:
        df['metadata'] = df['metadata'].apply(lambda m: (json.dumps(m, ensure_ascii=False) if m else ""))
    preferred_columns = [
        "id", "action", "actor_id", "actor_name", "actor_email", "actor_role", "actor_role_label",
        "updated_by_name_role", "target_type", "target_id", "metadata", "created_at",
    ]
    if not df.empty:
        existing_preferred = [col for col in preferred_columns if col in df.columns]
        remaining_columns = [col for col in df.columns if col not in existing_preferred]
        df = df[existing_preferred + remaining_columns]
    if df.empty:
        df = pd.DataFrame(columns=preferred_columns)

    out = BytesIO()
    with pd.ExcelWriter(out, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='audit_logs')
    out.seek(0)

    filename = f"audit_logs_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.xlsx"
    headers = {
        "Content-Disposition": (
            f'attachment; filename="{filename}"; '
            f"filename*=UTF-8''{quote(filename)}"
        )
    }
    return StreamingResponse(out, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers=headers)


class ItemReturnActionInput(BaseModel):
    action: str  # "approve" or "reject"
    remarks: Optional[str] = None


@router.post("/admin/orders/{order_id}/items/{product_id}/return-action")
async def admin_item_return_action(
    order_id: str,
    product_id: str,
    payload: ItemReturnActionInput,
    admin: UserSchema = Depends(require_permission("update_order_status")),
    db: AsyncSession = Depends(get_db)
):
    validate_uuid(order_id)
    res = await db.execute(select(OrderModel).where(OrderModel.id == order_id))
    order = res.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    updated_items = []
    found_item = False
    action_upper = payload.action.upper()
    
    for item in (order.items or []):
        if str(item.get("product_id")) == product_id:
            found_item = True
            if item.get("return_status") != "RETURN_REQUESTED":
                raise HTTPException(status_code=400, detail="Item return is not requested or already processed")
            
            new_status = "RETURN_APPROVED" if action_upper == "APPROVE" else "RETURN_REJECTED"
            item["return_status"] = new_status
            if "audit_timeline" not in item:
                item["audit_timeline"] = []
            item["audit_timeline"].append({
                "status": new_status,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "remarks": payload.remarks or f"Return {payload.action}d by admin"
            })
        updated_items.append(item)

    if not found_item:
        raise HTTPException(status_code=404, detail="Item not found in order")

    order.items = updated_items
    flag_modified(order, "items")
    order.updated_at = datetime.now(timezone.utc)
    
    # Check overall status
    has_pending = any(item.get("return_status") == "RETURN_REQUESTED" for item in order.items)
    if not has_pending:
        any_approved = any(item.get("return_status") == "RETURN_APPROVED" for item in order.items)
        if any_approved:
            order.order_status = "return_approved"
        else:
            order.order_status = "return_rejected"
            
    await db.commit()
    
    # Send email and notification to customer
    if order.user_id:
        try:
            from models import UserModel
            u_res = await db.execute(select(UserModel).where(UserModel.id == order.user_id))
            cust = u_res.scalar_one_or_none()
            if cust:
                from deps import send_email, create_notification
                from email_templates import return_approved_email, return_rejected_email
                if action_upper == "APPROVE":
                    has_return_request = any(item.get("return_status") for item in (order.items or []))
                    items_to_sum = (order.items or []) if not has_return_request else [
                        item for item in (order.items or [])
                        if item.get("return_status") in ("RETURN_APPROVED", "SELF_SHIPPED", "RETURN_RECEIVED", "REFUND_INITIATED", "REFUND_COMPLETED")
                    ]
                    total_refund_amount = sum(
                        float(item.get("refund_calculations", {}).get("refundable_amount") or 0.0) +
                        float(item.get("self_shipping_details", {}).get("courier_cost") or 0.0)
                        for item in items_to_sum
                    )
                    
                    # Send customer notification
                    await create_notification(
                        db,
                        str(order.user_id),
                        "Return Approved",
                        f"Your return request for order {order.order_number} has been approved. Refund will process in 5-7 business days.",
                        "order"
                    )
                    
                    # Send professional email explaining the 5-7 business days timeline
                    subj, body = return_approved_email(cust.full_name or cust.email, order.order_number, total_refund_amount)
                    await send_email(cust.email, subj, body)
                else:
                    await create_notification(
                        db,
                        str(order.user_id),
                        "Return Rejected",
                        f"Your return request for order {order.order_number} has been rejected.",
                        "order"
                    )
                    subj, body = return_rejected_email(cust.full_name or cust.email, order.order_number, payload.remarks or "")
                    await send_email(cust.email, subj, body)
        except Exception:
            logger.exception("Failed to send return action email/notification")

    await write_audit_log(
        db,
        "ITEM_RETURN_ACTION",
        admin.id,
        "order",
        order_id,
        {"product_id": product_id, "action": payload.action, "remarks": payload.remarks}
    )
    return {"message": f"Item return {payload.action}d successfully", "order": _order_response_dict(order)}


@router.post("/admin/orders/{order_id}/items/{product_id}/receive")
async def admin_item_receive(
    order_id: str,
    product_id: str,
    admin: UserSchema = Depends(require_permission("update_order_status")),
    db: AsyncSession = Depends(get_db)
):
    validate_uuid(order_id)
    res = await db.execute(select(OrderModel).where(OrderModel.id == order_id))
    order = res.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    updated_items = []
    found_item = False
    for item in (order.items or []):
        if str(item.get("product_id")) == product_id:
            found_item = True
            current_status = item.get("return_status")
            if current_status not in ("SELF_SHIPPED", "RETURN_APPROVED"):
                raise HTTPException(status_code=400, detail="Item is not shipped or return not approved")
            
            item["return_status"] = "RETURN_RECEIVED"
            if "audit_timeline" not in item:
                item["audit_timeline"] = []
            item["audit_timeline"].append({
                "status": "RETURN_RECEIVED",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "remarks": "Item physically received at warehouse"
            })
        updated_items.append(item)

    if not found_item:
        raise HTTPException(status_code=404, detail="Item not found in order")

    order.items = updated_items
    flag_modified(order, "items")
    order.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await write_audit_log(
        db,
        "ITEM_RETURN_RECEIVED",
        admin.id,
        "order",
        order_id,
        {"product_id": product_id}
    )
    return {"message": "Item marked as received", "order": _order_response_dict(order)}


@router.post("/admin/orders/{order_id}/items/{product_id}/process-refund")
async def admin_item_process_refund(
    order_id: str,
    product_id: str,
    restock: bool = True,
    manual_amount: Optional[float] = None,
    is_manual: bool = False,
    admin: UserSchema = Depends(require_permission("update_order_status")),
    db: AsyncSession = Depends(get_db)
):
    validate_uuid(order_id)
    res = await db.execute(select(OrderModel).where(OrderModel.id == order_id))
    order = res.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    updated_items = []
    found_item = False
    refund_amount = 0.0
    returned_qty = 0
    
    for item in (order.items or []):
        if str(item.get("product_id")) == product_id:
            found_item = True
            current_status = item.get("return_status")
            if current_status not in ("RETURN_RECEIVED", "RETURN_APPROVED", "SELF_SHIPPED"):
                raise HTTPException(status_code=400, detail="Item is not in an appropriate status for refund")
            
            calc = item.get("refund_calculations") or {}
            if manual_amount is not None:
                refund_amount = round(float(manual_amount), 2)
                calc["refundable_amount"] = refund_amount
                item["refund_calculations"] = calc
            else:
                item_refund = float(calc.get("refundable_amount") or 0.0)
                courier_cost = float(item.get("self_shipping_details", {}).get("courier_cost") or 0.0)
                refund_amount = round(item_refund + courier_cost, 2)
                calc["refundable_amount"] = refund_amount
                item["refund_calculations"] = calc
            returned_qty = int(item.get("returned_quantity") or 1)
            
            item["return_status"] = "REFUND_COMPLETED" if is_manual else "REFUND_INITIATED"
            if "audit_timeline" not in item:
                item["audit_timeline"] = []
            item["audit_timeline"].append({
                "status": "REFUND_COMPLETED" if is_manual else "REFUND_INITIATED",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "remarks": f"Refund of ₹{refund_amount:.2f} completed successfully (Manual: {is_manual})" if is_manual else f"Refund of ₹{refund_amount:.2f} initiated via Razorpay (Manual: {is_manual})"
            })
        updated_items.append(item)

    if not found_item:
        raise HTTPException(status_code=404, detail="Item not found in order")

    # Restock if requested
    if restock and returned_qty > 0:
        p_res = await db.execute(select(ProductModel).where(ProductModel.id == uuid.UUID(product_id)).with_for_update())
        product = p_res.scalar_one_or_none()
        if product:
            product.stock_quantity = int(product.stock_quantity or 0) + returned_qty
            product.units_sold = max(0, int(product.units_sold or 0) - returned_qty)
            product.in_stock = True
            product.updated_at = datetime.now(timezone.utc)

    # Process Payment Refund
    payment_method_lower = str(order.payment_method or "").lower()
    refund_warning = None
    razorpay_refund_succeeded = False
    
    if is_manual:
        razorpay_refund_succeeded = True  # Treat manual as successful to set payment status to refunded
        refund_warning = f"Manual refund of ₹{refund_amount} processed and confirmed by admin."
    elif payment_method_lower != "cod" and refund_amount > 0:
        from routes.orders import trigger_razorpay_partial_refund
        success, err_msg, refund_info = await trigger_razorpay_partial_refund(order, refund_amount, db)
        if success:
            razorpay_refund_succeeded = True
            refund_warning = f"Refund of ₹{refund_amount} initiated via Razorpay."
        else:
            refund_warning = f"Manual refund of ₹{refund_amount} required. Razorpay refund failed: {err_msg}"
    else:
        refund_warning = f"Manual refund of ₹{refund_amount} required (COD/manual)."

    order.items = updated_items
    flag_modified(order, "items")
    order.updated_at = datetime.now(timezone.utc)
    
    # Transition overall order status if all returned items are refunded
    has_active_returns = any(item.get("return_status") in ("RETURN_REQUESTED", "RETURN_APPROVED", "SELF_SHIPPED", "RETURN_RECEIVED") for item in order.items)
    if not has_active_returns:
        if is_manual:
            order.order_status = "refunded"
            order.payment_status = "refunded"
        elif razorpay_refund_succeeded:
            order.order_status = "return_approved"
            order.payment_status = "refund_pending"
        else:
            order.order_status = "return_approved"
            order.payment_status = "refund_failed"
        
        
    await db.commit()
    await write_audit_log(
        db,
        "ITEM_REFUND_PROCESSED",
        admin.id,
        "order",
        order_id,
        {"product_id": product_id, "amount": refund_amount, "restock": restock, "warning": refund_warning}
    )
    return {"message": "Refund processed successfully", "warning": refund_warning, "order": _order_response_dict(order)}
