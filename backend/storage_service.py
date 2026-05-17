"""
Supabase Storage Service
Replaces local filesystem uploads with Supabase CDN-backed storage.
All images (product, return, GST) are uploaded here.
"""
import os
import uuid
import logging
from pathlib import Path
from typing import Optional
from fastapi import HTTPException

logger = logging.getLogger(__name__)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
BUCKET_NAME = os.environ.get("SUPABASE_STORAGE_BUCKET", "durgashakti-assets")

# Lazy-init so the module is importable even before env vars are set
_client = None


def _get_client():
    global _client
    if _client is not None:
        return _client
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_KEY == "YOUR_SUPABASE_SERVICE_ROLE_KEY":
        return None  # Fallback to local storage
    try:
        from supabase import create_client, Client
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        return _client
    except Exception as e:
        logger.warning("Supabase client init failed: %s — falling back to local storage.", e)
        return None


def _local_fallback_path() -> Path:
    """Local uploads dir as fallback when Supabase is not configured."""
    p = Path(__file__).parent / "uploads"
    p.mkdir(parents=True, exist_ok=True)
    return p


ALLOWED_IMAGE_TYPES = {"image/png": ".png", "image/jpeg": ".jpg", "image/jpg": ".jpg", "image/webp": ".webp"}
ALLOWED_DOC_TYPES = {"application/pdf": ".pdf"}


def _ext_for_content_type(content_type: str, allowed: dict) -> str:
    ct = (content_type or "").lower()
    if ct not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ct}")
    return allowed[ct]


async def upload_image(raw: bytes, content_type: str, prefix: str = "img") -> str:
    """
    Upload an image to Supabase Storage.
    Returns a public URL string.
    Falls back to local /uploads/ if Supabase is not configured.
    """
    ext = _ext_for_content_type(content_type, ALLOWED_IMAGE_TYPES)
    filename = f"{prefix}_{uuid.uuid4().hex}{ext}"

    client = _get_client()
    if client:
        try:
            client.storage.from_(BUCKET_NAME).upload(
                path=filename,
                file=raw,
                file_options={"content-type": content_type, "upsert": "true"},
            )
            public_url = client.storage.from_(BUCKET_NAME).get_public_url(filename)
            logger.info("Uploaded %s to Supabase Storage: %s", filename, public_url)
            return public_url
        except Exception as e:
            logger.error("Supabase Storage upload failed: %s — falling back to local.", e)

    # Local fallback
    local_path = _local_fallback_path() / filename
    local_path.write_bytes(raw)
    return f"/uploads/{filename}"


async def delete_asset(url: str):
    """
    Delete an asset from Supabase Storage by its public URL.
    Gracefully handles local /uploads/ paths as fallback.
    """
    if not url:
        return
    try:
        if SUPABASE_URL and url.startswith(SUPABASE_URL):
            filename = url.split(f"/{BUCKET_NAME}/")[-1].split("?")[0]
            client = _get_client()
            if client:
                client.storage.from_(BUCKET_NAME).remove([filename])
                logger.info("Deleted %s from Supabase Storage.", filename)
        elif "/uploads/" in url:
            filename = url.split("/uploads/")[-1]
            local_path = _local_fallback_path() / filename
            if local_path.exists():
                local_path.unlink()
                logger.info("Deleted local upload: %s", filename)
    except Exception as e:
        logger.warning("Asset deletion failed for %s: %s", url, e)


async def ensure_bucket_exists():
    """
    Create the Supabase Storage bucket if it does not already exist.
    Called once at server startup.
    """
    client = _get_client()
    if not client:
        logger.info("Supabase Storage not configured — using local filesystem for uploads.")
        return
    try:
        buckets = client.storage.list_buckets()
        if not any(b.name == BUCKET_NAME for b in buckets):
            client.storage.create_bucket(BUCKET_NAME, options={"public": True})
            logger.info("Created Supabase Storage bucket: %s", BUCKET_NAME)
        else:
            logger.info("Supabase Storage bucket '%s' is ready.", BUCKET_NAME)
    except Exception as e:
        logger.warning("Could not verify Supabase Storage bucket: %s", e)
