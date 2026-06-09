import os
import glob
import re
from PIL import Image
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import asyncio
from dotenv import load_dotenv

# Load database environment variables
load_dotenv()

async def migrate_database():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL not found in environment. Skipping DB migration.")
        return

    # Patch schema to asyncpg if necessary
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql+asyncpg://", 1)

    print("Connecting to database for URL migration...")
    try:
        engine = create_async_engine(database_url, connect_args={"ssl": "require"})
        async with engine.begin() as conn:
            # Update Products image_url
            print("Updating Product image URLs to .avif...")
            result = await conn.execute(text(
                "UPDATE products SET image_url = REPLACE(image_url, '.png', '.avif') WHERE image_url LIKE '%.png';"
            ))
            print(f"Products updated: {result.rowcount}")

            # Update order items image URLs
            print("Updating Order Items image URLs to .avif...")
            result = await conn.execute(text(
                "UPDATE orders SET items = regexp_replace(items::text, '\\.png', '.avif', 'g')::jsonb WHERE items::text LIKE '%.png%';"
            ))
            print(f"Orders updated: {result.rowcount}")
            
        await engine.dispose()
        print("Database URL migration complete.")
    except Exception as e:
        print(f"Database migration failed: {e}")

def convert_png_to_avif(directory):
    if not os.path.exists(directory):
        print(f"Directory {directory} does not exist. Skipping.")
        return

    print(f"Scanning {directory} for PNG files...")
    png_files = glob.glob(os.path.join(directory, "*.png"))
    for png_path in png_files:
        avif_path = os.path.splitext(png_path)[0] + ".avif"
        print(f"Converting {png_path} -> {avif_path}...")
        try:
            with Image.open(png_path) as img:
                img.save(avif_path, format="AVIF", quality=85)
            # Delete original PNG
            os.remove(png_path)
            print(f"Success! Deleted original PNG.")
        except Exception as e:
            print(f"Error converting {png_path}: {e}")

def replace_in_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Replace .png with .avif, but ignore standard third-party logos or libraries if needed,
        # but the request is "Convert all the images being used in this project to AVIF".
        # Let's replace any static local references like /logo-durga.webp -> /logo-durga.avif,
        # etc., except external links if they are external PNGs.
        # Let's replace any relative or absolute .png references.
        new_content = re.sub(r'([a-zA-Z0-9_\-\/]+)\.png', r'\1.avif', content)
        
        if new_content != content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated references in: {file_path}")
    except Exception as e:
        print(f"Error updating file {file_path}: {e}")

def replace_references_in_code():
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    frontend_src = os.path.join(project_root, "frontend", "src")
    backend_root = os.path.join(project_root, "backend")

    print("Replacing .png references in frontend source code...")
    for root, dirs, files in os.walk(frontend_src):
        for file in files:
            if file.endswith(('.jsx', '.js', '.css')):
                replace_in_file(os.path.join(root, file))

    print("Replacing .png references in backend python files...")
    for root, dirs, files in os.walk(backend_root):
        for file in files:
            if file.endswith('.py') and file != 'convert_images.py':
                replace_in_file(os.path.join(root, file))

async def main():
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    
    # 1. Convert public/ folder images
    frontend_public_dir = os.path.join(project_root, "frontend", "public")
    convert_png_to_avif(frontend_public_dir)

    # 2. Convert public/uploads folder images
    frontend_uploads_dir = os.path.join(project_root, "frontend", "public", "uploads")
    convert_png_to_avif(frontend_uploads_dir)

    # 3. Convert backend/uploads folder images
    backend_uploads_dir = os.path.join(project_root, "backend", "uploads")
    convert_png_to_avif(backend_uploads_dir)

    # 4. Replace references in .jsx, .js, .css, .py files
    replace_references_in_code()

    # 5. Run Database Migration
    await migrate_database()

if __name__ == "__main__":
    asyncio.run(main())
