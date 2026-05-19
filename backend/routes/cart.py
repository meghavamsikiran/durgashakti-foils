"""Cart routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm.attributes import flag_modified
from typing import List
from database import get_db
from models import CartModel, ProductModel
from deps import UserSchema, CartItem, get_current_user, row_to_dict, validate_uuid, is_valid_uuid
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/api")


@router.get("/cart")
async def get_cart(current_user: UserSchema = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CartModel).where(CartModel.user_id == current_user.id))
    cart = result.scalar_one_or_none()
    if not cart:
        return {"items": []}

    valid_items = []
    items_modified = False
    for item in (cart.items or []):
        if not is_valid_uuid(item.get('product_id')):
            items_modified = True
            continue
        prod = await db.execute(select(ProductModel.id).where(ProductModel.id == item['product_id']))
        if prod.scalar_one_or_none():
            valid_items.append(item)
        else:
            items_modified = True

    if items_modified:
        cart.items = valid_items
        cart.updated_at = datetime.now(timezone.utc)
        flag_modified(cart, "items")
        await db.flush()

    return {"items": valid_items, "user_id": str(cart.user_id), "id": str(cart.id)}


@router.post("/cart/add")
async def add_to_cart(item: CartItem, current_user: UserSchema = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    validate_uuid(item.product_id)
    prod_res = await db.execute(select(ProductModel).where(ProductModel.id == item.product_id))
    product = prod_res.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    stock_qty = int(product.stock_quantity or 0)
    if stock_qty <= 0 or not product.in_stock:
        raise HTTPException(status_code=400, detail="This product is currently out of stock")

    cart_res = await db.execute(select(CartModel).where(CartModel.user_id == current_user.id))
    cart = cart_res.scalar_one_or_none()
    existing_cart_qty = 0
    if cart:
        existing_item = next((i for i in (cart.items or []) if i['product_id'] == item.product_id), None)
        if existing_item:
            existing_cart_qty = int(existing_item.get('quantity', 0))
    total_requested = existing_cart_qty + item.quantity
    if total_requested > stock_qty:
        raise HTTPException(status_code=400, detail=f"Only {stock_qty} units available. You already have {existing_cart_qty} in cart.")

    now = datetime.now(timezone.utc)
    if not cart:
        cart = CartModel(user_id=current_user.id, items=[item.model_dump()], updated_at=now)
        db.add(cart)
    else:
        items = list(cart.items or [])
        existing_item = next((i for i in items if i['product_id'] == item.product_id), None)
        if existing_item:
            existing_item['quantity'] += item.quantity
        else:
            items.append(item.model_dump())
        cart.items = items
        cart.updated_at = now
        flag_modified(cart, "items")
    await db.flush()
    return {"message": "Item added to cart"}


@router.put("/cart/update")
async def update_cart_item(item: CartItem, current_user: UserSchema = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    validate_uuid(item.product_id)
    cart_res = await db.execute(select(CartModel).where(CartModel.user_id == current_user.id))
    cart = cart_res.scalar_one_or_none()
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")

    items = list(cart.items or [])
    existing_item = next((i for i in items if i['product_id'] == item.product_id), None)
    if not existing_item:
        raise HTTPException(status_code=404, detail="Item not found in cart")

    prod_res = await db.execute(select(ProductModel).where(ProductModel.id == item.product_id))
    product = prod_res.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if item.quantity > int(product.stock_quantity or 0):
        raise HTTPException(status_code=400, detail=f"Only {product.stock_quantity} units available")

    existing_item['quantity'] = item.quantity
    cart.items = items
    cart.updated_at = datetime.now(timezone.utc)
    flag_modified(cart, "items")
    await db.flush()
    return {"message": "Cart updated"}


@router.delete("/cart/remove/{product_id}")
async def remove_from_cart(product_id: str, current_user: UserSchema = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    validate_uuid(product_id)
    cart_res = await db.execute(select(CartModel).where(CartModel.user_id == current_user.id))
    cart = cart_res.scalar_one_or_none()
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    cart.items = [i for i in (cart.items or []) if i['product_id'] != product_id]
    cart.updated_at = datetime.now(timezone.utc)
    flag_modified(cart, "items")
    await db.flush()
    return {"message": "Item removed from cart"}


@router.delete("/cart/clear")
async def clear_cart(current_user: UserSchema = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    cart_res = await db.execute(select(CartModel).where(CartModel.user_id == current_user.id))
    cart = cart_res.scalar_one_or_none()
    if cart:
        cart.items = []
        cart.updated_at = datetime.now(timezone.utc)
        flag_modified(cart, "items")
        await db.flush()
    return {"message": "Cart cleared"}


@router.post("/cart/bulk-sync")
async def bulk_sync_cart(items: List[CartItem], current_user: UserSchema = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    cart_res = await db.execute(select(CartModel).where(CartModel.user_id == current_user.id))
    cart = cart_res.scalar_one_or_none()
    current_items = list(cart.items or []) if cart else []

    for new_item in items:
        if not is_valid_uuid(new_item.product_id):
            continue
        prod_res = await db.execute(select(ProductModel).where(ProductModel.id == new_item.product_id))
        product = prod_res.scalar_one_or_none()
        if not product or int(product.stock_quantity or 0) <= 0:
            continue
        existing = next((i for i in current_items if i['product_id'] == new_item.product_id), None)
        if existing:
            max_stock = int(product.stock_quantity or 0)
            existing['quantity'] = min(existing['quantity'] + new_item.quantity, max_stock)
        else:
            current_items.append(new_item.model_dump())

    now = datetime.now(timezone.utc)
    if cart:
        cart.items = current_items
        cart.updated_at = now
        flag_modified(cart, "items")
    else:
        cart = CartModel(user_id=current_user.id, items=current_items, updated_at=now)
        db.add(cart)
    await db.flush()
    return {"message": "Cart synchronized", "items": current_items}
