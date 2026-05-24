"""Product review routes."""
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified
from typing import List, Optional
from datetime import datetime, timezone

from database import get_db
from deps import UserSchema, get_current_user, is_valid_uuid, row_to_dict, validate_uuid
from models import OrderModel, ProductModel, ProductReviewModel
from storage_service import upload_media

router = APIRouter(prefix="/api")

REVIEWABLE_PAYMENT_STATUSES = {"completed", "paid", "cash on delivery"}
BLOCKED_ORDER_STATUSES = {"cancelled", "failed", "pending_payment"}


def _review_summary_rows(rows) -> dict:
    distribution = {str(i): 0 for i in range(1, 6)}
    total = 0
    weighted = 0
    for rating, count in rows:
        key = str(int(rating))
        distribution[key] = int(count or 0)
        total += int(count or 0)
        weighted += int(rating) * int(count or 0)
    average = round(weighted / total, 1) if total else 0
    return {
        "review_count": total,
        "rating_average": average,
        "rating_distribution": distribution,
    }


def _order_contains_product(order: OrderModel, product_id: str) -> bool:
    return any(str(item.get("product_id")) == str(product_id) for item in (order.items or []))


def _can_review_order(order: OrderModel) -> bool:
    order_status = (order.order_status or "").lower()
    payment_status = (order.payment_status or "").lower()
    if order_status in BLOCKED_ORDER_STATUSES:
        return False
    if payment_status in REVIEWABLE_PAYMENT_STATUSES:
        return True
    return order.stock_applied is True and order_status not in BLOCKED_ORDER_STATUSES


async def _get_purchase_for_review(db: AsyncSession, user_id: str, product_id: str, order_id: str) -> OrderModel:
    result = await db.execute(
        select(OrderModel).where(OrderModel.id == order_id, OrderModel.user_id == user_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if not _order_contains_product(order, product_id):
        raise HTTPException(status_code=403, detail="This product was not part of the selected order")
    if not _can_review_order(order):
        raise HTTPException(status_code=403, detail="Reviews are available after a valid purchase")
    return order


async def _serialize_review(review: ProductReviewModel) -> dict:
    data = row_to_dict(review)
    data["is_verified_purchase"] = True
    return data


@router.get("/products/{product_id}/reviews")
async def get_product_reviews(
    product_id: str,
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    validate_uuid(product_id)
    page = max(page, 1)
    limit = min(max(limit, 1), 50)
    offset = (page - 1) * limit

    summary_result = await db.execute(
        select(ProductReviewModel.rating, func.count(ProductReviewModel.id))
        .where(ProductReviewModel.product_id == product_id, ProductReviewModel.status == "published")
        .group_by(ProductReviewModel.rating)
    )
    summary = _review_summary_rows(summary_result.all())

    reviews_result = await db.execute(
        select(ProductReviewModel)
        .where(ProductReviewModel.product_id == product_id, ProductReviewModel.status == "published")
        .order_by(ProductReviewModel.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    reviews = [await _serialize_review(review) for review in reviews_result.scalars().all()]
    return {**summary, "items": reviews, "page": page, "limit": limit}


@router.get("/reviews/eligibility")
async def get_review_eligibility(
    product_id: str,
    order_id: str,
    current_user: UserSchema = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    validate_uuid(product_id)
    validate_uuid(order_id)
    existing_result = await db.execute(
        select(ProductReviewModel).where(
            ProductReviewModel.product_id == product_id,
            ProductReviewModel.order_id == order_id,
            ProductReviewModel.user_id == current_user.id,
        )
    )
    existing_review = existing_result.scalar_one_or_none()
    try:
        order = await _get_purchase_for_review(db, current_user.id, product_id, order_id)
    except HTTPException as exc:
        return {"can_review": False, "reason": exc.detail, "existing_review": None}

    product_result = await db.execute(select(ProductModel).where(ProductModel.id == product_id))
    product = product_result.scalar_one_or_none()
    if not product:
        return {"can_review": False, "reason": "Product not found", "existing_review": None}

    order_item = next((item for item in (order.items or []) if str(item.get("product_id")) == str(product_id)), {})
    return {
        "can_review": True,
        "reason": None,
        "existing_review": await _serialize_review(existing_review) if existing_review else None,
        "product": {
            "id": str(product.id),
            "name": product.name,
            "image_url": order_item.get("image_url") or product.image_url,
        },
    }


@router.post("/reviews")
async def submit_product_review(
    product_id: str = Form(...),
    order_id: str = Form(...),
    rating: int = Form(...),
    title: str = Form(...),
    comment: str = Form(""),
    public_name: str = Form(...),
    files: Optional[List[UploadFile]] = File(None),
    current_user: UserSchema = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    validate_uuid(product_id)
    validate_uuid(order_id)
    if rating < 1 or rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    clean_title = title.strip()
    clean_comment = comment.strip()
    clean_public_name = public_name.strip()
    if not clean_title:
        raise HTTPException(status_code=400, detail="Review title is required")
    if not clean_public_name:
        raise HTTPException(status_code=400, detail="Public name is required")

    product_result = await db.execute(select(ProductModel).where(ProductModel.id == product_id))
    if not product_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Product not found")
    await _get_purchase_for_review(db, current_user.id, product_id, order_id)

    uploaded_media = []
    for file in (files or [])[:6]:
        content_type = file.content_type or ""
        if not (content_type.startswith("image/") or content_type.startswith("video/")):
            raise HTTPException(status_code=400, detail="Only image and video uploads are allowed")
        raw = await file.read()
        if len(raw) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Each review media file must be below 10MB")
        uploaded_media.append({
            "url": await upload_media(raw, content_type, prefix=f"review_{product_id}"),
            "type": "video" if content_type.startswith("video/") else "image",
            "name": file.filename,
        })

    existing_result = await db.execute(
        select(ProductReviewModel).where(
            ProductReviewModel.product_id == product_id,
            ProductReviewModel.order_id == order_id,
            ProductReviewModel.user_id == current_user.id,
        )
    )
    review = existing_result.scalar_one_or_none()
    now = datetime.now(timezone.utc)
    if review:
        review.rating = rating
        review.title = clean_title[:140]
        review.comment = clean_comment[:2000]
        review.public_name = clean_public_name[:120]
        if uploaded_media:
            review.media_urls = uploaded_media
            flag_modified(review, "media_urls")
        review.status = "published"
        review.updated_at = now
    else:
        review = ProductReviewModel(
            product_id=product_id,
            user_id=current_user.id,
            order_id=order_id,
            rating=rating,
            title=clean_title[:140],
            comment=clean_comment[:2000],
            public_name=clean_public_name[:120],
            media_urls=uploaded_media,
            status="published",
            created_at=now,
            updated_at=now,
        )
        db.add(review)
    await db.flush()
    return {"message": "Review submitted", "review": await _serialize_review(review)}
