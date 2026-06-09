import os
import uuid
import asyncio
from io import BytesIO
from PIL import Image
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load env vars
load_dotenv()

# Import storage service utilities
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from storage_service import _get_client, BUCKET_NAME

MIGRATION_LOGS = []

def log_debug(msg):
    logger.info(msg)
    MIGRATION_LOGS.append(f"INFO: {msg}")

def log_error(msg):
    logger.error(msg)
    MIGRATION_LOGS.append(f"ERROR: {msg}")

def convert_bytes_to_webp(raw_bytes: bytes) -> bytes:
    try:
        img = Image.open(BytesIO(raw_bytes))
        if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
            # Keep alpha channel
            pass
        else:
            img = img.convert("RGB")
        out = BytesIO()
        img.save(out, format="WEBP", quality=80)
        return out.getvalue()
    except Exception as e:
        log_error(f"Failed to convert bytes to webp: {e}")
        return raw_bytes

async def process_image_url(url: str, client) -> str:
    if not url:
        return url
    
    url_lower = url.lower()
    if not any(url_lower.endswith(ext) for ext in (".png", ".jpg", ".jpeg", ".avif")):
        return url

    log_debug(f"Processing URL for conversion: {url}")
    
    # Check if local fallback
    if "/uploads/" in url:
        filename = url.split("/uploads/")[-1]
        base_name, _ = os.path.splitext(filename)
        webp_filename = base_name + ".webp"
        
        local_dir_backend = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
        local_dir_frontend = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "public", "uploads")
        
        # 1. Check if the .webp file already exists on disk
        webp_exists = False
        for directory in (local_dir_backend, local_dir_frontend):
            if os.path.exists(os.path.join(directory, webp_filename)):
                webp_exists = True
                break
        
        if webp_exists:
            log_debug(f"WebP file already exists on disk for {filename}. Updating database reference to WebP.")
            return url.replace(filename, webp_filename)
            
        # 2. Otherwise search for the original file (.png, .jpg, .jpeg, .avif)
        local_path = None
        for directory in (local_dir_backend, local_dir_frontend):
            p = os.path.join(directory, filename)
            if os.path.exists(p):
                local_path = p
                break
                
        if local_path and os.path.exists(local_path):
            try:
                raw = open(local_path, "rb").read()
                webp_raw = convert_bytes_to_webp(raw)
                
                new_path = os.path.join(os.path.dirname(local_path), webp_filename)
                with open(new_path, "wb") as f:
                    f.write(webp_raw)
                
                # Delete original
                os.remove(local_path)
                log_debug(f"Converted local file: {local_path} -> {new_path}")
                return url.replace(filename, webp_filename)
            except Exception as e:
                log_error(f"Failed to convert local file {local_path}: {e}")
                return url
        else:
            # If the original file does not exist on disk, check if we can fall back to the WebP name
            log_debug(f"Original file {filename} not found on disk. Directing database reference to WebP.")
            return url.replace(filename, webp_filename)
                
    elif client and BUCKET_NAME in url:
        # Supabase storage URL
        try:
            filename = url.split(f"/{BUCKET_NAME}/")[-1].split("?")[0]
            log_debug(f"Attempting to download from Supabase storage: {filename}")
            
            # Download from Supabase
            try:
                raw = client.storage.from_(BUCKET_NAME).download(filename)
            except Exception as download_err:
                log_error(f"Download failed for {filename}: {download_err}")
                # Construct the .webp filename
                new_filename = os.path.splitext(filename)[0] + ".webp"
                # If download fails, let's still change the DB URL to .webp as a clean transition
                new_url = client.storage.from_(BUCKET_NAME).get_public_url(new_filename)
                log_debug(f"Updating DB reference to fallback WebP URL: {new_url}")
                return new_url
                
            webp_raw = convert_bytes_to_webp(raw)
            
            # Upload WebP to Supabase
            new_filename = os.path.splitext(filename)[0] + ".webp"
            log_debug(f"Uploading WebP to Supabase storage: {new_filename}")
            client.storage.from_(BUCKET_NAME).upload(
                path=new_filename,
                file=webp_raw,
                file_options={"content-type": "image/webp", "upsert": "true"},
            )
            
            # Delete old image
            try:
                client.storage.from_(BUCKET_NAME).remove([filename])
            except Exception as remove_err:
                log_debug(f"Failed to remove old file {filename}: {remove_err}")
            
            new_url = client.storage.from_(BUCKET_NAME).get_public_url(new_filename)
            log_debug(f"Converted Supabase file: {filename} -> {new_filename}")
            return new_url
        except Exception as e:
            log_error(f"Failed to convert Supabase URL {url}: {e}")
            return url
            
    return url

async def main():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        logger.error("DATABASE_URL not found in environment.")
        return

    # Patch schema to asyncpg
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql+asyncpg://", 1)

    client = _get_client()
    
    logger.info("Connecting to database...")
    engine = create_async_engine(database_url, connect_args={"ssl": "require"})
    
    async with engine.begin() as conn:
        # 1. Migrate products table
        logger.info("Migrating products...")
        res = await conn.execute(text("SELECT id, image_url, media_urls FROM products;"))
        products = res.fetchall()
        for pid, img_url, media_urls in products:
            new_img_url = await process_image_url(img_url, client)
            new_media_urls = []
            
            # Check if media_urls is list/dict
            if isinstance(media_urls, list):
                for m in media_urls:
                    if isinstance(m, str):
                        new_media_urls.append(await process_image_url(m, client))
                    elif isinstance(m, dict) and "url" in m:
                        m_copy = m.copy()
                        if m.get("type", "image") == "image":
                            m_copy["url"] = await process_image_url(m["url"], client)
                        new_media_urls.append(m_copy)
                    else:
                        new_media_urls.append(m)
            else:
                new_media_urls = media_urls
                
            if new_img_url != img_url or new_media_urls != media_urls:
                import json
                await conn.execute(
                    text("UPDATE products SET image_url = :img, media_urls = :media WHERE id = :id;"),
                    {"img": new_img_url, "media": json.dumps(new_media_urls) if isinstance(new_media_urls, list) else new_media_urls, "id": pid}
                )
                logger.info(f"Updated product {pid} image references.")

        # 2. Migrate reviews table
        logger.info("Migrating product reviews...")
        res = await conn.execute(text("SELECT id, media_urls FROM product_reviews;"))
        reviews = res.fetchall()
        for rid, media_urls in reviews:
            new_media_urls = []
            if isinstance(media_urls, list):
                for m in media_urls:
                    if isinstance(m, str):
                        new_media_urls.append(await process_image_url(m, client))
                    elif isinstance(m, dict) and "url" in m:
                        m_copy = m.copy()
                        if m.get("type", "image") == "image":
                            m_copy["url"] = await process_image_url(m["url"], client)
                        new_media_urls.append(m_copy)
                    else:
                        new_media_urls.append(m)
            else:
                new_media_urls = media_urls
                
            if new_media_urls != media_urls:
                import json
                await conn.execute(
                    text("UPDATE product_reviews SET media_urls = :media WHERE id = :id;"),
                    {"media": json.dumps(new_media_urls) if isinstance(new_media_urls, list) else new_media_urls, "id": rid}
                )
                logger.info(f"Updated review {rid} media references.")

        # 3. Migrate settings table (e.g. logo, banner urls etc.)
        logger.info("Migrating settings...")
        res = await conn.execute(text("SELECT key, value FROM settings;"))
        settings = res.fetchall()
        for key, value in settings:
            if isinstance(value, dict):
                import json
                value_str = json.dumps(value)
                # Find all urls matching .png, .jpg, .jpeg, .avif
                import re
                urls = re.findall(r'https?://[^\s"\'}]+', value_str)
                new_value_str = value_str
                for u in urls:
                    if any(u.lower().endswith(ext) for ext in (".png", ".jpg", ".jpeg", ".avif")):
                        new_u = await process_image_url(u, client)
                        new_value_str = new_value_str.replace(u, new_u)
                if new_value_str != value_str:
                    await conn.execute(
                        text("UPDATE settings SET value = :val WHERE key = :key;"),
                        {"val": json.loads(new_value_str), "key": key}
                    )
                    logger.info(f"Updated settings {key} image references.")

    await engine.dispose()
    logger.info("Migration complete!")

if __name__ == "__main__":
    asyncio.run(main())
