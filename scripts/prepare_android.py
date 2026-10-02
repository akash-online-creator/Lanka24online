import os
import shutil
import glob

try:
    from PIL import Image
    has_pil = True
except ImportError:
    has_pil = False

def setup_branding():
    src_logo = "src/assets/images/sahana_sewa_logo_1785907235127.jpg"
    res_dir = "android/app/src/main/res"
    
    # 1. Clean all existing launcher icons (XMLs, PNGs, foreground/background duplicates)
    if os.path.exists(res_dir):
        for root, dirs, files in os.walk(res_dir):
            for file in files:
                if file.startswith("ic_launcher"):
                    file_path = os.path.join(root, file)
                    try:
                        os.remove(file_path)
                        print(f"Removed conflicting icon resource: {file_path}")
                    except Exception as e:
                        print(f"Error removing {file_path}: {e}")

        # Remove anydpi directories if they only held ic_launcher.xml to prevent merger clash
        for anydpi_dir in glob.glob(os.path.join(res_dir, "mipmap-anydpi*")):
            try:
                shutil.rmtree(anydpi_dir)
                print(f"Removed anydpi directory: {anydpi_dir}")
            except Exception as e:
                print(f"Error removing {anydpi_dir}: {e}")

    # 2. Generate clean PNG launcher icons across all standard density buckets
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
            
    # 3. Create strings.xml
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

    # 4. Inject Android Permissions, Queries & App Config into AndroidManifest.xml
    manifest_path = "android/app/src/main/AndroidManifest.xml"
    if os.path.exists(manifest_path):
        manifest_content = '''<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <queries>
        <package android:name="com.whatsapp" />
        <package android:name="com.whatsapp.w4b" />
        <intent>
            <action android:name="android.intent.action.VIEW" />
            <data android:scheme="whatsapp" />
        </intent>
        <intent>
            <action android:name="android.intent.action.VIEW" />
            <data android:scheme="https" />
        </intent>
        <intent>
            <action android:name="android.intent.action.VIEW" />
            <data android:scheme="http" />
        </intent>
        <intent>
            <action android:name="android.intent.action.DIAL" />
            <data android:scheme="tel" />
        </intent>
        <intent>
            <action android:name="android.intent.action.SENDTO" />
            <data android:scheme="smsto" />
        </intent>
        <intent>
            <action android:name="android.intent.action.SENDTO" />
            <data android:scheme="mailto" />
        </intent>
    </queries>

    <application
        android:label="@string/app_name"
        android:name="${applicationName}"
        android:icon="@mipmap/ic_launcher"
        android:usesCleartextTraffic="true">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:theme="@style/LaunchTheme"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|smallestScreenSize|locale|layoutDirection|fontScale|screenLayout|density|uiMode"
            android:hardwareAccelerated="true"
            android:windowSoftInputMode="adjustResize">
            <meta-data
              android:name="io.flutter.embedding.android.NormalTheme"
              android:resource="@style/NormalTheme"
              />
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>
        <meta-data
            android:name="flutterEmbedding"
            android:value="2" />
    </application>
</manifest>
'''
        with open(manifest_path, "w", encoding="utf-8") as f:
            f.write(manifest_content)
        print("Updated AndroidManifest.xml with package queries, background permissions and app title")

if __name__ == "__main__":
    setup_branding()
