import os
import glob
import re
from PIL import Image
try:
    import pillow_avif
except ImportError:
    pass

def convert_avif_to_webp(image_path):
    webp_path = os.path.splitext(image_path)[0] + ".webp"
    print(f"Converting AVIF asset: {image_path} -> {webp_path}...")
    try:
        with Image.open(image_path) as img:
            if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
                pass
            else:
                img = img.convert("RGB")
            # Save as WebP with good quality but optimized size
            img.save(webp_path, format="WEBP", quality=82)
        os.remove(image_path)
        print(f"Success! Deleted original AVIF: {image_path}")
    except Exception as e:
        print(f"Error converting {image_path}: {e}")

def replace_in_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Replace .avif with .webp
        new_content = re.sub(r'([a-zA-Z0-9_\-\/]+)\.avif', r'\1.webp', content)
        
        if new_content != content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated references in: {file_path}")
    except Exception as e:
        print(f"Error updating file {file_path}: {e}")

def main():
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    
    # 1. Convert public/ folder AVIF images
    frontend_public_dir = os.path.join(project_root, "frontend", "public")
    for root, dirs, files in os.walk(frontend_public_dir):
        for file in files:
            if file.lower().endswith('.avif'):
                convert_avif_to_webp(os.path.join(root, file))

    # 2. Replace references in .jsx, .js, .css, .py files
    print("Replacing .avif references in frontend code...")
    frontend_src_dir = os.path.join(project_root, "frontend", "src")
    for root, dirs, files in os.walk(frontend_src_dir):
        for file in files:
            if file.endswith(('.jsx', '.js', '.css')):
                replace_in_file(os.path.join(root, file))

    print("Replacing .avif references in backend code...")
    backend_dir = os.path.join(project_root, "backend")
    for root, dirs, files in os.walk(backend_dir):
        for file in files:
            if file.endswith('.py') and file not in ('convert_avif_to_webp.py', 'convert_existing_to_webp.py', 'convert_local_assets_to_webp.py', 'convert_images.py'):
                replace_in_file(os.path.join(root, file))

if __name__ == "__main__":
    main()
