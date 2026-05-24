"""Coupon Router for admin management and checkout validation."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, delete
from database import get_db
from models import CouponModel, SettingModel, OrderModel
from deps import UserSchema, get_current_user, require_permission, row_to_dict, write_audit_log
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/api")

# ── Pydantic Request Schemas ─────────────────────────────────────────────
class CouponCreateUpdate(BaseModel):
    code: str
    discount_type: str  # percentage, flat, free_shipping
    discount_value: float
    expiry_date: Optional[datetime] = None
    min_cart_value: float = 0.0
    max_discount_limit: Optional[float] = None
    max_usage_count: Optional[int] = None
    per_customer_usage_limit: Optional[int] = None
    is_active: bool = True

class CouponSettingsUpdate(BaseModel):
    system_enabled: bool
    stacking_enabled: bool
    single_use_per_account: bool

class CouponValidationRequest(BaseModel):
    codes: List[str]
    cart_subtotal: float

# ── Shared Validation Logic ──────────────────────────────────────────────
async def validate_coupons_logic(db: AsyncSession, user_id: str, codes: List[str], subtotal: float):
    user_uuid = None
    if user_id:
        try:
            user_uuid = uuid.UUID(str(user_id))
        except (ValueError, TypeError):
            user_uuid = None

    # 1. Load global settings
    settings_res = await db.execute(select(SettingModel).where(SettingModel.key == "coupon_settings"))
    settings_obj = settings_res.scalar_one_or_none()
    coupon_settings = {
        "system_enabled": True,
        "stacking_enabled": False,
        "single_use_per_account": False
    }
    if settings_obj and isinstance(settings_obj.value, dict):
        coupon_settings.update(settings_obj.value)

    if not coupon_settings["system_enabled"]:
        return {
            "valid": False,
            "discount_amount": 0.0,
            "free_shipping": False,
            "error": "Coupon system is currently disabled",
            "applied_coupons": [],
            "errors": {c: "Coupon system is currently disabled" for c in codes}
        }

    if not codes:
        return {"valid": True, "discount_amount": 0.0, "free_shipping": False, "error": None, "applied_coupons": [], "errors": {}}

    # Normalize codes to strip whitespace and convert to uppercase
    normalized_input_codes = [c.strip().upper() for c in codes if c.strip()]
    if not normalized_input_codes:
        return {"valid": True, "discount_amount": 0.0, "free_shipping": False, "error": None, "applied_coupons": [], "errors": {}}

    # If stacking is disabled but multiple codes are sent, reject extra codes
    if not coupon_settings["stacking_enabled"] and len(normalized_input_codes) > 1:
        # Keep only the first code
        normalized_input_codes = [normalized_input_codes[0]]

    # If single_use_per_account is True, check if user has ever used any coupon code before
    if coupon_settings["single_use_per_account"] and user_uuid:
        orders_res = await db.execute(
            select(OrderModel).where(
                and_(
                    OrderModel.user_id == user_uuid,
                    OrderModel.order_status != "cancelled"
                )
            )
        )
        has_used_coupon = False
        for order in orders_res.scalars().all():
            if order.coupon_codes and len(order.coupon_codes) > 0:
                has_used_coupon = True
                break
        if has_used_coupon:
            return {
                "valid": False,
                "discount_amount": 0.0,
                "free_shipping": False,
                "error": "Only one coupon can be used per customer account across all purchases.",
                "applied_coupons": [],
                "errors": {c: "Only one coupon can be used per customer account" for c in codes}
            }

    applied_coupons = []
    errors = {}
    now = datetime.now(timezone.utc)

    # Fetch all requested coupon codes from the DB
    coupons_res = await db.execute(select(CouponModel).where(CouponModel.code.in_(normalized_input_codes)))
    coupons_by_code = {c.code.upper(): c for c in coupons_res.scalars().all()}

    for raw_code in codes:
        code_upper = raw_code.strip().upper()
        if code_upper not in normalized_input_codes:
            # Code was ignored due to stacking settings
            errors[raw_code] = "Only one coupon can be used per order. Remove the applied coupon before using another code."
            continue

        if code_upper not in coupons_by_code:
            errors[raw_code] = "Coupon code not found"
            continue

        coupon = coupons_by_code[code_upper]

        # 1. Active status check
        if not coupon.is_active:
            errors[raw_code] = "Coupon is inactive"
            continue

        # 2. Expiry check
        if coupon.expiry_date:
            expiry = coupon.expiry_date
            if expiry.tzinfo is None:
                expiry = expiry.replace(tzinfo=timezone.utc)
            if now > expiry:
                errors[raw_code] = "Coupon has expired"
                continue

        # 3. Minimum cart value check
        if subtotal < float(coupon.min_cart_value or 0):
            errors[raw_code] = f"Minimum cart value of ₹{coupon.min_cart_value} required"
            continue

        # 4. Maximum usage limit (total)
        if coupon.max_usage_count is not None and coupon.total_uses >= coupon.max_usage_count:
            errors[raw_code] = "Coupon usage limit reached"
            continue

        # 5. Per-customer usage limit
        if coupon.per_customer_usage_limit is not None and user_uuid:
            user_orders_res = await db.execute(
                select(OrderModel).where(
                    and_(
                        OrderModel.user_id == user_uuid,
                        OrderModel.order_status != "cancelled"
                    )
                )
            )
            usage_count = 0
            for order in user_orders_res.scalars().all():
                applied_list = order.coupon_codes or []
                if any(c.strip().upper() == code_upper for c in applied_list):
                    usage_count += 1
            
            if usage_count >= coupon.per_customer_usage_limit:
                errors[raw_code] = f"You have used this coupon {usage_count}/{coupon.per_customer_usage_limit} times"
                continue

        # If we passed all checks, apply this coupon!
        applied_coupons.append(coupon)

    # Now calculate discounts for applied coupons
    total_discount = 0.0
    free_shipping = False

    for coupon in applied_coupons:
        if coupon.discount_type == "percentage":
            disc = float(subtotal) * (float(coupon.discount_value) / 100.0)
            if coupon.max_discount_limit is not None:
                disc = min(disc, float(coupon.max_discount_limit))
            total_discount += disc
        elif coupon.discount_type == "flat":
            total_discount += float(coupon.discount_value)
        elif coupon.discount_type == "free_shipping":
            free_shipping = True

    # Limit discount to subtotal
    total_discount = min(total_discount, float(subtotal))

    return {
        "valid": len(applied_coupons) > 0 or not codes,
        "discount_amount": round(total_discount, 2),
        "free_shipping": free_shipping,
        "applied_coupons": [
            {
                "id": str(c.id),
                "code": c.code,
                "discount_type": c.discount_type,
                "discount_value": float(c.discount_value),
                "min_cart_value": float(c.min_cart_value or 0),
                "max_discount_limit": float(c.max_discount_limit) if c.max_discount_limit else None,
            }
            for c in applied_coupons
        ],
        "errors": errors
    }


# ── Customer Validation Route ───────────────────────────────────────────
@router.post("/coupons/validate")
async def validate_coupons(data: CouponValidationRequest, current_user: UserSchema = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        result = await validate_coupons_logic(db, str(current_user.id), data.codes, data.cart_subtotal)
        return result
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Unable to validate coupon right now: {exc}")


# ── Admin Global Settings Routes ──────────────────────────────────────────
@router.get("/admin/coupons/settings")
async def get_coupon_settings(admin: UserSchema = Depends(require_permission("manage_settings")), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SettingModel).where(SettingModel.key == "coupon_settings"))
    s = res.scalar_one_or_none()
    default_settings = {
        "system_enabled": True,
        "stacking_enabled": False,
        "single_use_per_account": False
    }
    if s and isinstance(s.value, dict):
        default_settings.update(s.value)
    return default_settings

@router.post("/admin/coupons/settings")
async def save_coupon_settings(data: CouponSettingsUpdate, admin: UserSchema = Depends(require_permission("manage_settings")), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SettingModel).where(SettingModel.key == "coupon_settings"))
    s = res.scalar_one_or_none()
    val = data.model_dump()
    if s:
        s.value = val
    else:
        db.add(SettingModel(key="coupon_settings", value=val))
    await db.flush()
    await write_audit_log(db, "COUPON_SETTINGS_UPDATED", admin.id, "setting", "coupon_settings")
    return {"message": "Coupon settings updated successfully"}


# ── Admin CRUD Coupon Routes ──────────────────────────────────────────────
@router.get("/admin/coupons")
async def list_coupons(admin: UserSchema = Depends(require_permission("manage_settings")), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(CouponModel).order_by(CouponModel.created_at.desc()))
    return [row_to_dict(c) for c in res.scalars().all()]

@router.get("/admin/coupons/{coupon_id}")
async def get_coupon(coupon_id: str, admin: UserSchema = Depends(require_permission("manage_settings")), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(CouponModel).where(CouponModel.id == coupon_id))
    c = res.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Coupon not found")
    return row_to_dict(c)

@router.post("/admin/coupons")
async def create_coupon(data: CouponCreateUpdate, admin: UserSchema = Depends(require_permission("manage_settings")), db: AsyncSession = Depends(get_db)):
    # Check duplicate code
    existing_res = await db.execute(select(CouponModel).where(CouponModel.code == data.code.strip().upper()))
    if existing_res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Coupon code '{data.code.upper()}' already exists.")

    c = CouponModel(
        code=data.code.strip().upper(),
        discount_type=data.discount_type,
        discount_value=data.discount_value,
        expiry_date=data.expiry_date,
        min_cart_value=data.min_cart_value,
        max_discount_limit=data.max_discount_limit,
        max_usage_count=data.max_usage_count,
        per_customer_usage_limit=data.per_customer_usage_limit,
        is_active=data.is_active,
        total_uses=0,
        total_discount_given=0.0,
        revenue_generated=0.0
    )
    db.add(c)
    await db.flush()
    await write_audit_log(db, "COUPON_CREATED", admin.id, "coupon", str(c.id))
    return row_to_dict(c)

@router.put("/admin/coupons/{coupon_id}")
async def update_coupon(coupon_id: str, data: CouponCreateUpdate, admin: UserSchema = Depends(require_permission("manage_settings")), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(CouponModel).where(CouponModel.id == coupon_id))
    c = res.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Coupon not found")

    # Check duplicate code if changed
    new_code = data.code.strip().upper()
    if c.code.upper() != new_code:
        existing_res = await db.execute(select(CouponModel).where(CouponModel.code == new_code))
        if existing_res.scalar_one_or_none():
            raise HTTPException(status_code=400, detail=f"Coupon code '{new_code}' already exists.")

    c.code = new_code
    c.discount_type = data.discount_type
    c.discount_value = data.discount_value
    c.expiry_date = data.expiry_date
    c.min_cart_value = data.min_cart_value
    c.max_discount_limit = data.max_discount_limit
    c.max_usage_count = data.max_usage_count
    c.per_customer_usage_limit = data.per_customer_usage_limit
    c.is_active = data.is_active

    await db.flush()
    await write_audit_log(db, "COUPON_UPDATED", admin.id, "coupon", str(c.id))
    return row_to_dict(c)

@router.delete("/admin/coupons/{coupon_id}")
async def delete_coupon(coupon_id: str, admin: UserSchema = Depends(require_permission("manage_settings")), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(CouponModel).where(CouponModel.id == coupon_id))
    c = res.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Coupon not found")

    await db.execute(delete(CouponModel).where(CouponModel.id == coupon_id))
    await db.flush()
    await write_audit_log(db, "COUPON_DELETED", admin.id, "coupon", coupon_id)
    return {"message": "Coupon deleted successfully"}
