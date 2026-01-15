#!/usr/bin/env python3
import os

try:
    from PIL import Image
except ImportError:
    print("Installing required package: Pillow")
    os.system("pip install Pillow")
    from PIL import Image

print("Converting PNG to ICO format...")

png_file = "appicon.png"
ico_file = "windows/icon.ico"

if not os.path.exists(png_file):
    print(f"Error: {png_file} not found!")
    print("Please run generate_icon.py first.")
    exit(1)

img = Image.open(png_file)

print("Creating ICO with multiple sizes (256, 128, 64, 48, 32, 16)...")
img.save(
    ico_file,
    format='ICO',
    sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
)

print(f"\nSuccess! Icon saved to: {ico_file}")
print("\nRestart the application to see the new icon.")
