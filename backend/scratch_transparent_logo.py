from PIL import Image

def make_background_transparent(image_path, threshold=20):
    img = Image.open(image_path).convert("RGBA")
    datas = img.getdata()
    
    new_data = []
    for item in datas:
        # Check if the pixel is close to black
        if item[0] < threshold and item[1] < threshold and item[2] < threshold:
            # Set alpha to 0 (transparent)
            new_data.append((0, 0, 0, 0))
        else:
            # Keep original pixel
            new_data.append(item)
            
    img.putdata(new_data)
    img.save(image_path, "PNG", quality=100)
    print(f"Successfully made background of {image_path} transparent.")

if __name__ == "__main__":
    make_background_transparent("frontend/public/logo-durga.webp")
