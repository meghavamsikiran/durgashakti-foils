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
    active_clause = ProductModel.is_active == True
    q = select(ProductModel, func.count(ProductModel.id).over().label('total_count')).where(active_clause)

    filter_clause = None
    if search:
        like_term = f"%{search}%"
        filter_clause = or_(
            ProductModel.name.ilike(like_term),
            ProductModel.batch_no.ilike(like_term),
            ProductModel.variant_sku.ilike(like_term),
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
        fallback_q = select(func.count(ProductModel.id)).where(active_clause)
        if filter_clause is not None:
            fallback_q = fallback_q.where(filter_clause)
        total = (await db.execute(fallback_q)).scalar() or 0

    products = [row_to_dict(row[0]) for row in rows]
    return {"items": products, "total": total, "page": page, "limit": limit}


@router.get("/products/{product_id}")
async def get_product(product_id: str, db: AsyncSession = Depends(get_db)):
    validate_uuid(product_id)
    result = await db.execute(select(ProductModel).where(ProductModel.id == product_id, ProductModel.is_active == True))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return row_to_dict(product)


@router.get("/categories")
async def get_public_categories(db: AsyncSession = Depends(get_db)):
    from models import CategoryModel
    result = await db.execute(select(CategoryModel).where(CategoryModel.is_active == True).order_by(CategoryModel.name.asc()))
    categories = result.scalars().all()
    return [row_to_dict(c) for c in categories]
