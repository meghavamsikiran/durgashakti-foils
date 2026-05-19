"""Order + Payment routes."""
from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import Optional, List
from database import get_db
from models import OrderModel, ProductModel, CartModel, SettingModel
from deps import (
    UserSchema, OrderCreate, get_current_user, row_to_dict,
    write_audit_log, send_email, create_notification,
    ORDER_STATUS_TRANSITIONS, normalize_order_status,
    UPLOADS_DIR, validate_uuid, is_valid_uuid
)
from storage_service import upload_image
from datetime import datetime, timezone, timedelta
import os, uuid, time, logging, razorpay

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")

razorpay_client = razorpay.Client(auth=(
    os.environ.get('RAZORPAY_KEY_ID', ''),
    os.environ.get('RAZORPAY_KEY_SECRET', '')
))

def is_test_mode() -> bool:
    k = os.environ.get('RAZORPAY_KEY_ID', '')
    return not k or k.startswith('rzp_test_') or k in ('rzp_test_dummy', '')


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
    if order_data.payment_method == "cod":
        setting_res = await db.execute(select(SettingModel).where(SettingModel.key == "payment_settings"))
        setting = setting_res.scalar_one_or_none()
        cod_enabled = True
        if setting and setting.value:
            cod_enabled = setting.value.get("cod_enabled", True)
        if not cod_enabled:
            raise HTTPException(status_code=400, detail="Currently we accept only prepaid orders.")

    if order_data.idempotency_key:
        existing = await db.execute(select(OrderModel).where(OrderModel.idempotency_key == order_data.idempotency_key))
        row = existing.scalar_one_or_none()
        if row:
            return row_to_dict(row)

    server_total = 0.0
    for item in order_data.items:
        prod_res = await db.execute(select(ProductModel).where(ProductModel.id == item.product_id))
        product = prod_res.scalar_one_or_none()
        if not product:
            raise HTTPException(status_code=400, detail=f"Product '{item.product_name}' not found")
        if int(product.stock_quantity or 0) <= 0 or not product.in_stock:
            raise HTTPException(status_code=400, detail=f"'{item.product_name}' is out of stock")
        if item.quantity > int(product.stock_quantity or 0):
            raise HTTPException(status_code=400, detail=f"Only {product.stock_quantity} units of '{item.product_name}' available")
        effective_price = float(product.discount_price or product.price or 0)
        server_total += effective_price * item.quantity
    server_total = round(server_total, 2)

    enriched_items = []
    for item in order_data.items:
        prod_res = await db.execute(select(ProductModel).where(ProductModel.id == item.product_id))
        product = prod_res.scalar_one_or_none()
        item_dict = item.model_dump()
        item_dict['image_url'] = product.image_url if product else None
        enriched_items.append(item_dict)

    order_number = f"ORD-{int(time.time())}-{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc)
    order_status = "confirmed" if order_data.payment_method == "cod" else "pending_payment"
    payment_status = "Cash On Delivery" if order_data.payment_method == "cod" else "pending"
    stock_applied = True if order_data.payment_method == "cod" else False

    order = OrderModel(
        order_number=order_number,
        user_id=current_user.id,
        customer_name=current_user.full_name,
        items=enriched_items,
        total_amount=server_total,
        payment_method=order_data.payment_method,
        payment_status=payment_status,
        order_status=order_status,
        stock_applied=stock_applied,
        shipping_address=order_data.shipping_address.model_dump(),
        idempotency_key=order_data.idempotency_key,
        created_at=now,
        updated_at=now,
    )
    db.add(order)
    await db.flush()

    # Atomic stock deduction (Only for COD now!)
    if order_data.payment_method == "cod":
        deducted = []
        try:
            for item in order_data.items:
                prod_res = await db.execute(select(ProductModel).where(ProductModel.id == item.product_id).with_for_update())
                product = prod_res.scalar_one()
                if int(product.stock_quantity or 0) < item.quantity:
                    raise HTTPException(status_code=400, detail=f"Insufficient stock for '{item.product_name}'")
                product.stock_quantity = max(0, int(product.stock_quantity) - item.quantity)
                product.units_sold = int(product.units_sold or 0) + item.quantity
                product.updated_at = now
                if product.stock_quantity <= 0:
                    product.in_stock = False
                deducted.append(item)
        except HTTPException:
            for d_item in deducted:
                prod_res = await db.execute(select(ProductModel).where(ProductModel.id == d_item.product_id))
                p = prod_res.scalar_one_or_none()
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
    orders = [row_to_dict(o) for o in result.scalars().all()]
    return await _enrich_order_items(db, orders)


@router.get("/orders/{order_id}")
async def get_order(order_id: str, current_user: UserSchema = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    validate_uuid(order_id)
    result = await db.execute(select(OrderModel).where(OrderModel.id == order_id, OrderModel.user_id == current_user.id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    d = row_to_dict(order)
    return await _enrich_order_items(db, d)


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
        for item in (order.items or []):
            pid = item.get("product_id")
            qty = int(item.get("quantity", 0))
            if not pid or qty <= 0:
                continue
            prod_res = await db.execute(select(ProductModel).where(ProductModel.id == pid).with_for_update())
            product = prod_res.scalar_one_or_none()
            if product:
                product.stock_quantity = int(product.stock_quantity or 0) + qty
                product.units_sold = max(0, int(product.units_sold or 0) - qty)
                product.in_stock = True
                product.updated_at = now

    order.order_status = "cancelled"
    order.stock_applied = False
    order.updated_at = now
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
    try:
        from email_templates import return_requested_email
        import asyncio
        subj, body = return_requested_email(current_user.full_name or current_user.email, str(order.order_number), reason)
        asyncio.create_task(send_email(current_user.email, subj, body))
    except Exception:
        pass
    return {"message": "Return request submitted successfully"}


# ── Payment Routes ───────────────────────────────────────────────────────
@router.post("/payment/razorpay/create-order")
async def create_razorpay_order(order_id: str, current_user: UserSchema = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    validate_uuid(order_id)
    result = await db.execute(select(OrderModel).where(OrderModel.id == order_id, OrderModel.user_id == current_user.id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if is_test_mode():
        test_order_id = f"order_test_{str(uuid.uuid4())[:16]}"
        order.razorpay_order_id = test_order_id
        order.updated_at = datetime.now(timezone.utc)
        return {
            "razorpay_order_id": test_order_id,
            "amount": int(float(order.total_amount) * 100),
            "currency": "INR",
            "key_id": os.environ.get('RAZORPAY_KEY_ID', 'rzp_test_dummy'),
            "test_mode": True
        }

    try:
        rz_order = razorpay_client.order.create({
            "amount": int(float(order.total_amount) * 100),
            "currency": "INR",
            "receipt": order.order_number,
            "notes": {"order_id": order_id}
        })
        order.razorpay_order_id = rz_order['id']
        order.updated_at = datetime.now(timezone.utc)
        return {
            "razorpay_order_id": rz_order['id'],
            "amount": rz_order['amount'],
            "currency": rz_order['currency'],
            "key_id": os.environ.get('RAZORPAY_KEY_ID', 'rzp_test_dummy'),
            "test_mode": False
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/payment/razorpay/verify")
async def verify_razorpay_payment(payment_data: dict, current_user: UserSchema = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    order_id = payment_data.get('order_id')
    if not order_id:
        raise HTTPException(status_code=400, detail="order_id is required")
    validate_uuid(order_id)

    result = await db.execute(select(OrderModel).where(OrderModel.id == order_id, OrderModel.user_id == current_user.id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found or access denied")
    if payment_data.get("razorpay_order_id") and order.razorpay_order_id and payment_data.get("razorpay_order_id") != order.razorpay_order_id:
        raise HTTPException(status_code=400, detail="Payment order mismatch")

    now = datetime.now(timezone.utc)

    if not is_test_mode():
        try:
            razorpay_client.utility.verify_payment_signature(payment_data)
        except Exception:
            raise HTTPException(status_code=400, detail="Payment signature verification failed")

    # Atomic stock deduction upon successful payment verification
    if not order.stock_applied:
        deducted = []
        try:
            for item in (order.items or []):
                pid = item.get("product_id")
                qty = int(item.get("quantity", 0))
                if pid and qty > 0:
                    prod_res = await db.execute(select(ProductModel).where(ProductModel.id == pid).with_for_update())
                    product = prod_res.scalar_one_or_none()
                    if not product:
                        raise HTTPException(status_code=400, detail="Product not found")
                    if int(product.stock_quantity or 0) < qty:
                        raise HTTPException(status_code=400, detail=f"Insufficient stock for '{product.name}'")
                    product.stock_quantity = max(0, int(product.stock_quantity) - qty)
                    product.units_sold = int(product.units_sold or 0) + qty
                    product.updated_at = now
                    if product.stock_quantity <= 0:
                        product.in_stock = False
                    deducted.append((product, qty))
            order.stock_applied = True
        except Exception as e:
            for prod, qty in deducted:
                prod.stock_quantity = int(prod.stock_quantity or 0) + qty
                prod.units_sold = max(0, int(prod.units_sold or 0) - qty)
                prod.in_stock = True
                prod.updated_at = now
            order.order_status = "failed"
            order.payment_status = "failed"
            await db.flush()
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(status_code=400, detail=str(e))

    order.payment_status = "Paid"
    order.order_status = "confirmed"
    order.razorpay_payment_id = payment_data.get("razorpay_payment_id", "pay_dummy_123")
    order.updated_at = now

    # Clear cart
    cart_res = await db.execute(select(CartModel).where(CartModel.user_id == current_user.id))
    cart = cart_res.scalar_one_or_none()
    if cart:
        cart.items = []
        cart.updated_at = now

    try:
        from email_templates import payment_success_email, order_confirmation_email
        import asyncio
        order_dict = row_to_dict(order)
        subj, body = payment_success_email(current_user.full_name or current_user.email, order_dict)
        asyncio.create_task(send_email(current_user.email, subj, body))
        # Also send order confirmation with items
        subj2, body2 = order_confirmation_email(current_user.full_name or current_user.email, order_dict)
        asyncio.create_task(send_email(current_user.email, subj2, body2))
    except Exception:
        pass
    return {"success": True, "message": "Payment verified and order confirmed"}


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
    cart_res = await db.execute(select(CartModel).where(CartModel.user_id == current_user.id))
    cart = cart_res.scalar_one_or_none()
    if cart:
        cart.items = []
        cart.updated_at = now
    await write_audit_log(db, "ORDER_COD_CONFIRMED", current_user.id, "order", order_id)
    return {"success": True, "message": "COD order confirmed"}


@router.post("/payment/razorpay/pay-cod")
async def pay_cod_online(payment_data: dict, current_user: UserSchema = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    order_id = payment_data.get('order_id')
    if not order_id:
        raise HTTPException(status_code=400, detail="order_id is required")
    validate_uuid(order_id)
    result = await db.execute(select(OrderModel).where(OrderModel.id == order_id, OrderModel.user_id == current_user.id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.payment_method != "cod":
        raise HTTPException(status_code=400, detail="This order is not a COD order")
    if order.payment_status in ("completed", "Paid"):
        raise HTTPException(status_code=400, detail="This order has already been paid")

    if is_test_mode():
        test_order_id = f"order_test_{str(uuid.uuid4())[:16]}"
        order.razorpay_order_id = test_order_id
        order.updated_at = datetime.now(timezone.utc)
        return {
            "razorpay_order_id": test_order_id,
            "amount": int(float(order.total_amount) * 100),
            "currency": "INR",
            "key_id": os.environ.get('RAZORPAY_KEY_ID', 'rzp_test_dummy'),
            "test_mode": True
        }
    try:
        rz_order = razorpay_client.order.create({
            "amount": int(float(order.total_amount) * 100),
            "currency": "INR",
            "receipt": f"COD-{order.order_number}",
            "notes": {"order_id": order_id, "type": "cod_online"}
        })
        order.razorpay_order_id = rz_order['id']
        order.updated_at = datetime.now(timezone.utc)
        return {
            "razorpay_order_id": rz_order['id'],
            "amount": rz_order['amount'],
            "currency": rz_order['currency'],
            "key_id": os.environ.get('RAZORPAY_KEY_ID', 'rzp_test_dummy'),
            "test_mode": False
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create payment: {str(e)}")


@router.get("/payment/test-mode")
async def check_test_mode():
    return {"test_mode": is_test_mode()}


# ── Razorpay Webhook ─────────────────────────────────────────────────────
@router.post("/payment/razorpay/webhook")
async def razorpay_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    webhook_secret = os.environ.get('RAZORPAY_WEBHOOK_SECRET', '')
    if not webhook_secret and os.environ.get('ENVIRONMENT') == 'production':
        raise HTTPException(status_code=500, detail="Configuration error")

    client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "")
    if client_ip:
        client_ip = client_ip.split(",")[0].strip()
    allowed_ips = set(ip.strip() for ip in os.environ.get("RAZORPAY_WEBHOOK_IPS", "").split(",") if ip.strip())
    if allowed_ips and client_ip not in allowed_ips:
        raise HTTPException(status_code=403, detail="Untrusted source")

    body = await request.body()
    signature = request.headers.get('X-Razorpay-Signature', '')
    if webhook_secret:
        import hmac, hashlib
        expected_sig = hmac.new(webhook_secret.encode(), body, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected_sig, signature):
            raise HTTPException(status_code=400, detail="Invalid signature")

    try:
        payload = await request.json()
        event = payload.get('event', '')
        now = datetime.now(timezone.utc)

        if event == 'payment.captured':
            payment_entity = payload.get('payload', {}).get('payment', {}).get('entity', {})
            rz_order_id = payment_entity.get('order_id', '')
            payment_id = payment_entity.get('id', '')
            amount_paid = payment_entity.get('amount', 0)

            result = await db.execute(select(OrderModel).where(OrderModel.razorpay_order_id == rz_order_id))
            order = result.scalar_one_or_none()
            if order:
                if int(amount_paid) != int(float(order.total_amount) * 100):
                    return {"status": "amount_mismatch"}
                
                # Atomic stock deduction upon successful payment verification via webhook
                if not order.stock_applied:
                    deducted = []
                    try:
                        for item in (order.items or []):
                            pid = item.get("product_id")
                            qty = int(item.get("quantity", 0))
                            if pid and qty > 0:
                                prod_res = await db.execute(select(ProductModel).where(ProductModel.id == pid).with_for_update())
                                product = prod_res.scalar_one_or_none()
                                if not product or int(product.stock_quantity or 0) < qty:
                                    raise Exception("Insufficient stock")
                                product.stock_quantity = max(0, int(product.stock_quantity) - qty)
                                product.units_sold = int(product.units_sold or 0) + qty
                                product.updated_at = now
                                if product.stock_quantity <= 0:
                                    product.in_stock = False
                                deducted.append((product, qty))
                        order.stock_applied = True
                        order.payment_status = "Paid"
                        order.order_status = "confirmed"
                    except Exception:
                        for prod, qty in deducted:
                            prod.stock_quantity = int(prod.stock_quantity or 0) + qty
                            prod.units_sold = max(0, int(prod.units_sold or 0) - qty)
                            prod.in_stock = True
                            prod.updated_at = now
                        order.order_status = "failed"
                        order.payment_status = "failed"
                else:
                    order.payment_status = "Paid"
                    order.order_status = "confirmed"

                order.razorpay_payment_id = payment_id
                order.updated_at = now
                if order.user_id:
                    cart_res = await db.execute(select(CartModel).where(CartModel.user_id == order.user_id))
                    cart = cart_res.scalar_one_or_none()
                    if cart:
                        cart.items = []
                        cart.updated_at = now
                await write_audit_log(db, "ORDER_PAYMENT_CAPTURED_WEBHOOK", order.user_id, "order", str(order.id), {"payment_id": payment_id})

        elif event == 'payment.failed':
            payment_entity = payload.get('payload', {}).get('payment', {}).get('entity', {})
            rz_order_id = payment_entity.get('order_id', '')
            error_description = payment_entity.get('error_description', 'Unknown payment failure reason')

            result = await db.execute(select(OrderModel).where(OrderModel.razorpay_order_id == rz_order_id))
            order = result.scalar_one_or_none()
            if order:
                order.payment_status = "failed"
                order.order_status = "failed"
                order.updated_at = now

                # Release stock if stock was somehow applied
                if order.stock_applied:
                    for item in (order.items or []):
                        pid = item.get("product_id")
                        qty = int(item.get("quantity", 0))
                        if pid and is_valid_uuid(pid) and qty > 0:
                            prod_res = await db.execute(select(ProductModel).where(ProductModel.id == pid).with_for_update())
                            product = prod_res.scalar_one_or_none()
                            if product:
                                product.stock_quantity = int(product.stock_quantity or 0) + qty
                                product.units_sold = max(0, int(product.units_sold or 0) - qty)
                                product.in_stock = True
                                product.updated_at = now
                    order.stock_applied = False

                logger.info(f"Payment failed for Order {order.order_number} via Webhook. Error: {error_description}")
                await write_audit_log(db, "ORDER_PAYMENT_FAILED_WEBHOOK", order.user_id, "order", str(order.id), {"error": error_description})

        elif event == 'refund.processed':
            refund_entity = payload.get('payload', {}).get('refund', {}).get('entity', {})
            payment_id = refund_entity.get('payment_id', '')
            refund_id = refund_entity.get('id', '')
            status = refund_entity.get('status', '')

            result = await db.execute(select(OrderModel).where(OrderModel.razorpay_payment_id == payment_id))
            order = result.scalar_one_or_none()
            if order:
                order.payment_status = "refunded"
                order.order_status = "refunded"
                order.updated_at = now

                # Release stock if not already released
                if order.stock_applied:
                    for item in (order.items or []):
                        pid = item.get("product_id")
                        qty = int(item.get("quantity", 0))
                        if pid and is_valid_uuid(pid) and qty > 0:
                            prod_res = await db.execute(select(ProductModel).where(ProductModel.id == pid).with_for_update())
                            product = prod_res.scalar_one_or_none()
                            if product:
                                product.stock_quantity = int(product.stock_quantity or 0) + qty
                                product.units_sold = max(0, int(product.units_sold or 0) - qty)
                                product.in_stock = True
                                product.updated_at = now
                    order.stock_applied = False

                logger.info(f"Refund processed for Order {order.order_number} via Webhook. Refund ID: {refund_id}")
                await write_audit_log(db, "ORDER_REFUND_PROCESSED_WEBHOOK", order.user_id, "order", str(order.id), {"refund_id": refund_id, "status": status})

        elif event == 'refund.failed':
            refund_entity = payload.get('payload', {}).get('refund', {}).get('entity', {})
            payment_id = refund_entity.get('payment_id', '')
            refund_id = refund_entity.get('id', '')

            result = await db.execute(select(OrderModel).where(OrderModel.razorpay_payment_id == payment_id))
            order = result.scalar_one_or_none()
            if order:
                logger.error(f"Refund FAILED for Order {order.order_number} via Webhook. Refund ID: {refund_id}")
                await write_audit_log(db, "ORDER_REFUND_FAILED_WEBHOOK", order.user_id, "order", str(order.id), {"refund_id": refund_id})

        return {"status": "ok"}
    except Exception as exc:
        logger.error("Webhook processing error: %s", exc)
        raise HTTPException(status_code=500, detail="Processing error")
