"""User sub-resource routes: addresses, wishlist, notifications, cards."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func
from database import get_db
from models import UserModel, AddressModel, NotificationModel, ProductModel, ProductReviewModel, SettingModel
from deps import (
    UserSchema, UserAddress, SavedCard, WishlistItem,
    get_current_user, row_to_dict, validate_uuid, is_valid_uuid,
    apply_effective_product_pricing, attach_applicable_product_coupons
)
import uuid
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/api")


async def _attach_review_summaries(db: AsyncSession, products: list[dict]) -> list[dict]:
    if not products:
        return products
    settings_res = await db.execute(select(SettingModel).where(SettingModel.key == "feedback_settings"))
    setting = settings_res.scalar_one_or_none()
    if setting and isinstance(setting.value, dict) and setting.value.get("ratings_enabled") is False:
        for product in products:
            product["review_count"] = 0
            product["rating_average"] = 0
        return products

    product_ids = [product["id"] for product in products if product.get("id")]
    result = await db.execute(
        select(
            ProductReviewModel.product_id,
            func.count(ProductReviewModel.id).label("review_count"),
            func.coalesce(func.avg(ProductReviewModel.rating), 0).label("rating_average"),
        )
        .where(ProductReviewModel.product_id.in_(product_ids), ProductReviewModel.status == "published")
        .group_by(ProductReviewModel.product_id)
    )
    summaries = {
        str(row.product_id): {
            "review_count": int(row.review_count or 0),
            "rating_average": round(float(row.rating_average or 0), 1),
        }
        for row in result.all()
    }
    for product in products:
        summary = summaries.get(product["id"], {})
        product["review_count"] = summary.get("review_count", 0)
        product["rating_average"] = summary.get("rating_average", 0)
    return products


# ── Addresses ────────────────────────────────────────────────────────────
@router.get("/user/addresses")
async def get_addresses(current_user: UserSchema = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AddressModel).where(AddressModel.user_id == current_user.id).order_by(AddressModel.is_default.desc()))
    rows = result.scalars().all()
    return [row_to_dict(r) for r in rows]


@router.post("/user/addresses")
async def add_address(address: UserAddress, current_user: UserSchema = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if address.is_default:
        await db.execute(update(AddressModel).where(AddressModel.user_id == current_user.id).values(is_default=False))
    addr = AddressModel(
        id=address.id,
        user_id=current_user.id,
        label=address.label,
        full_name=address.full_name,
        phone=address.phone,
        address_line1=address.address_line1,
        address_line2=address.address_line2,
        city=address.city,
        state=address.state,
        pincode=address.pincode,
        is_default=address.is_default,
    )
    db.add(addr)
    await db.flush()
    return row_to_dict(addr)


@router.put("/user/addresses/{address_id}")
async def update_address(address_id: str, address: UserAddress, current_user: UserSchema = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    validate_uuid(address_id)
    result = await db.execute(select(AddressModel).where(AddressModel.id == address_id, AddressModel.user_id == current_user.id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Address not found")
    if address.is_default:
        await db.execute(update(AddressModel).where(AddressModel.user_id == current_user.id).values(is_default=False))
    row.label = address.label
    row.full_name = address.full_name
    row.phone = address.phone
    row.address_line1 = address.address_line1
    row.address_line2 = address.address_line2
    row.city = address.city
    row.state = address.state
    row.pincode = address.pincode
    row.is_default = address.is_default
    await db.flush()
    return row_to_dict(row)


@router.delete("/user/addresses/{address_id}")
async def delete_address(address_id: str, current_user: UserSchema = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    validate_uuid(address_id)
    await db.execute(delete(AddressModel).where(AddressModel.id == address_id, AddressModel.user_id == current_user.id))
    return {"status": "ok"}


# ── Wishlist ─────────────────────────────────────────────────────────────
@router.get("/user/wishlist")
async def get_wishlist(current_user: UserSchema = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserModel).where(UserModel.id == current_user.id))
    user = result.scalar_one()
    wishlist_ids = [item['product_id'] for item in (user.wishlist or []) if is_valid_uuid(item.get('product_id'))]
    if not wishlist_ids:
        return []
    result = await db.execute(select(ProductModel).where(ProductModel.id.in_(wishlist_ids)))
    products = [row_to_dict(p) for p in result.scalars().all()]
    products_by_id = {product["id"]: product for product in products}
    ordered_products = [products_by_id[product_id] for product_id in wishlist_ids if product_id in products_by_id]
    ordered_products = await apply_effective_product_pricing(db, ordered_products)
    ordered_products = await attach_applicable_product_coupons(db, ordered_products)
    ordered_products = await _attach_review_summaries(db, ordered_products)
    return ordered_products


@router.post("/user/wishlist/{product_id}")
async def toggle_wishlist(product_id: str, current_user: UserSchema = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    validate_uuid(product_id)
    result = await db.execute(select(UserModel).where(UserModel.id == current_user.id))
    user = result.scalar_one()
    wishlist = list(user.wishlist or [])
    exists = any(item['product_id'] == product_id for item in wishlist)
    if exists:
        wishlist = [item for item in wishlist if item['product_id'] != product_id]
        user.wishlist = wishlist
        await db.flush()
        return {"status": "removed"}
    else:
        item = {"id": str(uuid.uuid4()), "product_id": product_id, "created_at": datetime.now(timezone.utc).isoformat()}
        wishlist.append(item)
        user.wishlist = wishlist
        await db.flush()
        return {"status": "added"}


@router.delete("/user/wishlist")
async def clear_wishlist(current_user: UserSchema = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserModel).where(UserModel.id == current_user.id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.wishlist = []
    await db.flush()
    return {"message": "Wishlist cleared successfully"}


# ── Notifications ────────────────────────────────────────────────────────
@router.get("/user/notifications")
async def get_notifications(current_user: UserSchema = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Auto-delete read notifications older than 3 days
    three_days_ago = datetime.now(timezone.utc) - timedelta(days=3)
    await db.execute(
        delete(NotificationModel)
        .where(
            NotificationModel.user_id == current_user.id,
            NotificationModel.is_read == True,
            NotificationModel.created_at < three_days_ago
        )
    )
    result = await db.execute(
        select(NotificationModel)
        .where(NotificationModel.user_id == current_user.id)
        .order_by(NotificationModel.created_at.desc())
        .limit(50)
    )
    return [row_to_dict(n) for n in result.scalars().all()]


@router.put("/user/notifications/read-all")
async def mark_notifications_read(current_user: UserSchema = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(update(NotificationModel).where(NotificationModel.user_id == current_user.id).values(is_read=True))
    return {"status": "ok"}


# ── Saved Cards ──────────────────────────────────────────────────────────
@router.get("/user/cards")
async def get_saved_cards(current_user: UserSchema = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserModel).where(UserModel.id == current_user.id))
    user = result.scalar_one()
    return user.saved_cards or []


@router.post("/user/cards")
async def add_card(card: SavedCard, current_user: UserSchema = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserModel).where(UserModel.id == current_user.id))
    user = result.scalar_one()
    cards = list(user.saved_cards or [])
    cards.append(card.model_dump())
    user.saved_cards = cards
    await db.flush()
    return card
