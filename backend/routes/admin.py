"""Admin management routes."""
from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func, or_, and_, String
from typing import Optional, List
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
    create_notification
)
from storage_service import upload_image, upload_media, delete_asset
import uuid
from datetime import datetime, timezone
import pandas as pd
from io import BytesIO
import os

router = APIRouter(prefix="/api")


@router.get("/admin/products")
async def get_admin_products(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
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
        total = (await db.execute(fallback_q)).scalar() or 0

    products = [row_to_dict(row[0]) for row in rows]
    return {"items": products, "total": total, "page": page, "limit": limit}

# ── Products (Admin) ─────────────────────────────────────────────────────
@router.post("/admin/products")
async def create_product(product: ProductSchema, admin: UserSchema = Depends(require_permission("create_products")), db: AsyncSession = Depends(get_db)):
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
    result = await db.execute(select(CategoryModel).order_by(CategoryModel.name.asc()))
    categories = result.scalars().all()
    return [row_to_dict(c) for c in categories]


@router.post("/admin/categories")
async def create_category(payload: dict, admin: UserSchema = Depends(require_permission("create_products")), db: AsyncSession = Depends(get_db)):
    name = payload.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Category name is required")
        
    existing = await db.execute(select(CategoryModel).where(CategoryModel.name == name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Category already exists")
        
    cat = CategoryModel(
        id=str(uuid.uuid4()),
        name=name,
        is_active=True
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
            existing = await db.execute(select(CategoryModel).where(CategoryModel.name == name))
            if existing.scalar_one_or_none():
                raise HTTPException(status_code=400, detail="Another category with this name already exists")
        cat.name = name
        
    if "is_active" in payload:
        cat.is_active = bool(payload["is_active"])
        
    cat.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await write_audit_log(db, "CATEGORY_UPDATED", admin.id, "category", category_id, {"name": cat.name, "is_active": cat.is_active})
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
    admin: UserSchema = Depends(require_permission("view_orders")),
    db: AsyncSession = Depends(get_db)
):
    search = sanitize_search_term(search)
    q = select(OrderModel, func.count(OrderModel.id).over().label('total_count'))

    clause = None
    if status and status.upper() != "ALL":
        q = q.where(func.lower(OrderModel.order_status) == status.lower())
    if search:
        like_term = f"%{search}%"
        clause = or_(
            OrderModel.order_number.ilike(like_term),
            OrderModel.customer_name.ilike(like_term),
            func.cast(OrderModel.user_id, String).ilike(like_term),
        )
        q = q.where(clause)

    offset = (page - 1) * limit
    res = await db.execute(q.order_by(OrderModel.updated_at.desc()).offset(offset).limit(limit))
    rows = res.all()
    
    total = 0
    if rows:
        total = rows[0][1]
    elif page > 1:
        fallback_q = select(func.count(OrderModel.id))
        if status and status.upper() != "ALL":
            fallback_q = fallback_q.where(func.lower(OrderModel.order_status) == status.lower())
        if clause is not None:
            fallback_q = fallback_q.where(clause)
        total = (await db.execute(fallback_q)).scalar() or 0

    items = [row_to_dict(row[0]) for row in rows]
    return {"items": items, "total": total, "page": page, "limit": limit}


@router.put("/admin/orders/{order_id}/status")
async def update_order_status(order_id: str, status_data: dict, admin: UserSchema = Depends(require_permission("update_order_status")), db: AsyncSession = Depends(get_db)):
    validate_uuid(order_id)
    res = await db.execute(select(OrderModel).where(OrderModel.id == order_id))
    order = res.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    prev_status = order.order_status or "processing"
    new_status = normalize_order_status(status_data.get("status"))
    if new_status not in ORDER_STATUS_TRANSITIONS:
        raise HTTPException(status_code=400, detail="Invalid status")

    valid_trans = ORDER_STATUS_TRANSITIONS.get(prev_status, [])
    if new_status not in valid_trans:
        raise HTTPException(status_code=400, detail=f"Cannot transition from {prev_status} to {new_status}")

    now = datetime.now(timezone.utc)
    if order.payment_method != "cod" and order.payment_status not in ("Paid", "completed"):
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
    if new_status == "return_approved":
        # Check if prepaid order is Paid/completed to initiate Razorpay refund
        if order.payment_method != "cod" and order.payment_status in ("Paid", "completed"):
            payment_id = order.razorpay_payment_id
            
            # Import Razorpay dependencies dynamically to avoid circular references
            from routes.orders import razorpay_client, is_test_mode
            import logging
            
            is_dummy_pay = not payment_id or payment_id.startswith(("pay_dummy_", "pay_sample_", "pay_test_"))
            if not is_dummy_pay and not is_test_mode():
                try:
                    amount_paise = int(float(order.total_amount) * 100)
                    logging.info(f"Initiating digital Razorpay refund for payment {payment_id} of amount {amount_paise} paise.")
                    refund = razorpay_client.refund.create({
                        "payment_id": payment_id,
                        "amount": amount_paise,
                        "speed": "optimum"
                    })
                    logging.info(f"Razorpay refund processed successfully. Refund ID: {refund.get('id')}")
                except Exception as e:
                    logging.error(f"Razorpay refund failed: {e}")
                    raise HTTPException(
                        status_code=400,
                        detail=f"Failed to process digital refund via Razorpay: {str(e)}"
                    )
            else:
                logging.info(f"Skipping live Razorpay refund for dummy/test payment {payment_id} or test mode.")

        effective_status = "refunded"
        order.payment_status = "refunded"
    if new_status == "return_rejected":
        effective_status = "return_rejected"

    order.order_status = effective_status
    order.updated_at = now
    if new_status == "shipped":
        carrier = str(status_data.get("carrier") or "").strip()
        tracking_id = str(status_data.get("tracking_id") or "").strip()
        tracking_url = str(status_data.get("tracking_url") or "").strip()
        if not tracking_id:
            raise HTTPException(status_code=400, detail="Tracking ID is required before marking an order shipped")
        order.carrier = carrier or None
        order.tracking_id = tracking_id
        order.tracking_url = tracking_url or None
        order.shipped_at = now
    if new_status == "delivered":
        order.delivered_at = now
        if order.payment_method == "cod" and status_data.get("mark_paid", True):
            order.payment_status = "Paid"
    if status_data.get("admin_message"):
        order.admin_message = status_data["admin_message"]

    await db.flush()
    await write_audit_log(db, "ORDER_STATUS_UPDATED", admin.id, "order", order_id, {"from": prev_status, "to": effective_status})

    # ── Transactional Emails ─────────────────────────────────────────────
    try:
        # Fetch customer email
        from sqlalchemy import select as _sel
        from models import UserModel as _UM
        user_res = await db.execute(_sel(_UM).where(_UM.id == order.user_id))
        cust = user_res.scalar_one_or_none()
        if cust:
            readable_status = effective_status.replace("_", " ").title()
            await create_notification(
                db,
                str(cust.id),
                f"Order {readable_status}",
                f"Your order {order.order_number} is now {readable_status}.",
                "order"
            )
            import asyncio
            from deps import send_email as _send
            from email_templates import (
                order_shipped_email, order_delivered_email,
                return_approved_email, return_rejected_email,
                order_cancelled_email,
            )
            order_dict = row_to_dict(order)
            cust_name = cust.full_name or cust.email
            subj = body = None
            if effective_status == "shipped":
                subj, body = order_shipped_email(cust_name, order_dict)
            elif effective_status == "delivered":
                subj, body, att = order_delivered_email(cust_name, order_dict)
            elif effective_status == "refunded" and new_status == "return_approved":
                subj, body = return_approved_email(cust_name, str(order.order_number), float(order.total_amount or 0))
            elif effective_status == "return_rejected":
                subj, body = return_rejected_email(cust_name, str(order.order_number), status_data.get("admin_message", ""))
            elif effective_status == "cancelled":
                subj, body = order_cancelled_email(cust_name, str(order.order_number), float(order.total_amount or 0))
            if subj and body:
                if effective_status == "delivered" and 'att' in locals():
                    asyncio.create_task(_send(cust.email, subj, body, attachments=att))
                else:
                    asyncio.create_task(_send(cust.email, subj, body))
    except Exception:
        pass

    return {"message": "Order status updated", "order": row_to_dict(order)}


# ── Customers (Admin) ────────────────────────────────────────────────────
@router.get("/admin/customers")
async def list_customers(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    segment: Optional[str] = Query(None),
    admin: UserSchema = Depends(require_permission("manage_customers")),
    db: AsyncSession = Depends(get_db)
):
    search = sanitize_search_term(search)
    loyalty_res = await db.execute(select(SettingModel).where(SettingModel.key == "loyalty_settings"))
    loyalty_setting = loyalty_res.scalar_one_or_none()
    loyalty_config = {"minimum_orders": 10, "minimum_spend": 15000.0, "criteria_mode": "either"}
    if loyalty_setting and isinstance(loyalty_setting.value, dict):
        loyalty_config.update(loyalty_setting.value)
    min_orders = int(loyalty_config.get("minimum_orders") if loyalty_config.get("minimum_orders") is not None else 10)
    min_spend = float(loyalty_config.get("minimum_spend") if loyalty_config.get("minimum_spend") is not None else 15000.0)
    criteria_mode = loyalty_config.get("criteria_mode") if loyalty_config.get("criteria_mode") in {"either", "both", "orders_only", "spend_only"} else "either"

    eligible_order = and_(
        OrderModel.payment_status.in_(["completed", "Paid", "Cash On Delivery"]),
        OrderModel.order_status != "cancelled",
    )
    orders_expr = func.count(OrderModel.id).filter(eligible_order)
    spend_expr = func.coalesce(func.sum(OrderModel.total_amount).filter(eligible_order), 0)

    q = (
        select(
            UserModel,
            orders_expr.label("orders_count"),
            spend_expr.label("total_spent"),
        )
        .join(OrderModel, OrderModel.user_id == UserModel.id, isouter=True)
        .where(UserModel.role == "customer")
        .group_by(UserModel.id)
    )

    clause = None
    if search:
        like_term = f"%{search}%"
        clause = or_(
            UserModel.full_name.ilike(like_term),
            UserModel.email.ilike(like_term),
            UserModel.phone.ilike(like_term)
        )
        q = q.where(clause)

    loyal_segment = segment == "loyal"
    if loyal_segment:
        orders_ok = orders_expr >= min_orders
        spend_ok = spend_expr >= min_spend
        if criteria_mode == "orders_only":
            q = q.having(orders_ok)
        elif criteria_mode == "spend_only":
            q = q.having(spend_ok)
        elif criteria_mode == "both":
            q = q.having(and_(orders_ok, spend_ok))
        else:
            q = q.having(orders_ok | spend_ok)

    offset = (page - 1) * limit
    total = (await db.execute(select(func.count()).select_from(q.order_by(None).subquery()))).scalar() or 0
    res = await db.execute(q.order_by(UserModel.created_at.desc()).offset(offset).limit(limit))
    rows = res.all()

    rows_data = []
    for u, orders_count, total_spent in rows:
        orders_count = int(orders_count or 0)
        total_spent = float(total_spent or 0)
        orders_ok = orders_count >= min_orders
        spend_ok = total_spent >= min_spend
        if criteria_mode == "orders_only":
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
            "loyalty_criteria": {"minimum_orders": min_orders, "minimum_spend": min_spend, "criteria_mode": criteria_mode}
        })

    return {"items": rows_data, "total": total, "page": page, "limit": limit}


@router.get("/admin/customers/{customer_id}")
async def get_customer_details(
    customer_id: str,
    admin: UserSchema = Depends(require_permission("manage_customers")),
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
    orders = [row_to_dict(order) for order in order_res.scalars().all()]

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

    return {
        "customer": {
            "id": str(user.id),
            "name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "status": user.status,
            "is_active": user.is_active,
            "created_at": user.created_at.isoformat(),
        },
        "addresses": addresses,
        "orders": orders,
        "reviews": reviews,
    }


# ── Admins (Admin) ───────────────────────────────────────────────────────
@router.get("/superadmin/admins")
async def list_admin_users(admin: UserSchema = Depends(require_permission("manage_admins")), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(UserModel).where(UserModel.role.in_(["admin", "SUPER_ADMIN"])))
    rows = []
    for u in res.scalars().all():
        d = row_to_dict(u)
        d.pop('password', None)
        rows.append(d)
    return rows


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
    permissions_dict = payload.permissions or {}
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
        u.permissions = data.permissions
    await db.flush()
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
    rows = []
    for u in res.scalars().all():
        d = row_to_dict(u)
        d.pop('password', None)
        rows.append(d)
    return rows


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
    permissions_dict = payload.permissions or {}
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
        u.permissions = data.permissions
    await db.flush()
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
    res = await db.execute(select(SettingModel))
    data = {s.key: s.value for s in res.scalars().all()}
    loyalty = dict(data.get("loyalty_settings") or {})
    data["loyalty_settings"] = {
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
    res = await db.execute(select(SettingModel).where(SettingModel.key.in_(["company_profile", "payment_settings", "scrolling_banner", "shipping_settings", "popup_banner", "feedback_settings", "loyalty_settings"])))
    d = {s.key: s.value for s in res.scalars().all()}
    if "payment_settings" not in d:
        d["payment_settings"] = {"cod_enabled": True}
    if "popup_banner" not in d:
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
        d["loyalty_settings"] = {"minimum_orders": 10, "minimum_spend": 15000.0, "criteria_mode": "either"}
    else:
        loyalty = dict(d["loyalty_settings"] or {})
        d["loyalty_settings"] = {
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
                "Transaction ID": str(order.get("transaction_id") or ""),
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

    return {"items": [row_to_dict(row[0]) for row in rows], "total": total, "page": page, "limit": limit}
