"""Admin management routes."""
from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func, or_, String
from typing import Optional, List
from database import get_db
from models import (
    ProductModel, OrderModel, UserModel, SettingModel,
    StockHistoryModel, GstRecordModel, GstImportModel, AuditLogModel
)
from deps import (
    UserSchema, ProductSchema, ProductBulkCreateRequest,
    AdminCreateRequest, AdminUpdateRequest, PasswordResetRequest,
    require_permission, sanitize_search_term, is_super_admin_role,
    write_audit_log, row_to_dict, normalize_order_status,
    ORDER_STATUS_TRANSITIONS, UPLOADS_DIR, validate_uuid, is_valid_uuid
)
from storage_service import upload_image, upload_media, delete_asset
import uuid
from datetime import datetime, timezone
import pandas as pd
from io import BytesIO
import os

router = APIRouter(prefix="/api")

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
    allowed = {'name', 'description', 'size', 'thickness', 'price', 'discount_price', 'badge', 'image_url', 'media_urls', 'features', 'in_stock', 'stock_quantity', 'category', 'batch_no', 'width', 'low_stock_threshold'}
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
    base_q = select(OrderModel)
    count_q = select(func.count(OrderModel.id))

    if status and status.upper() != "ALL":
        base_q = base_q.where(func.lower(OrderModel.order_status) == status.lower())
        count_q = count_q.where(func.lower(OrderModel.order_status) == status.lower())
    if search:
        like_term = f"%{search}%"
        clause = or_(
            OrderModel.order_number.ilike(like_term),
            OrderModel.customer_name.ilike(like_term),
            func.cast(OrderModel.user_id, String).ilike(like_term),
        )
        base_q = base_q.where(clause)
        count_q = count_q.where(clause)

    total = (await db.execute(count_q)).scalar() or 0
    offset = (page - 1) * limit
    res = await db.execute(base_q.order_by(OrderModel.updated_at.desc()).offset(offset).limit(limit))
    items = [row_to_dict(o) for o in res.scalars().all()]
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
        for item in (order.items or []):
            pid = item.get("product_id")
            qty = int(item.get("quantity", 0))
            if pid and is_valid_uuid(pid) and qty > 0:
                p_res = await db.execute(select(ProductModel).where(ProductModel.id == pid).with_for_update())
                p = p_res.scalar_one_or_none()
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
        for item in (order.items or []):
            pid = item.get("product_id")
            qty = int(item.get("quantity", 0))
            if pid and is_valid_uuid(pid) and qty > 0:
                p_res = await db.execute(select(ProductModel).where(ProductModel.id == pid).with_for_update())
                p = p_res.scalar_one_or_none()
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

    return {"message": "Order status updated"}


# ── Customers (Admin) ────────────────────────────────────────────────────
@router.get("/admin/customers")
async def list_customers(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    admin: UserSchema = Depends(require_permission("manage_customers")),
    db: AsyncSession = Depends(get_db)
):
    search = sanitize_search_term(search)
    base_q = select(UserModel).where(UserModel.role == "customer")
    count_q = select(func.count(UserModel.id)).where(UserModel.role == "customer")

    if search:
        like_term = f"%{search}%"
        clause = or_(
            UserModel.full_name.ilike(like_term),
            UserModel.email.ilike(like_term),
            UserModel.phone.ilike(like_term)
        )
        base_q = base_q.where(clause)
        count_q = count_q.where(clause)

    total = (await db.execute(count_q)).scalar() or 0
    offset = (page - 1) * limit
    res = await db.execute(base_q.order_by(UserModel.created_at.desc()).offset(offset).limit(limit))
    users = res.scalars().all()

    # Aggregate order counts
    user_ids = [u.id for u in users]
    order_stats = {}
    if user_ids:
        stat_res = await db.execute(
            select(OrderModel.user_id, func.count(OrderModel.id).label('cnt'), func.sum(OrderModel.total_amount).label('tot'))
            .where(OrderModel.user_id.in_(user_ids), OrderModel.payment_status.in_(["completed", "Paid"]))
            .group_by(OrderModel.user_id)
        )
        for row in stat_res.all():
            order_stats[row.user_id] = {"orders_count": row.cnt, "total_spent": float(row.tot or 0)}

    rows = []
    for u in users:
        st = order_stats.get(u.id, {"orders_count": 0, "total_spent": 0.0})
        rows.append({
            "id": str(u.id),
            "name": u.full_name or "Anonymous",
            "email": u.email,
            "phone": u.phone,
            "created_at": u.created_at.isoformat(),
            "orders_count": st["orders_count"],
            "total_spent": round(st["total_spent"], 2)
        })
    return {"items": rows, "total": total, "page": page, "limit": limit}


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
    return {s.key: s.value for s in res.scalars().all()}


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
    await db.flush()
    await write_audit_log(db, "SETTING_UPDATED", admin.id, "setting", key)
    return {"message": "Setting saved"}


@router.get("/settings/public")
async def get_public_settings(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SettingModel).where(SettingModel.key.in_(["company_profile", "payment_settings", "scrolling_banner"])))
    d = {s.key: s.value for s in res.scalars().all()}
    if "payment_settings" not in d:
        d["payment_settings"] = {"cod_enabled": True}
    if "scrolling_banner" not in d:
        d["scrolling_banner"] = {
            "text1": "Durga Shakti Foils: Premium Packing Solutions",
            "text2": "50% off discount sale ends in {timer}",
            "timer_enabled": True,
            "timer_target": "2026-05-20T12:00:00Z"
        }
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


@router.post("/admin/gst/import")
async def import_gst_file(file: UploadFile = File(...), admin: UserSchema = Depends(require_permission("upload_gst_files")), db: AsyncSession = Depends(get_db)):
    fn = (file.filename or "").lower()
    if not fn.endswith((".csv", ".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Unsupported format")
    raw = await file.read()
    if len(raw) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Max 10MB")
    df = pd.read_csv(BytesIO(raw)) if fn.endswith(".csv") else pd.read_excel(BytesIO(raw))
    df.columns = [str(c).strip().lower() for c in df.columns]

    import_id = str(uuid.uuid4())
    inserted = 0
    failed = 0
    for _, r in df.iterrows():
        try:
            inv = str(r.get("invoice_number", "")).strip()
            if not inv:
                failed += 1; continue
            existing = await db.execute(select(GstRecordModel).where(GstRecordModel.invoice_number == inv))
            if existing.scalar_one_or_none():
                failed += 1; continue
            g = GstRecordModel(
                id=str(uuid.uuid4()),
                import_id=import_id,
                invoice_number=inv,
                invoice_date=str(pd.to_datetime(r.get("invoice_date")).date()),
                customer_name=str(r.get("customer_name", "")).strip(),
                taxable_amount=float(r.get("taxable_amount", r.get("total_amount", 0))),
                gst_amount=float(r.get("gst_amount", 0)),
                cgst_amount=float(r.get("cgst_amount", 0)),
                sgst_amount=float(r.get("sgst_amount", 0)),
                igst_amount=float(r.get("igst_amount", 0)),
                total_amount=float(r.get("total_amount", 0)),
            )
            db.add(g)
            inserted += 1
        except Exception as e:
            import logging
            logging.error(f"Failed to import GST record: {e}")
            failed += 1
    db.add(GstImportModel(id=import_id, file_name=file.filename, uploaded_by=admin.id, record_count=inserted, error_count=failed))
    await db.flush()
    return {"import_id": import_id, "record_count": inserted, "error_count": failed}


@router.get("/admin/gst/reports")
async def get_gst_reports(page: int = Query(1), limit: int = Query(50), search: Optional[str] = None, admin: UserSchema = Depends(require_permission("view_gst_reports")), db: AsyncSession = Depends(get_db)):
    search = sanitize_search_term(search)
    base_q = select(GstRecordModel)
    count_q = select(func.count(GstRecordModel.id))
    if search:
        clause = or_(GstRecordModel.invoice_number.ilike(f"%{search}%"), GstRecordModel.customer_name.ilike(f"%{search}%"))
        base_q = base_q.where(clause)
        count_q = count_q.where(clause)

    total = (await db.execute(count_q)).scalar() or 0
    res = await db.execute(base_q.order_by(GstRecordModel.invoice_date.desc()).offset((page-1)*limit).limit(limit))
    return {"items": [row_to_dict(g) for g in res.scalars().all()], "total": total, "page": page, "limit": limit}


@router.get("/admin/gst/imports")
async def get_gst_imports(admin: UserSchema = Depends(require_permission("view_gst_reports")), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(GstImportModel).order_by(GstImportModel.upload_date.desc()).limit(100))
    return [row_to_dict(i) for i in res.scalars().all()]


@router.post("/admin/gst/seed-sample")
async def seed_sample_gst(admin: UserSchema = Depends(require_permission("import_gst_data")), db: AsyncSession = Depends(get_db)):
    
    import_id = str(uuid.uuid4())
    samples = [
        {
            "invoice_number": "INV-2026-003",
            "invoice_date": "2026-05-10",
            "customer_name": "Aman Packaging Industries",
            "taxable_amount": 45000.0,
            "gst_amount": 8100.0,
            "cgst_amount": 4050.0,
            "sgst_amount": 4050.0,
            "igst_amount": 0.0,
            "total_amount": 53100.0
        },
        {
            "invoice_number": "INV-2026-004",
            "invoice_date": "2026-05-12",
            "customer_name": "Balaji Retail Distributors",
            "taxable_amount": 12500.0,
            "gst_amount": 2250.0,
            "cgst_amount": 1125.0,
            "sgst_amount": 1125.0,
            "igst_amount": 0.0,
            "total_amount": 14750.0
        },
        {
            "invoice_number": "INV-2026-005",
            "invoice_date": "2026-05-15",
            "customer_name": "Apex Food Packagers LLC",
            "taxable_amount": 85000.0,
            "gst_amount": 15300.0,
            "cgst_amount": 0.0,
            "sgst_amount": 0.0,
            "igst_amount": 15300.0,
            "total_amount": 100300.0
        }
    ]
    
    inserted = 0
    failed = 0
    for s in samples:
        existing = await db.execute(select(GstRecordModel).where(GstRecordModel.invoice_number == s["invoice_number"]))
        if existing.scalar_one_or_none():
            failed += 1
            continue
            
        g = GstRecordModel(
            id=str(uuid.uuid4()),
            import_id=import_id,
            invoice_number=s["invoice_number"],
            invoice_date=s["invoice_date"],
            customer_name=s["customer_name"],
            taxable_amount=s["taxable_amount"],
            gst_amount=s["gst_amount"],
            cgst_amount=s["cgst_amount"],
            sgst_amount=s["sgst_amount"],
            igst_amount=s["igst_amount"],
            total_amount=s["total_amount"],
        )
        db.add(g)
        inserted += 1
        
    if inserted > 0:
        db.add(GstImportModel(
            id=import_id, 
            file_name="seed_sample.csv", 
            uploaded_by=admin.id, 
            record_count=inserted, 
            error_count=failed
        ))
        await db.flush()
        
    return {"import_id": import_id, "record_count": inserted, "error_count": failed}


@router.get("/admin/audit-logs")
async def get_audit_logs(page: int = Query(1), limit: int = Query(50), search: Optional[str] = None, admin: UserSchema = Depends(require_permission("view_audit_logs")), db: AsyncSession = Depends(get_db)):
    search = sanitize_search_term(search)
    base_q = select(AuditLogModel)
    count_q = select(func.count(AuditLogModel.id))
    if search:
        clause = or_(AuditLogModel.action.ilike(f"%{search}%"), AuditLogModel.actor_id.ilike(f"%{search}%"), AuditLogModel.target_id.ilike(f"%{search}%"))
        base_q = base_q.where(clause)
        count_q = count_q.where(clause)

    total = (await db.execute(count_q)).scalar() or 0
    res = await db.execute(base_q.order_by(AuditLogModel.created_at.desc()).offset((page-1)*limit).limit(limit))
    return {"items": [row_to_dict(a) for a in res.scalars().all()], "total": total, "page": page, "limit": limit}
