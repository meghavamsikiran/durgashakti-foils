"""Order + Payment routes."""
from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import Optional, List
from database import get_db
from models import OrderModel, ProductModel, CartModel, SettingModel
from deps import (
    UserSchema, OrderCreate, get_current_user, row_to_dict,
    write_audit_log, send_email, create_notification,
    ORDER_STATUS_TRANSITIONS, normalize_order_status,
    UPLOADS_DIR, validate_uuid, is_valid_uuid,
    get_category_discount_map
)
from storage_service import upload_image
from datetime import datetime, timezone, timedelta
from io import BytesIO
import asyncio
import os, uuid, time, logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")

PAID_PAYMENT_STATUSES = {"paid", "completed", "Cash On Delivery"}


def _is_paid_order(order: OrderModel) -> bool:
    return str(order.payment_status or "").lower() in {s.lower() for s in PAID_PAYMENT_STATUSES}


def _expected_amount_paise(order: OrderModel) -> int:
    return int(round(float(order.total_amount or 0) * 100))


async def _clear_user_cart(db: AsyncSession, user_id, now: datetime):
    if not user_id:
        return
    await db.execute(
        update(CartModel)
        .where(CartModel.user_id == user_id)
        .values(items=[], updated_at=now)
    )


async def _deduct_stock_once(order: OrderModel, db: AsyncSession, now: datetime) -> bool:
    if order.stock_applied:
        return True

    deducted = []
    try:
        items_to_deduct = [
            item for item in (order.items or [])
            if item.get("product_id")
            and is_valid_uuid(item.get("product_id"))
            and int(item.get("quantity", 0)) > 0
        ]
        if items_to_deduct:
            prod_ids = [item.get("product_id") for item in items_to_deduct]
            prod_res = await db.execute(select(ProductModel).where(ProductModel.id.in_(prod_ids)).with_for_update())
            locked_products = {str(p.id): p for p in prod_res.scalars().all()}
            for item in items_to_deduct:
                pid = item.get("product_id")
                qty = int(item.get("quantity", 0))
                product = locked_products.get(str(pid))
                if not product:
                    raise ValueError(f"Product {pid} not found while applying paid order stock")
                if int(product.stock_quantity or 0) < qty:
                    raise ValueError(f"Insufficient stock for '{product.name}' while applying paid order stock")
                product.stock_quantity = max(0, int(product.stock_quantity) - qty)
                product.units_sold = int(product.units_sold or 0) + qty
                product.updated_at = now
                if product.stock_quantity <= 0:
                    product.in_stock = False
                deducted.append((product, qty))
        order.stock_applied = True
        return True
    except Exception as exc:
        for prod, qty in deducted:
            prod.stock_quantity = int(prod.stock_quantity or 0) + qty
            prod.units_sold = max(0, int(prod.units_sold or 0) - qty)
            prod.in_stock = True
            prod.updated_at = now
        order.stock_applied = False
        logger.error("Paid order stock deduction failed for %s: %s", order.order_number, exc)
        try:
            await write_audit_log(
                db,
                "ORDER_STOCK_DEDUCTION_FAILED",
                order.user_id,
                "order",
                str(order.id),
                {"error": str(exc)}
            )
        except Exception:
            logger.exception("Failed to audit stock deduction failure for %s", order.order_number)
        return False


async def _finalize_paid_order(
    order: OrderModel,
    db: AsyncSession,
    *,
    payment_id: Optional[str] = None,
    audit_action: Optional[str] = None,
    audit_metadata: Optional[dict] = None,
) -> dict:
    now = datetime.now(timezone.utc)
    was_paid = _is_paid_order(order)

    await _deduct_stock_once(order, db, now)

    order.payment_status = "Paid"
    order.order_status = "confirmed"
    order.updated_at = now

    await _clear_user_cart(db, order.user_id, now)
    await db.flush()

    if audit_action:
        await write_audit_log(
            db,
            audit_action,
            order.user_id,
            "order",
            str(order.id),
            audit_metadata or {}
        )

    return {"success": True, "newly_paid": not was_paid, "stock_applied": bool(order.stock_applied)}


async def _enrich_order_items(db: AsyncSession, orders_data):
    if not orders_data:
        return orders_data
    is_list = isinstance(orders_data, list)
    orders = orders_data if is_list else [orders_data]
    product_ids = set()
    for order in orders:
        for item in order.get("items", []):
            if not item.get("image_url") and item.get("product_id"):
                product_ids.add(item["product_id"])
    if product_ids:
        result = await db.execute(select(ProductModel.id, ProductModel.image_url).where(ProductModel.id.in_(list(product_ids))))
        product_image_map = {str(r.id): r.image_url for r in result.all() if r.image_url}
        for order in orders:
            for item in order.get("items", []):
                if not item.get("image_url") and item.get("product_id"):
                    item["image_url"] = product_image_map.get(item["product_id"]) or "/uploads/foil_9m.png"
    return orders_data if is_list else orders[0]


@router.post("/orders")
async def create_order(order_data: OrderCreate, current_user: UserSchema = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    order_data.payment_method = "cod"
    if order_data.idempotency_key:
        existing = await db.execute(select(OrderModel).where(OrderModel.idempotency_key == order_data.idempotency_key))
        row = existing.scalar_one_or_none()
        if row:
            return row_to_dict(row)

    server_total = 0.0
    product_cache = {}
    prod_ids = [item.product_id for item in order_data.items if is_valid_uuid(item.product_id)]
    products_map = {}
    if prod_ids:
        prod_res = await db.execute(select(ProductModel).where(ProductModel.id.in_(prod_ids)))
        products_map = {str(p.id): p for p in prod_res.scalars().all()}
    category_discounts = await get_category_discount_map(db, [product.category for product in products_map.values()])

    def effective_product_price(product):
        base_price = float(product.price or 0)
        category_percent = category_discounts.get(str(product.category or "").strip().lower(), 0)
        if category_percent > 0 and base_price > 0:
            return round(base_price * (1 - (category_percent / 100)), 2)
        item_discount = float(product.discount_price or 0)
        if item_discount > 0 and item_discount < base_price:
            return round(item_discount, 2)
        return round(base_price, 2)

    for item in order_data.items:
        product = products_map.get(str(item.product_id))
        if not product:
            raise HTTPException(status_code=400, detail=f"Product '{item.product_name}' not found")
        if int(product.stock_quantity or 0) <= 0 or not product.in_stock:
            raise HTTPException(status_code=400, detail=f"'{item.product_name}' is out of stock")
        if item.quantity > int(product.stock_quantity or 0):
            raise HTTPException(status_code=400, detail=f"Only {product.stock_quantity} units of '{item.product_name}' available")
        product_cache[item.product_id] = product
        effective_price = effective_product_price(product)
        server_total += effective_price * item.quantity
    server_total = round(server_total, 2)
    
    # Dynamic Shipping and COD Settings calculation from Database
    from models import SettingModel
    setting_res = await db.execute(select(SettingModel).where(SettingModel.key == "shipping_settings"))
    setting_obj = setting_res.scalar_one_or_none()
    
    # Enterprise Fallback Defaults
    shipping_config = {
        "enableShipping": True,
        "enableFreeShipping": True,
        "freeShippingThreshold": 1099.0,
        "defaultShippingCharge": 70.0,
        "codEnabled": True,
        "codCharge": 0.0,
        "minimumCodAmount": 300.0,
        "maximumCodAmount": 5000.0
    }
    if setting_obj and isinstance(setting_obj.value, dict):
        for k, default_val in shipping_config.items():
            shipping_config[k] = setting_obj.value.get(k, default_val)
        shipping_config["codCharge"] = (
            setting_obj.value.get("codCharge")
            if setting_obj.value.get("codCharge") is not None
            else setting_obj.value.get("cod_extra_service_charge", setting_obj.value.get("cod_charge", shipping_config["codCharge"]))
        )
            
    # Calculations
    coupon_codes_list = order_data.coupon_codes or []
    discount_amount = 0.0
    free_shipping = False

    if coupon_codes_list:
        from routes.coupons import validate_coupons_logic
        val_res = await validate_coupons_logic(db, str(current_user.id), coupon_codes_list, server_total)
        if not val_res.get("valid", True) and val_res.get("error"):
            raise HTTPException(status_code=400, detail=val_res.get("error"))
        if val_res.get("errors"):
            err_msg = list(val_res["errors"].values())[0]
            raise HTTPException(status_code=400, detail=err_msg)
        
        discount_amount = float(val_res.get("discount_amount", 0.0))
        free_shipping = bool(val_res.get("free_shipping", False))

    taxable_amount = round(max(0.0, server_total - discount_amount), 2)
    cgst_amount = round(taxable_amount * 0.09, 2)
    sgst_amount = round(taxable_amount * 0.09, 2)
    
    # Calculate Shipping dynamically
    shipping_cost = 0.0
    enable_shipping = shipping_config["enableShipping"]
    if setting_obj and isinstance(setting_obj.value, dict):
        if setting_obj.value.get("shippingRuleStatus") == "Inactive":
            enable_shipping = False

    if enable_shipping and not free_shipping:
        if shipping_config["enableFreeShipping"] and taxable_amount >= float(shipping_config["freeShippingThreshold"]):
            shipping_cost = 0.0
        else:
            shipping_cost = float(shipping_config["defaultShippingCharge"])
            
    # Calculate COD dynamically with limits validation
    cod_charge = 0.0
    cod_enabled = shipping_config["codEnabled"]
    if setting_obj and isinstance(setting_obj.value, dict):
        if setting_obj.value.get("codStatus") == "Inactive":
            cod_enabled = False

    if order_data.payment_method == "cod":
        if not cod_enabled:
            raise HTTPException(status_code=400, detail="Cash on Delivery is currently disabled.")
        if taxable_amount < float(shipping_config["minimumCodAmount"]):
            raise HTTPException(status_code=400, detail=f"Order amount is below the minimum Cash on Delivery limit of ₹{shipping_config['minimumCodAmount']}.")
        if taxable_amount > float(shipping_config["maximumCodAmount"]):
            raise HTTPException(status_code=400, detail=f"Order amount exceeds the maximum Cash on Delivery limit of ₹{shipping_config['maximumCodAmount']}.")
        cod_charge = float(shipping_config["codCharge"])
        
    grand_total = round(taxable_amount + cgst_amount + sgst_amount + shipping_cost + cod_charge, 2)

    enriched_items = []
    for item in order_data.items:
        product = product_cache.get(item.product_id)
        item_dict = item.model_dump()
        if product:
            item_dict['price'] = effective_product_price(product)
            item_dict['image_url'] = product.image_url
        else:
            item_dict['image_url'] = None
        enriched_items.append(item_dict)

    # Generate unique order number similar to Amazon format (3-7-7 numeric format)
    import random
    while True:
        part1 = random.randint(100, 999)
        part2 = random.randint(1000000, 9999999)
        part3 = random.randint(1000000, 9999999)
        candidate = f"{part1}-{part2}-{part3}"
        
        dup_res = await db.execute(select(OrderModel).where(OrderModel.order_number == candidate))
        if not dup_res.scalar_one_or_none():
            order_number = candidate
            break

    now = datetime.now(timezone.utc)
    order_status = "confirmed" if order_data.payment_method == "cod" else "pending_payment"
    payment_status = "Cash On Delivery" if order_data.payment_method == "cod" else "pending"
    stock_applied = True if order_data.payment_method == "cod" else False

    # Store shipping breakdown inside shipping_address metadata
    shipping_address_dict = order_data.shipping_address.model_dump()
    shipping_address_dict["shipping_metadata"] = {
        "subtotal": server_total,
        "discount_amount": discount_amount,
        "shipping_cost": shipping_cost,
        "cgst_amount": cgst_amount,
        "sgst_amount": sgst_amount,
        "cod_charge": cod_charge,
        "grand_total": grand_total
    }

    order = OrderModel(
        order_number=order_number,
        user_id=current_user.id,
        customer_name=current_user.full_name,
        items=enriched_items,
        total_amount=grand_total,
        coupon_codes=coupon_codes_list,
        discount_amount=discount_amount,
        payment_method=order_data.payment_method,
        payment_status=payment_status,
        order_status=order_status,
        stock_applied=stock_applied,
        shipping_address=shipping_address_dict,
        idempotency_key=order_data.idempotency_key,
        created_at=now,
        updated_at=now,
    )
    db.add(order)
    await db.flush()

    # Increment coupon analytics
    if coupon_codes_list:
        from models import CouponModel
        for code in coupon_codes_list:
            code_upper = code.strip().upper()
            c_res = await db.execute(select(CouponModel).where(CouponModel.code == code_upper).with_for_update())
            coupon_to_update = c_res.scalar_one_or_none()
            if coupon_to_update:
                coupon_to_update.total_uses = coupon_to_update.total_uses + 1
                c_discount = 0.0
                if coupon_to_update.discount_type == "percentage":
                    c_discount = float(server_total) * (float(coupon_to_update.discount_value) / 100.0)
                    if coupon_to_update.max_discount_limit is not None:
                        c_discount = min(c_discount, float(coupon_to_update.max_discount_limit))
                elif coupon_to_update.discount_type == "flat":
                    c_discount = float(coupon_to_update.discount_value)
                c_discount = min(c_discount, server_total)
                coupon_to_update.total_discount_given = float(coupon_to_update.total_discount_given) + c_discount
                coupon_to_update.revenue_generated = float(coupon_to_update.revenue_generated) + grand_total

    await create_notification(
        db,
        str(current_user.id),
        "Order placed",
        f"Your order {order.order_number} has been placed successfully.",
        "order"
    )

    # Atomic stock deduction (Only for COD now!)
    if order_data.payment_method == "cod":
        deducted = []
        try:
            prod_ids = [item.product_id for item in order_data.items if is_valid_uuid(item.product_id)]
            prod_res = await db.execute(select(ProductModel).where(ProductModel.id.in_(prod_ids)).with_for_update())
            locked_products = {str(p.id): p for p in prod_res.scalars().all()}
            
            for item in order_data.items:
                product = locked_products.get(str(item.product_id))
                if not product:
                    raise HTTPException(status_code=400, detail=f"Product '{item.product_name}' not found")
                if int(product.stock_quantity or 0) < item.quantity:
                    raise HTTPException(status_code=400, detail=f"Insufficient stock for '{item.product_name}'")
                product.stock_quantity = max(0, int(product.stock_quantity) - item.quantity)
                product.units_sold = int(product.units_sold or 0) + item.quantity
                product.updated_at = now
                if product.stock_quantity <= 0:
                    product.in_stock = False
                deducted.append(item)
        except HTTPException:
            if deducted:
                deducted_ids = [d_item.product_id for d_item in deducted]
                restore_res = await db.execute(select(ProductModel).where(ProductModel.id.in_(deducted_ids)))
                restore_map = {str(p.id): p for p in restore_res.scalars().all()}
                for d_item in deducted:
                    p = restore_map.get(str(d_item.product_id))
                    if p:
                        p.stock_quantity = int(p.stock_quantity or 0) + d_item.quantity
                        p.units_sold = max(0, int(p.units_sold or 0) - d_item.quantity)
                        p.in_stock = True
                        p.updated_at = now
            order.order_status = "cancelled"
            order.stock_applied = False
            raise

    if order_data.payment_method == "cod":
        try:
            from email_templates import order_confirmation_email
            subj, body = order_confirmation_email(current_user.full_name or current_user.email, row_to_dict(order))
            import asyncio
            asyncio.create_task(send_email(current_user.email, subj, body))
        except Exception:
            pass

    return row_to_dict(order)
@router.get("/orders")
async def get_user_orders(current_user: UserSchema = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(OrderModel).where(OrderModel.user_id == current_user.id).order_by(OrderModel.updated_at.desc()).limit(1000)
    )
    orders = result.scalars().all()
    orders_dict = [row_to_dict(o) for o in orders]
    return await _enrich_order_items(db, orders_dict)


@router.get("/orders/{order_id}")
async def get_order(order_id: str, current_user: UserSchema = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    validate_uuid(order_id)
    result = await db.execute(select(OrderModel).where(OrderModel.id == order_id, OrderModel.user_id == current_user.id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    d = row_to_dict(order)
    return await _enrich_order_items(db, d)


@router.get("/orders/{order_id}/invoice")
async def download_order_invoice(order_id: str, current_user: UserSchema = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    validate_uuid(order_id)
    result = await db.execute(select(OrderModel).where(OrderModel.id == order_id, OrderModel.user_id == current_user.id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order_dict = await _enrich_order_items(db, row_to_dict(order))
    from invoice_service import build_tax_invoice_pdf
    pdf_bytes = build_tax_invoice_pdf(order_dict)
    invoice_name = str(order_dict.get("invoice_number") or order_dict.get("order_number") or order_id).replace("/", "-")
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="Tax_Invoice_{invoice_name}.pdf"'}
    )


@router.post("/orders/{order_id}/cancel")
async def cancel_order(order_id: str, current_user: UserSchema = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    validate_uuid(order_id)
    result = await db.execute(select(OrderModel).where(OrderModel.id == order_id, OrderModel.user_id == current_user.id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if (order.order_status or "processing").lower() not in ["pending", "pending_payment", "processing", "placed"]:
        raise HTTPException(status_code=400, detail="Only pending or processing orders can be cancelled")

    now = datetime.now(timezone.utc)
    if order.stock_applied:
        items_to_release = [item for item in (order.items or []) if item.get("product_id") and is_valid_uuid(item.get("product_id")) and int(item.get("quantity", 0)) > 0]
        if items_to_release:
            prod_ids = [item.get("product_id") for item in items_to_release]
            prod_res = await db.execute(select(ProductModel).where(ProductModel.id.in_(prod_ids)).with_for_update())
            locked_products = {str(p.id): p for p in prod_res.scalars().all()}
            for item in items_to_release:
                pid = item.get("product_id")
                qty = int(item.get("quantity", 0))
                product = locked_products.get(str(pid))
                if product:
                    product.stock_quantity = int(product.stock_quantity or 0) + qty
                    product.units_sold = max(0, int(product.units_sold or 0) - qty)
                    product.in_stock = True
                    product.updated_at = now

    order.order_status = "cancelled"
    order.stock_applied = False
    order.updated_at = now
    await create_notification(
        db,
        str(current_user.id),
        "Order cancelled",
        f"Your order {order.order_number} has been cancelled.",
        "order"
    )
    try:
        from email_templates import order_cancelled_email
        import asyncio
        subj, body = order_cancelled_email(current_user.full_name or current_user.email, str(order.order_number), float(order.total_amount or 0))
        asyncio.create_task(send_email(current_user.email, subj, body))
    except Exception:
        pass
    return {"message": "Order cancelled successfully"}


@router.post("/orders/{order_id}/return")
async def return_order(
    order_id: str,
    reason: str = Form(...),
    image: List[UploadFile] = File(None),
    current_user: UserSchema = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    validate_uuid(order_id)
    result = await db.execute(select(OrderModel).where(OrderModel.id == order_id, OrderModel.user_id == current_user.id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if (order.order_status or "").lower() != "delivered":
        raise HTTPException(status_code=400, detail="Only delivered orders can be returned")

    delivered_date = order.delivered_at or order.updated_at
    if delivered_date:
        if delivered_date.tzinfo is None:
            delivered_date = delivered_date.replace(tzinfo=timezone.utc)
        else:
            delivered_date = delivered_date.astimezone(timezone.utc)
        cutoff_date = (delivered_date + timedelta(days=4)).replace(hour=0, minute=0, second=0, microsecond=0)
        now_utc = datetime.now(timezone.utc)
        if now_utc > cutoff_date:
            raise HTTPException(status_code=400, detail="Return window has closed.")

    uploaded_urls = []
    if image:
        files_list = image if isinstance(image, list) else [image]
        for f in files_list:
            if not f or not f.filename:
                continue
            content_type = (f.content_type or '').lower()
            is_image = any(t in content_type for t in {'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'})
            is_video = any(t in content_type for t in {'video/mp4', 'video/quicktime', 'video/webm', 'video/ogg', 'video/avi'})
            if not (is_image or is_video):
                raise HTTPException(status_code=400, detail='Only png/jpg/jpeg/webp/gif images and mp4/mov/webm/ogg/avi videos are supported')
            raw = await f.read()
            if len(raw) > 20 * 1024 * 1024:
                raise HTTPException(status_code=400, detail='Each file must be under 20MB')
            
            from storage_service import upload_media
            url = await upload_media(raw, content_type, prefix=f"return_{order_id}")
            uploaded_urls.append(url)

    order.order_status = "return_requested"
    order.return_reason = reason
    order.return_image_url = ",".join(uploaded_urls) if uploaded_urls else None
    order.updated_at = datetime.now(timezone.utc)
    await create_notification(
        db,
        str(current_user.id),
        "Return requested",
        f"Your return request for order {order.order_number} has been submitted.",
        "order"
    )
    try:
        from email_templates import return_requested_email
        import asyncio
        subj, body = return_requested_email(current_user.full_name or current_user.email, str(order.order_number), reason)
        asyncio.create_task(send_email(current_user.email, subj, body))
    except Exception:
        pass
    return {"message": "Return request submitted successfully"}


# ── Payment Routes ───────────────────────────────────────────────────────
@router.post("/payment/cod/confirm")
async def confirm_cod_payment(order_id: str, current_user: UserSchema = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    validate_uuid(order_id)
    result = await db.execute(select(OrderModel).where(OrderModel.id == order_id, OrderModel.user_id == current_user.id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    now = datetime.now(timezone.utc)
    order.payment_status = "Cash On Delivery"
    order.order_status = "confirmed"
    order.updated_at = now
    await create_notification(
        db,
        str(current_user.id),
        "COD confirmed",
        f"Cash on Delivery is confirmed for order {order.order_number}.",
        "payment"
    )
    await _clear_user_cart(db, current_user.id, now)
    await write_audit_log(db, "ORDER_COD_CONFIRMED", current_user.id, "order", order_id)
    return {"success": True, "message": "COD order confirmed"}
