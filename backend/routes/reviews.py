"""Product review routes."""
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
import uuid

from database import get_db
from deps import UserSchema, get_current_user, require_permission, row_to_dict, validate_uuid, write_audit_log
from models import OrderModel, ProductModel, ProductReviewModel, SettingModel, UserModel
from storage_service import upload_media

router = APIRouter(prefix="/api")

REVIEWABLE_PAYMENT_STATUSES = {"completed", "paid", "cash on delivery"}
BLOCKED_ORDER_STATUSES = {"cancelled", "failed", "pending_payment"}


class ReviewStatusUpdate(BaseModel):
    status: str


class ReviewReplyUpdate(BaseModel):
    reply: str = ""


async def _get_feedback_settings(db: AsyncSession) -> dict:
    res = await db.execute(select(SettingModel).where(SettingModel.key == "feedback_settings"))
    setting = res.scalar_one_or_none()
    settings = {"ratings_enabled": True, "comments_enabled": True}
    if setting and isinstance(setting.value, dict):
        settings.update(setting.value)
    return {
        "ratings_enabled": settings.get("ratings_enabled", True) is not False,
        "comments_enabled": settings.get("comments_enabled", True) is not False,
    }


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
    return order_status in {"delivered", "return_requested", "return_approved", "return_rejected", "refunded"}


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
    if data.get("admin_reply"):
        data["admin_reply_author"] = "Durga Shakti Foils"
        data["admin_reply_verified"] = True
    return data


def _normalize_review_status(status: str) -> str:
    normalized = (status or "").strip().lower()
    if normalized not in {"published", "hidden"}:
        raise HTTPException(status_code=400, detail="Review status must be published or hidden")
    return normalized


async def _serialize_admin_review(review: ProductReviewModel, product: ProductModel | None, user: UserModel | None) -> dict:
    data = await _serialize_review(review)
    data.update({
        "product_name": product.name if product else "Deleted product",
        "product_image": product.image_url if product else None,
        "customer_name": user.full_name if user else data.get("public_name"),
        "customer_email": user.email if user else None,
    })
    return data


@router.get("/admin/reviews")
async def list_admin_reviews(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    rating: Optional[int] = Query(None, ge=1, le=5),
    date_range: Optional[str] = Query(None, pattern="^(today|yesterday|this_week|this_month|this_year|custom)$"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    admin: UserSchema = Depends(require_permission("view_reviews")),
    db: AsyncSession = Depends(get_db),
):
    page = max(page, 1)
    offset = (page - 1) * limit
    q = (
        select(ProductReviewModel, ProductModel, UserModel, func.count(ProductReviewModel.id).over().label("total_count"))
        .join(ProductModel, ProductModel.id == ProductReviewModel.product_id, isouter=True)
        .join(UserModel, UserModel.id == ProductReviewModel.user_id, isouter=True)
    )

    if status:
        q = q.where(ProductReviewModel.status == _normalize_review_status(status))
    if rating:
        q = q.where(ProductReviewModel.rating == rating)
    if date_range:
        ist = ZoneInfo("Asia/Kolkata")
        now_ist = datetime.now(ist)
        start = None
        end = None
        if date_range == "today":
            start = now_ist.replace(hour=0, minute=0, second=0, microsecond=0)
            end = now_ist
        elif date_range == "yesterday":
            today = now_ist.replace(hour=0, minute=0, second=0, microsecond=0)
            start = today - timedelta(days=1)
            end = today
        elif date_range == "this_week":
            start = (now_ist - timedelta(days=now_ist.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
            end = now_ist
        elif date_range == "this_month":
            start = now_ist.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            end = now_ist
        elif date_range == "this_year":
            start = now_ist.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
            end = now_ist
        elif date_range == "custom" and start_date and end_date:
            start = datetime.fromisoformat(start_date).replace(tzinfo=ist)
            end = datetime.fromisoformat(end_date).replace(tzinfo=ist) + timedelta(days=1)
        if start and end:
            q = q.where(
                ProductReviewModel.created_at >= start.astimezone(timezone.utc),
                ProductReviewModel.created_at < end.astimezone(timezone.utc),
            )
    if search:
        term = f"%{search.strip()}%"
        q = q.where(or_(
            ProductReviewModel.title.ilike(term),
            ProductReviewModel.comment.ilike(term),
            ProductReviewModel.public_name.ilike(term),
            ProductModel.name.ilike(term),
            UserModel.email.ilike(term),
            UserModel.full_name.ilike(term),
        ))

    result = await db.execute(q.order_by(ProductReviewModel.created_at.desc()).offset(offset).limit(limit))
    rows = result.all()
    total = int(rows[0].total_count) if rows else 0
    items = [await _serialize_admin_review(row[0], row[1], row[2]) for row in rows]
    return {"items": items, "total": total, "page": page, "limit": limit}


@router.put("/admin/reviews/{review_id}/status")
async def update_admin_review_status(
    review_id: str,
    data: ReviewStatusUpdate,
    admin: UserSchema = Depends(require_permission("moderate_reviews")),
    db: AsyncSession = Depends(get_db),
):
    validate_uuid(review_id)
    result = await db.execute(select(ProductReviewModel).where(ProductReviewModel.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    review.status = _normalize_review_status(data.status)
    review.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await write_audit_log(db, "REVIEW_STATUS_UPDATED", admin.id, "review", review_id, {"status": review.status})
    return {"message": "Review status updated", "review": await _serialize_review(review)}


@router.put("/admin/reviews/{review_id}/reply")
async def update_admin_review_reply(
    review_id: str,
    data: ReviewReplyUpdate,
    admin: UserSchema = Depends(require_permission("reply_reviews")),
    db: AsyncSession = Depends(get_db),
):
    validate_uuid(review_id)
    result = await db.execute(select(ProductReviewModel).where(ProductReviewModel.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    reply = (data.reply or "").strip()
    review.admin_reply = reply[:2000] if reply else None
    review.admin_reply_by = uuid.UUID(str(admin.id)) if reply else None
    review.admin_reply_at = datetime.now(timezone.utc) if reply else None
    review.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await write_audit_log(db, "REVIEW_REPLY_UPDATED", admin.id, "review", review_id, {"has_reply": bool(reply)})
    return {"message": "Review reply saved", "review": await _serialize_review(review)}


@router.delete("/admin/reviews/{review_id}")
async def delete_admin_review(
    review_id: str,
    admin: UserSchema = Depends(require_permission("moderate_reviews")),
    db: AsyncSession = Depends(get_db),
):
    validate_uuid(review_id)
    result = await db.execute(select(ProductReviewModel).where(ProductReviewModel.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    await db.delete(review)
    await db.flush()
    await write_audit_log(db, "REVIEW_DELETED", admin.id, "review", review_id)
    return {"message": "Review deleted successfully"}


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
    feedback_settings = await _get_feedback_settings(db)
    if not feedback_settings["ratings_enabled"]:
        return {
            "review_count": 0,
            "rating_average": 0,
            "rating_distribution": {str(i): 0 for i in range(1, 6)},
            "items": [],
            "page": page,
            "limit": limit,
            "settings": feedback_settings,
        }

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
    if not feedback_settings["comments_enabled"]:
        for review in reviews:
            review["comment"] = ""
    return {**summary, "items": reviews, "page": page, "limit": limit, "settings": feedback_settings}


@router.get("/reviews/eligibility")
async def get_review_eligibility(
    product_id: str,
    order_id: str,
    current_user: UserSchema = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    validate_uuid(product_id)
    validate_uuid(order_id)
    feedback_settings = await _get_feedback_settings(db)
    if not feedback_settings["ratings_enabled"]:
        return {"can_review": False, "reason": "Ratings are currently disabled", "existing_review": None}
    existing_result = await db.execute(
        select(ProductReviewModel).where(
            ProductReviewModel.product_id == product_id,
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
        "settings": feedback_settings,
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
    feedback_settings = await _get_feedback_settings(db)
    if not feedback_settings["ratings_enabled"]:
        raise HTTPException(status_code=403, detail="Ratings are currently disabled")
    if rating < 1 or rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    clean_title = title.strip()
    clean_comment = comment.strip() if feedback_settings["comments_enabled"] else ""
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
        review.order_id = order_id  # Update to latest order
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


@router.delete("/reviews/{review_id}")
async def delete_product_review(
    review_id: str,
    current_user: UserSchema = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    validate_uuid(review_id)
    result = await db.execute(
        select(ProductReviewModel).where(ProductReviewModel.id == review_id)
    )
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    is_owner = str(review.user_id) == str(current_user.id)
    is_admin = current_user.role in ("admin", "SUPER_ADMIN")
    if not (is_owner or is_admin):
        raise HTTPException(status_code=403, detail="You do not have permission to delete this review")

    await db.delete(review)
    await db.flush()
    return {"message": "Review deleted successfully"}
