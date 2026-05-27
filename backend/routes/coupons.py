"""Coupon Router for admin management and checkout validation."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, delete, func, or_, false
from database import get_db
from models import CouponModel, SettingModel, OrderModel, UserModel
from coupon_maintenance import cleanup_expired_coupons, coupon_is_expired, expiry_is_past
from deps import UserSchema, get_current_user, require_permission, row_to_dict, write_audit_log, create_notification, send_email
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import asyncio

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
    coupon_type: str = "standard"
    apply_to_all_loyal_customers: bool = False
    apply_to_all_products: bool = False
    eligible_customer_ids: List[str] = []
    eligible_product_ids: List[str] = []
    eligible_category_ids: List[str] = []
    is_reusable: bool = True

class CouponSettingsUpdate(BaseModel):
    system_enabled: bool
    stacking_enabled: bool
    single_use_per_account: bool

class CouponValidationRequest(BaseModel):
    codes: List[str]
    cart_subtotal: float

LOYALTY_DEFAULTS = {
    "enabled": True,
    "minimum_orders": 10,
    "minimum_spend": 15000.0,
    "criteria_mode": "either"
}


def liable_order_filter():
    return and_(
        func.lower(OrderModel.order_status) == "delivered",
        ~func.lower(func.coalesce(OrderModel.payment_status, "")).in_(["refunded", "refund", "failed"]),
    )


async def get_loyalty_settings(db: AsyncSession) -> dict:
    res = await db.execute(select(SettingModel).where(SettingModel.key == "loyalty_settings"))
    setting = res.scalar_one_or_none()
    settings = dict(LOYALTY_DEFAULTS)
    if setting and isinstance(setting.value, dict):
        settings.update(setting.value)
    settings["enabled"] = settings.get("enabled", True) is not False
    settings["minimum_orders"] = int(settings.get("minimum_orders") if settings.get("minimum_orders") is not None else LOYALTY_DEFAULTS["minimum_orders"])
    settings["minimum_spend"] = float(settings.get("minimum_spend") if settings.get("minimum_spend") is not None else LOYALTY_DEFAULTS["minimum_spend"])
    if settings.get("criteria_mode") not in {"either", "both", "orders_only", "spend_only"}:
        settings["criteria_mode"] = "either"
    return settings


def is_loyal_by_settings(orders_count: int, total_spent: float, settings: dict) -> bool:
    if settings.get("enabled", True) is False:
        return False
    mode = settings.get("criteria_mode", "either")
    orders_ok = orders_count >= settings["minimum_orders"]
    spend_ok = total_spent >= settings["minimum_spend"]
    if mode == "orders_only":
        return orders_ok
    if mode == "spend_only":
        return spend_ok
    if mode == "both":
        return orders_ok and spend_ok
    return orders_ok or spend_ok


def loyalty_having_clause(orders_expr, spend_expr, settings: dict):
    if settings.get("enabled", True) is False:
        return false()
    orders_ok = orders_expr >= settings["minimum_orders"]
    spend_ok = spend_expr >= settings["minimum_spend"]
    mode = settings.get("criteria_mode", "either")
    if mode == "orders_only":
        return orders_ok
    if mode == "spend_only":
        return spend_ok
    if mode == "both":
        return and_(orders_ok, spend_ok)
    return orders_ok | spend_ok


async def get_customer_loyalty_stats(db: AsyncSession, user_id) -> dict:
    settings = await get_loyalty_settings(db)
    user_uuid = uuid.UUID(str(user_id))
    stats_res = await db.execute(
        select(
            func.count(OrderModel.id).label("orders_count"),
            func.coalesce(func.sum(OrderModel.total_amount), 0).label("total_spent"),
        ).where(
            OrderModel.user_id == user_uuid,
            liable_order_filter(),
        )
    )
    stats = stats_res.first()
    orders_count = int(stats.orders_count or 0) if stats else 0
    total_spent = float(stats.total_spent or 0) if stats else 0.0
    return {
        "orders_count": orders_count,
        "total_spent": round(total_spent, 2),
        "is_loyal": is_loyal_by_settings(orders_count, total_spent, settings),
        "criteria": settings,
    }


def coupon_is_loyalty(coupon: CouponModel) -> bool:
    return (coupon.coupon_type or "standard") == "loyalty"


def customer_allowed_for_loyalty_coupon(coupon: CouponModel, user_id: str) -> bool:
    if coupon.apply_to_all_loyal_customers:
        return True
    eligible_ids = [str(cid) for cid in (coupon.eligible_customer_ids or [])]
    return str(user_id) in eligible_ids


async def notify_loyalty_coupon_recipients(db: AsyncSession, coupon: CouponModel):
    if not coupon_is_loyalty(coupon) or not coupon.is_active:
        return

    recipients = []
    if coupon.apply_to_all_loyal_customers:
        stats = await list_loyal_customer_rows(db)
        recipients = [{"id": row["id"], "email": row["email"], "name": row["name"]} for row in stats]
    elif coupon.eligible_customer_ids:
        ids = []
        for raw_id in coupon.eligible_customer_ids:
            try:
                ids.append(uuid.UUID(str(raw_id)))
            except (ValueError, TypeError):
                continue
        if ids:
            users_res = await db.execute(select(UserModel).where(UserModel.id.in_(ids)))
            recipients = [{"id": str(u.id), "email": u.email, "name": u.full_name or u.email} for u in users_res.scalars().all()]

    for recipient in recipients[:200]:
        await create_notification(
            db,
            recipient["id"],
            "Loyal customer coupon unlocked",
            f"Your loyalty coupon {coupon.code} is available at checkout.",
            "coupon"
        )
        asyncio.create_task(send_email(
            recipient["email"],
            f"Your loyalty coupon {coupon.code} is ready",
            f"Hi {recipient['name']},<br/><br/>Your loyalty coupon <strong>{coupon.code}</strong> is available for your next Durga Shakti Foils order."
        ))


async def list_loyal_customer_rows(db: AsyncSession, search: str = "", limit: int | None = None) -> list[dict]:
    settings = await get_loyalty_settings(db)
    if settings.get("enabled", True) is False:
        return []
    eligible_order = liable_order_filter()
    orders_expr = func.count(OrderModel.id).filter(eligible_order)
    spend_expr = func.coalesce(func.sum(OrderModel.total_amount).filter(eligible_order), 0)
    q = (
        select(
            UserModel.id,
            UserModel.full_name,
            UserModel.email,
            UserModel.phone,
            orders_expr.label("orders_count"),
            spend_expr.label("total_spent"),
        )
        .join(OrderModel, OrderModel.user_id == UserModel.id, isouter=True)
        .where(UserModel.role == "customer")
        .group_by(UserModel.id)
        .having(loyalty_having_clause(orders_expr, spend_expr, settings))
        .order_by(spend_expr.desc())
    )
    if search:
        like_term = f"%{search.strip()}%"
        q = q.where((UserModel.full_name.ilike(like_term)) | (UserModel.email.ilike(like_term)) | (UserModel.phone.ilike(like_term)))
    if limit:
        q = q.limit(limit)
    stats_res = await db.execute(q)

    customers = []
    for row in stats_res.all():
        customers.append({
            "id": str(row.id),
            "name": row.full_name or row.email,
            "email": row.email,
            "phone": row.phone,
            "orders_count": int(row.orders_count or 0),
            "total_spent": round(float(row.total_spent or 0), 2),
        })
    return customers

# ── Shared Validation Logic ──────────────────────────────────────────────
async def validate_coupons_logic(db: AsyncSession, user_id: str, codes: List[str], subtotal: float):
    await cleanup_expired_coupons(db)
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

    # Pre-load user orders once to avoid N+1 query issue inside the loop and duplicate queries
    user_orders = []
    if user_uuid:
        orders_res = await db.execute(
            select(OrderModel).where(
                and_(
                    OrderModel.user_id == user_uuid,
                    OrderModel.order_status != "cancelled",
                )
            )
        )
        user_orders = orders_res.scalars().all()

    # If single_use_per_account is True, check if user has ever used any coupon code before
    if coupon_settings["single_use_per_account"] and user_uuid:
        has_used_coupon = False
        for order in user_orders:
            if order.coupon_codes and len(order.coupon_codes) > 0:
                has_used_coupon = True
                break
        if has_used_coupon:
            return {
                "valid": False,
                "discount_amount": 0.0,
                "free_shipping": False,
                "error": "You have already redeemed a coupon on a past order. Only one coupon can be used per customer account.",
                "applied_coupons": [],
                "errors": {c: "You have already used a coupon on your account" for c in codes}
            }

    applied_coupons = []
    errors = {}
    now = datetime.now(timezone.utc)
    loyalty_stats = None
    if user_uuid:
        loyalty_stats = await get_customer_loyalty_stats(db, user_uuid)

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
        if coupon_is_expired(coupon, now):
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

        # 5. Loyal-customer-only eligibility
        if coupon_is_loyalty(coupon):
            if not user_uuid:
                errors[raw_code] = "Please login to use this loyal customer coupon"
                continue
            if not loyalty_stats or not loyalty_stats["is_loyal"]:
                errors[raw_code] = "This coupon is reserved for loyal customers"
                continue
            if not customer_allowed_for_loyalty_coupon(coupon, str(user_uuid)):
                errors[raw_code] = "This loyal customer coupon is not assigned to your account"
                continue

        # 6. Reusable / per-customer usage limit
        if user_uuid:
            usage_count = 0
            for order in user_orders:
                applied_list = order.coupon_codes or []
                if any(c.strip().upper() == code_upper for c in applied_list):
                    usage_count += 1

            effective_customer_limit = coupon.per_customer_usage_limit
            if coupon.is_reusable is False:
                effective_customer_limit = 1

            if effective_customer_limit is not None and usage_count >= effective_customer_limit:
                errors[raw_code] = "You have already redeemed this coupon code on a past order."
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
                "coupon_type": c.coupon_type or "standard",
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
@router.get("/coupons/eligible")
async def get_eligible_coupons(current_user: UserSchema = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await cleanup_expired_coupons(db)
    loyalty_stats = await get_customer_loyalty_stats(db, current_user.id)
    if not loyalty_stats["is_loyal"]:
        return {"is_loyal": False, "criteria": loyalty_stats["criteria"], "stats": loyalty_stats, "coupons": []}

    now = datetime.now(timezone.utc)
    coupons_res = await db.execute(
        select(CouponModel).where(
            CouponModel.is_active == True,
            CouponModel.coupon_type == "loyalty",
        ).order_by(CouponModel.created_at.desc())
    )

    eligible = []
    for coupon in coupons_res.scalars().all():
        if coupon_is_expired(coupon, now):
            continue
        if coupon.max_usage_count is not None and coupon.total_uses >= coupon.max_usage_count:
            continue
        if not customer_allowed_for_loyalty_coupon(coupon, str(current_user.id)):
            continue
        eligible.append({
            "id": str(coupon.id),
            "code": coupon.code,
            "discount_type": coupon.discount_type,
            "discount_value": float(coupon.discount_value),
            "min_cart_value": float(coupon.min_cart_value or 0),
            "max_discount_limit": float(coupon.max_discount_limit) if coupon.max_discount_limit else None,
            "expiry_date": coupon.expiry_date.isoformat() if coupon.expiry_date else None,
            "coupon_type": coupon.coupon_type or "loyalty",
        })

    return {"is_loyal": True, "criteria": loyalty_stats["criteria"], "stats": loyalty_stats, "coupons": eligible}


@router.get("/admin/coupons/settings")
async def get_coupon_settings(admin: UserSchema = Depends(require_permission("manage_coupons")), db: AsyncSession = Depends(get_db)):
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
async def save_coupon_settings(data: CouponSettingsUpdate, admin: UserSchema = Depends(require_permission("manage_coupons")), db: AsyncSession = Depends(get_db)):
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
@router.get("/admin/coupons/loyal-customers")
async def list_loyal_customers(
    search: str = Query("", max_length=80),
    limit: int = Query(25, ge=1, le=100),
    admin: UserSchema = Depends(require_permission("manage_coupons")),
    db: AsyncSession = Depends(get_db)
):
    settings = await get_loyalty_settings(db)
    customers = await list_loyal_customer_rows(db, search=search, limit=limit)
    return {"items": customers, "criteria": settings, "total": len(customers)}


@router.get("/admin/coupons/analytics")
async def get_coupon_analytics(admin: UserSchema = Depends(require_permission("manage_coupons")), db: AsyncSession = Depends(get_db)):
    await cleanup_expired_coupons(db)
    settings = await get_loyalty_settings(db)
    coupon_res = await db.execute(select(CouponModel))
    coupons = coupon_res.scalars().all()
    loyal_coupons = [c for c in coupons if coupon_is_loyalty(c)]
    eligible_order = liable_order_filter()

    customers_res = await db.execute(
        select(
            UserModel.id,
            UserModel.full_name,
            UserModel.email,
            func.count(OrderModel.id).filter(eligible_order).label("orders_count"),
            func.coalesce(func.sum(OrderModel.total_amount).filter(eligible_order), 0).label("total_spent"),
        )
        .join(OrderModel, OrderModel.user_id == UserModel.id, isouter=True)
        .where(UserModel.role == "customer")
        .group_by(UserModel.id)
        .order_by(func.coalesce(func.sum(OrderModel.total_amount).filter(eligible_order), 0).desc())
    )
    top_loyal = []
    active_loyal_count = 0
    for row in customers_res.all():
        orders_count = int(row.orders_count or 0)
        total_spent = float(row.total_spent or 0)
        if is_loyal_by_settings(orders_count, total_spent, settings):
            active_loyal_count += 1
            if len(top_loyal) < 5:
                top_loyal.append({
                    "id": str(row.id),
                    "name": row.full_name or row.email,
                    "email": row.email,
                    "orders_count": orders_count,
                    "total_spent": round(total_spent, 2),
                })

    return {
        "total_coupon_usage": sum(int(c.total_uses or 0) for c in coupons),
        "total_discount_given": round(sum(float(c.total_discount_given or 0) for c in coupons), 2),
        "revenue_generated": round(sum(float(c.revenue_generated or 0) for c in loyal_coupons), 2),
        "active_loyal_customer_count": active_loyal_count,
        "top_loyal_customers": top_loyal,
        "loyalty_coupon_count": len(loyal_coupons),
    }


@router.get("/admin/coupons")
async def list_coupons(
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    coupon_type: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    admin: UserSchema = Depends(require_permission("manage_coupons")),
    db: AsyncSession = Depends(get_db)
):
    await cleanup_expired_coupons(db)
    q = select(CouponModel).order_by(CouponModel.created_at.desc())
    if search:
        term = f"%{search.strip()}%"
        q = q.where(or_(CouponModel.code.ilike(term), CouponModel.discount_type.ilike(term), CouponModel.coupon_type.ilike(term)))
    if is_active is not None:
        q = q.where(CouponModel.is_active == bool(is_active))
    if coupon_type:
        q = q.where(func.lower(CouponModel.coupon_type) == coupon_type.lower())
    if start_date:
        try:
            sd = start_date.rstrip('Z')
            sd_dt = datetime.fromisoformat(sd)
            if sd_dt.tzinfo is None:
                sd_dt = sd_dt.replace(tzinfo=timezone.utc)
            q = q.where(CouponModel.created_at >= sd_dt)
        except Exception:
            pass
    if end_date:
        try:
            ed = end_date.rstrip('Z')
            ed_dt = datetime.fromisoformat(ed)
            if ed_dt.tzinfo is None:
                ed_dt = ed_dt.replace(tzinfo=timezone.utc)
            q = q.where(CouponModel.created_at <= ed_dt)
        except Exception:
            pass
    res = await db.execute(q)
    return [row_to_dict(c) for c in res.scalars().all()]

@router.get("/admin/coupons/{coupon_id}")
async def get_coupon(coupon_id: str, admin: UserSchema = Depends(require_permission("manage_coupons")), db: AsyncSession = Depends(get_db)):
    await cleanup_expired_coupons(db)
    res = await db.execute(select(CouponModel).where(CouponModel.id == coupon_id))
    c = res.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Coupon not found")
    return row_to_dict(c)

@router.post("/admin/coupons")
async def create_coupon(data: CouponCreateUpdate, admin: UserSchema = Depends(require_permission("manage_coupons")), db: AsyncSession = Depends(get_db)):
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
        is_active=(data.is_active and not expiry_is_past(data.expiry_date)),
        coupon_type=data.coupon_type,
        apply_to_all_loyal_customers=data.apply_to_all_loyal_customers,
        apply_to_all_products=data.apply_to_all_products,
        eligible_customer_ids=[str(cid) for cid in (data.eligible_customer_ids or [])],
        eligible_product_ids=[str(pid) for pid in (data.eligible_product_ids or [])],
        eligible_category_ids=[str(cid) for cid in (data.eligible_category_ids or [])],
        is_reusable=data.is_reusable,
        total_uses=0,
        total_discount_given=0.0,
        revenue_generated=0.0
    )
    db.add(c)
    await db.flush()
    await notify_loyalty_coupon_recipients(db, c)
    await write_audit_log(db, "COUPON_CREATED", admin.id, "coupon", str(c.id))
    return row_to_dict(c)

@router.put("/admin/coupons/{coupon_id}")
async def update_coupon(coupon_id: str, data: CouponCreateUpdate, admin: UserSchema = Depends(require_permission("manage_coupons")), db: AsyncSession = Depends(get_db)):
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
    c.is_active = data.is_active and not expiry_is_past(data.expiry_date)
    c.coupon_type = data.coupon_type
    c.apply_to_all_loyal_customers = data.apply_to_all_loyal_customers
    c.apply_to_all_products = data.apply_to_all_products
    c.eligible_customer_ids = [str(cid) for cid in (data.eligible_customer_ids or [])]
    c.eligible_product_ids = [str(pid) for pid in (data.eligible_product_ids or [])]
    c.eligible_category_ids = [str(cid) for cid in (data.eligible_category_ids or [])]
    c.is_reusable = data.is_reusable

    c.coupon_type = data.coupon_type
    c.apply_to_all_loyal_customers = data.apply_to_all_loyal_customers
    c.apply_to_all_products = data.apply_to_all_products
    c.eligible_customer_ids = [str(cid) for cid in (data.eligible_customer_ids or [])]
    c.eligible_product_ids = [str(pid) for pid in (data.eligible_product_ids or [])]
    c.eligible_category_ids = [str(cid) for cid in (data.eligible_category_ids or [])]
    c.is_reusable = data.is_reusable

    await db.flush()
    await notify_loyalty_coupon_recipients(db, c)
    await write_audit_log(db, "COUPON_UPDATED", admin.id, "coupon", str(c.id))
    return row_to_dict(c)

@router.delete("/admin/coupons/{coupon_id}")
async def delete_coupon(coupon_id: str, admin: UserSchema = Depends(require_permission("manage_coupons")), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(CouponModel).where(CouponModel.id == coupon_id))
    c = res.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Coupon not found")

    await db.execute(delete(CouponModel).where(CouponModel.id == coupon_id))
    await db.flush()
    await write_audit_log(db, "COUPON_DELETED", admin.id, "coupon", coupon_id)
    return {"message": "Coupon deleted successfully"}


@router.get("/admin/coupons/{coupon_id}/export")
async def export_coupon_details(
    coupon_id: str,
    admin: UserSchema = Depends(require_permission("manage_coupons")),
    db: AsyncSession = Depends(get_db)
):
    try:
        coupon_uuid = uuid.UUID(coupon_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid coupon ID format")

    res = await db.execute(select(CouponModel).where(CouponModel.id == coupon_uuid))
    coupon = res.scalar_one_or_none()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")

    # Fetch audit logs for this coupon
    from models import AuditLogModel
    logs_res = await db.execute(
        select(AuditLogModel)
        .where(
            AuditLogModel.target_type == "coupon",
            AuditLogModel.target_id == str(coupon.id)
        )
        .order_by(AuditLogModel.created_at.asc())
    )
    logs = logs_res.scalars().all()

    # Get admin user details for actors in audit logs
    actor_ids = [log.actor_id for log in logs if log.actor_id]
    valid_uuids = []
    for aid in actor_ids:
        try:
            valid_uuids.append(uuid.UUID(aid))
        except (ValueError, TypeError):
            continue
    admins_by_id = {}
    if valid_uuids:
        admins_res = await db.execute(select(UserModel).where(UserModel.id.in_(valid_uuids)))
        admins_by_id = {str(a.id): a for a in admins_res.scalars().all()}

    # Resolve created by and last updated by
    created_by_admin = None
    updated_by_admin = None

    created_log = next((log for log in logs if log.action == "COUPON_CREATED"), None)
    update_logs = [log for log in logs if log.action == "COUPON_UPDATED"]

    if created_log and created_log.actor_id in admins_by_id:
        created_by_admin = admins_by_id[created_log.actor_id]

    if update_logs:
        last_update_log = update_logs[-1]
        if last_update_log.actor_id in admins_by_id:
            updated_by_admin = admins_by_id[last_update_log.actor_id]

    # Fetch orders that used this coupon
    orders_res = await db.execute(
        select(OrderModel)
        .where(OrderModel.coupon_codes.contains([coupon.code]))
        .order_by(OrderModel.created_at.desc())
    )
    orders = orders_res.scalars().all()

    # Format data for Excel
    import pandas as pd
    import io
    from fastapi.responses import StreamingResponse

    # 1. Summary Sheet
    created_by_str = f"{created_by_admin.full_name} ({created_by_admin.email})" if created_by_admin else "System / Unknown"
    last_updated_by_str = f"{updated_by_admin.full_name} ({updated_by_admin.email})" if updated_by_admin else "Never"
    
    left_uses = "Unlimited"
    if coupon.max_usage_count is not None:
        left_uses = max(0, coupon.max_usage_count - coupon.total_uses)

    summary_data = {
        "Property": [
            "Coupon Code", "Coupon Type", "Discount Type", "Discount Value",
            "Minimum Order Value", "Max Discount Limit", "Max Usage Count",
            "Total Uses", "Used / Left", "Revenue Generated", "Total Discount Given",
            "Active Status", "Created By", "Created Date", "Expiry Date",
            "Last Updated Date", "Last Updated By"
        ],
        "Value": [
            coupon.code,
            coupon.coupon_type or "standard",
            coupon.discount_type,
            float(coupon.discount_value),
            float(coupon.min_cart_value or 0),
            float(coupon.max_discount_limit) if coupon.max_discount_limit else "None",
            coupon.max_usage_count if coupon.max_usage_count is not None else "Unlimited",
            coupon.total_uses,
            f"{coupon.total_uses} / {left_uses}",
            float(coupon.revenue_generated or 0),
            float(coupon.total_discount_given or 0),
            "Yes" if coupon.is_active else "No",
            created_by_str,
            coupon.created_at.strftime('%Y-%m-%d %H:%M:%S') if coupon.created_at else "Unknown",
            coupon.expiry_date.strftime('%Y-%m-%d %H:%M:%S') if coupon.expiry_date else "Never",
            coupon.updated_at.strftime('%Y-%m-%d %H:%M:%S') if coupon.updated_at else "Never",
            last_updated_by_str
        ]
    }
    df_summary = pd.DataFrame(summary_data)

    # 2. Usage History Sheet
    usage_rows = []
    for order in orders:
        usage_rows.append({
            "Order Number": order.order_number,
            "Customer Name": order.customer_name or "Guest",
            "Customer Email": order.shipping_address.get("email") if isinstance(order.shipping_address, dict) else "",
            "Order Total": float(order.total_amount),
            "Discount Received": float(order.discount_amount),
            "Date Used": order.created_at.strftime('%Y-%m-%d %H:%M:%S') if order.created_at else ""
        })
    df_usage = pd.DataFrame(usage_rows if usage_rows else [
        {"Order Number": "No usages found", "Customer Name": "", "Customer Email": "", "Order Total": 0.0, "Discount Received": 0.0, "Date Used": ""}
    ])

    # 3. Edit History Sheet
    edit_rows = []
    for log in logs:
        log_actor = admins_by_id.get(log.actor_id)
        actor_name = f"{log_actor.full_name} ({log_actor.email})" if log_actor else f"Admin ID: {log.actor_id}"
        edit_rows.append({
            "Date & Time Updated": log.created_at.strftime('%Y-%m-%d %H:%M:%S') if log.created_at else "",
            "Updated By": actor_name,
            "Action": log.action,
            "Details / Metadata": str(log.metadata_)
        })
    df_updates = pd.DataFrame(edit_rows if edit_rows else [
        {"Date & Time Updated": "No edits logged", "Updated By": "", "Action": "", "Details / Metadata": ""}
    ])

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df_summary.to_excel(writer, sheet_name='Summary', index=False)
        df_usage.to_excel(writer, sheet_name='Usage History', index=False)
        df_updates.to_excel(writer, sheet_name='Edit History', index=False)

    output.seek(0)
    filename = f"coupon_{coupon.code}_report.xlsx"
    headers = {
        'Content-Disposition': f'attachment; filename="{filename}"',
        'Access-Control-Expose-Headers': 'Content-Disposition'
    }
    return StreamingResponse(
        output,
        headers=headers,
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
