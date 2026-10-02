import os
import shutil

try:
    from PIL import Image
    has_pil = True
except ImportError:
    has_pil = False

def setup_branding():
    src_logo = "src/assets/images/sahana_sewa_logo_1785907235127.jpg"
    res_dir = "android/app/src/main/res"
    
    densities = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192
    }
    
    if os.path.exists(src_logo):
        for folder, size in densities.items():
            target_folder = os.path.join(res_dir, folder)
            os.makedirs(target_folder, exist_ok=True)
            target_file = os.path.join(target_folder, "ic_launcher.png")
            
            if has_pil:
                try:
                    img = Image.open(src_logo)
                    resized = img.resize((size, size), Image.Resampling.LANCZOS)
                    resized.save(target_file, "PNG")
                    print(f"Generated {target_file} ({size}x{size})")
                    continue
                except Exception as e:
                    print(f"PIL resize warning: {e}")
            
            # Fallback direct copy
            shutil.copyfile(src_logo, target_file)
            print(f"Copied icon to {target_file}")
            
    # Create strings.xml
    values_dir = os.path.join(res_dir, "values")
    os.makedirs(values_dir, exist_ok=True)
    strings_xml_path = os.path.join(values_dir, "strings.xml")
    with open(strings_xml_path, "w", encoding="utf-8") as f:
        f.write('''<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">සහය සේවා</string>
</resources>
''')
    print("Updated strings.xml with සහය සේවා")

if __name__ == "__main__":
    setup_branding()
