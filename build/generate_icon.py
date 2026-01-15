#!/usr/bin/env python3
import os

try:
    from PIL import Image, ImageDraw, ImageFont
    import math
except ImportError:
    print("Installing required package: Pillow")
    os.system("pip install Pillow")
    from PIL import Image, ImageDraw, ImageFont
    import math

def create_gradient_background(size):
    img = Image.new('RGB', (size, size))
    draw = ImageDraw.Draw(img)
    
    for y in range(size):
        for x in range(size):
            r1, g1, b1 = 102, 126, 234  # #667eea
            r2, g2, b2 = 118, 75, 162   # #764ba2
            
            ratio = (x + y) / (2 * size)
            r = int(r1 + (r2 - r1) * ratio)
            g = int(g1 + (g2 - g1) * ratio)
            b = int(b1 + (b2 - b1) * ratio)
            
            draw.point((x, y), fill=(r, g, b))
    
    return img

def draw_paper_plane(draw, size):
    scale = size / 512
    base_x, base_y = int(120 * scale), int(120 * scale)
    
    plane_points = [
        (int((30 + base_x) * scale), int((140 + base_y) * scale)),
        (int((260 + base_x) * scale), int((10 + base_y) * scale)),
        (int((260 + base_x) * scale), int((110 + base_y) * scale)),
        (int((100 + base_x) * scale), int((180 + base_y) * scale))
    ]
    draw.polygon(plane_points, fill=(255, 255, 255, 240))
    
    wing_points = [
        (int((30 + base_x) * scale), int((140 + base_y) * scale)),
        (int((100 + base_x) * scale), int((180 + base_y) * scale)),
        (int((80 + base_x) * scale), int((240 + base_y) * scale))
    ]
    draw.polygon(wing_points, fill=(255, 255, 255, 215))
    
    for i, (x1, y1, x2, y2, opacity) in enumerate([
        (10, 130, 60, 145, 128),
        (0, 150, 50, 155, 102),
        (5, 170, 45, 170, 77)
    ]):
        draw.line([
            (int((x1 + base_x) * scale), int((y1 + base_y) * scale)),
            (int((x2 + base_x) * scale), int((y2 + base_y) * scale))
        ], fill=(255, 255, 255, opacity), width=int(4 * scale))

def create_icon(size):
    img = create_gradient_background(size)
    
    overlay = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    draw_paper_plane(draw, size)
    
    try:
        font_size = int(48 * size / 512)
        font = ImageFont.truetype("consola.ttf", font_size)
    except:
        try:
            font = ImageFont.truetype("C:\\Windows\\Fonts\\consola.ttf", int(48 * size / 512))
        except:
            font = ImageFont.load_default()
    
    text = "</>"
    text_x = int(320 * size / 512)
    text_y = int(350 * size / 512)
    draw.text((text_x, text_y), text, fill=(255, 255, 255, 204), font=font)
    
    for cx, cy, r, opacity in [
        (380, 130, 12, 102),
        (420, 160, 8, 77),
        (140, 380, 10, 89)
    ]:
        cx_scaled = int(cx * size / 512)
        cy_scaled = int(cy * size / 512)
        r_scaled = int(r * size / 512)
        draw.ellipse([
            cx_scaled - r_scaled, cy_scaled - r_scaled,
            cx_scaled + r_scaled, cy_scaled + r_scaled
        ], fill=(255, 255, 255, opacity))
    
    img = img.convert('RGBA')
    img = Image.alpha_composite(img, overlay)
    
    mask = Image.new('L', (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    corner_radius = int(120 * size / 512)
    mask_draw.rounded_rectangle([0, 0, size, size], corner_radius, fill=255)
    
    output = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    output.paste(img, (0, 0), mask)
    
    return output

print("Generating PostGo icons...")

for size in [512, 256, 128, 64, 32]:
    print(f"Creating {size}x{size} icon...")
    icon = create_icon(size)
    icon.save(f"appicon-{size}.png", "PNG")
    
    if size == 512:
        icon.save("appicon.png", "PNG")

print("\nIcons generated successfully!")
print("Main icon saved as: appicon.png")
print("\nRestart the application to see the new icon.")
