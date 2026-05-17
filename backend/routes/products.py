"""Product routes (public)."""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Optional
from database import get_db
from models import ProductModel
from deps import sanitize_search_term, row_to_dict, validate_uuid

router = APIRouter(prefix="/api")


@router.get("/products", response_model=dict)
async def get_products(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    search = sanitize_search_term(search)
    base_q = select(ProductModel)
    count_q = select(func.count(ProductModel.id))

    if search:
        like_term = f"%{search}%"
        filter_clause = or_(
            ProductModel.name.ilike(like_term),
            ProductModel.batch_no.ilike(like_term),
            ProductModel.variant_sku.ilike(like_term),
        )
        base_q = base_q.where(filter_clause)
        count_q = count_q.where(filter_clause)

    total_result = await db.execute(count_q)
    total = total_result.scalar() or 0

    offset = (page - 1) * limit
    result = await db.execute(
        base_q.order_by(ProductModel.created_at.desc()).offset(offset).limit(limit)
    )
    products = [row_to_dict(p) for p in result.scalars().all()]
    return {"items": products, "total": total, "page": page, "limit": limit}


@router.get("/products/{product_id}")
async def get_product(product_id: str, db: AsyncSession = Depends(get_db)):
    validate_uuid(product_id)
    result = await db.execute(select(ProductModel).where(ProductModel.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return row_to_dict(product)
