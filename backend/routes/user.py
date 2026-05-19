"""User sub-resource routes: addresses, wishlist, notifications, cards."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from database import get_db
from models import UserModel, AddressModel, NotificationModel, ProductModel
from deps import (
    UserSchema, UserAddress, SavedCard, WishlistItem,
    get_current_user, row_to_dict, validate_uuid, is_valid_uuid
)
import uuid
from datetime import datetime, timezone

router = APIRouter(prefix="/api")


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
    products = result.scalars().all()
    return [row_to_dict(p) for p in products]


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
