"""Product routes (public)."""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Optional
from database import get_db
from models import ProductModel, ProductReviewModel, SettingModel
from deps import sanitize_search_term, row_to_dict, validate_uuid, sync_product_categories, apply_effective_product_pricing

router = APIRouter(prefix="/api")


async def _review_summaries(db: AsyncSession, product_ids: list[str]) -> dict:
    if not product_ids:
        return {}
    settings_res = await db.execute(select(SettingModel).where(SettingModel.key == "feedback_settings"))
    setting = settings_res.scalar_one_or_none()
    if setting and isinstance(setting.value, dict) and setting.value.get("ratings_enabled") is False:
        return {}
    result = await db.execute(
        select(
            ProductReviewModel.product_id,
            func.count(ProductReviewModel.id).label("review_count"),
            func.coalesce(func.avg(ProductReviewModel.rating), 0).label("rating_average"),
        )
        .where(ProductReviewModel.product_id.in_(product_ids), ProductReviewModel.status == "published")
        .group_by(ProductReviewModel.product_id)
    )
    return {
        str(row.product_id): {
            "review_count": int(row.review_count or 0),
            "rating_average": round(float(row.rating_average or 0), 1),
        }
        for row in result.all()
    }


async def _attach_review_summaries(db: AsyncSession, products: list[dict]) -> list[dict]:
    summaries = await _review_summaries(db, [p["id"] for p in products])
    for product in products:
        summary = summaries.get(product["id"], {})
        product["review_count"] = summary.get("review_count", 0)
        product["rating_average"] = summary.get("rating_average", 0)
    return products


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

    products = await apply_effective_product_pricing(db, [row_to_dict(row[0]) for row in rows])
    products = await _attach_review_summaries(db, products)
    return {"items": products, "total": total, "page": page, "limit": limit}


@router.get("/products/{product_id}")
async def get_product(product_id: str, db: AsyncSession = Depends(get_db)):
    validate_uuid(product_id)
    result = await db.execute(select(ProductModel).where(ProductModel.id == product_id, ProductModel.is_active == True))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product_data = row_to_dict(product)
    await apply_effective_product_pricing(db, [product_data])
    await _attach_review_summaries(db, [product_data])
    return product_data


@router.get("/categories")
async def get_public_categories(db: AsyncSession = Depends(get_db)):
    from models import CategoryModel
    await sync_product_categories(db)
    result = await db.execute(select(CategoryModel).where(CategoryModel.is_active == True).order_by(CategoryModel.name.asc()))
    categories = result.scalars().all()
    return [row_to_dict(c) for c in categories]
