"""Shared coupon expiry and banner cleanup helpers."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import CouponModel, SettingModel


def as_aware_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def coupon_is_expired(coupon: CouponModel, now: datetime | None = None) -> bool:
    expiry = as_aware_utc(coupon.expiry_date)
    if expiry is None:
        return False
    now = now or datetime.now(timezone.utc)
    return now >= expiry


def expiry_is_past(expiry_date: datetime | None, now: datetime | None = None) -> bool:
    expiry = as_aware_utc(expiry_date)
    if expiry is None:
        return False
    now = now or datetime.now(timezone.utc)
    return now >= expiry


def _code_of(value: Any) -> str:
    if isinstance(value, dict):
        return str(value.get("code") or "").upper()
    return str(value or "").upper()


def clean_popup_banner_value(value: Any, valid_codes: set[str]) -> dict:
    popup = dict(value or {}) if isinstance(value, dict) else {}
    valid_codes = {str(code).upper() for code in valid_codes if code}

    popup["promoted_coupons"] = popup.get("promoted_coupons") or []

    cleaned_banners = []
    for banner in popup.get("custom_banners") or []:
        if not isinstance(banner, dict):
            continue
        clean_banner = dict(banner)
        original_codes = [code for code in (clean_banner.get("coupon_codes") or []) if _code_of(code)]
        if original_codes:
            any_active = any(_code_of(code) in valid_codes for code in original_codes)
            clean_banner["is_active"] = any_active
        cleaned_banners.append(clean_banner)

    popup["custom_banners"] = cleaned_banners
    return popup


def filter_public_popup_banner(value: Any, valid_codes: set[str], coupon_map: dict[str, Any] | None = None) -> dict:
    """Filter popup_banner for the public API response.

    ``coupon_map`` is an optional *code → CouponModel* mapping.  When
    provided the stale ``linked_coupons`` snapshot stored in the JSON
    setting is refreshed with live DB values (expiry_date, is_active,
    discount_type, discount_value).  This prevents the frontend from
    seeing an outdated expiry date after the admin extends it.
    """
    popup = dict(value or {}) if isinstance(value, dict) else {}
    valid_codes = {str(code).upper() for code in valid_codes if code}
    coupon_map = coupon_map or {}

    popup["promoted_coupons"] = [
        coupon for coupon in (popup.get("promoted_coupons") or [])
        if _code_of(coupon) in valid_codes
    ]

    cleaned_banners = []
    for banner in popup.get("custom_banners") or []:
        if not isinstance(banner, dict):
            continue
        clean_banner = dict(banner)
        original_codes = [code for code in (clean_banner.get("coupon_codes") or []) if _code_of(code)]
        
        # Only active coupons for public
        clean_banner["coupon_codes"] = [
            code for code in (clean_banner.get("coupon_codes") or [])
            if _code_of(code) in valid_codes
        ]

        # Refresh linked_coupons with live DB data so the frontend sees
        # current expiry dates and active status instead of stale snapshots.
        refreshed_linked = []
        for coupon in (clean_banner.get("linked_coupons") or []):
            code_upper = _code_of(coupon)
            if code_upper not in valid_codes:
                continue
            db_coupon = coupon_map.get(code_upper)
            if db_coupon is not None:
                refreshed = dict(coupon)
                refreshed["is_active"] = getattr(db_coupon, "is_active", True)
                exp = getattr(db_coupon, "expiry_date", None)
                refreshed["expiry_date"] = exp.isoformat() if exp else None
                refreshed["discount_type"] = getattr(db_coupon, "discount_type", refreshed.get("discount_type"))
                refreshed["discount_value"] = getattr(db_coupon, "discount_value", refreshed.get("discount_value"))
                refreshed_linked.append(refreshed)
            else:
                refreshed_linked.append(coupon)
        clean_banner["linked_coupons"] = refreshed_linked
        
        any_active = original_codes and any(_code_of(code) in valid_codes for code in original_codes)
        
        # Show on public only if active and contains active coupons
        if clean_banner.get("is_active", True) and any_active:
            clean_banner["is_active"] = True
            cleaned_banners.append(clean_banner)

    popup["custom_banners"] = cleaned_banners
    return popup


async def cleanup_expired_coupons(db: AsyncSession) -> bool:
    now = datetime.now(timezone.utc)
    changed = False

    coupons_res = await db.execute(select(CouponModel))
    coupons = coupons_res.scalars().all()
    for coupon in coupons:
        if coupon.is_active and coupon_is_expired(coupon, now):
            coupon.is_active = False
            changed = True

    valid_codes = {
        coupon.code.upper()
        for coupon in coupons
        if coupon.code and coupon.is_active and not coupon_is_expired(coupon, now)
    }

    setting_res = await db.execute(select(SettingModel).where(SettingModel.key == "popup_banner"))
    setting = setting_res.scalar_one_or_none()
    if setting and isinstance(setting.value, dict):
        cleaned = clean_popup_banner_value(setting.value, valid_codes)
        if cleaned != setting.value:
            setting.value = cleaned
            changed = True

    if changed:
        await db.flush()
    return changed
