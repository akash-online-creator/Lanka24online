#!/usr/bin/env python3
import os
import re
import sys

print("Configuring Android scaffold, manifest, gradle, and assets for Sahaya Seva 24/7...")

# 1. Update AndroidManifest.xml with Clean & Play-Store Compliant Permissions
manifest_path = "android/app/src/main/AndroidManifest.xml"
if os.path.exists(manifest_path):
    with open(manifest_path, "r", encoding="utf-8") as f:
        content = f.read()

    clean_permissions = """
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    <uses-permission android:name="android.permission.USE_FULL_SCREEN_INTENT" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
    <uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
    """

    if "<uses-permission" not in content:
        content = content.replace("<application", clean_permissions + "\n    <application")

    if 'android:usesCleartextTraffic="true"' not in content:
        content = content.replace('<application', '<application android:usesCleartextTraffic="true" android:hardwareAccelerated="true"')
    if 'android:showWhenLocked="true"' not in content:
        content = content.replace('<activity', '<activity android:showWhenLocked="true" android:turnScreenOn="true"')

    service_declaration = """
        <!-- Flutter Foreground Task Service with Location Type for Android 14+ -->
        <service 
            android:name="com.pravera.flutter_foreground_task.service.ForegroundService"
            android:foregroundServiceType="location"
            android:exported="false"
            android:stopWithTask="false" />
    """

    if "com.pravera.flutter_foreground_task.service.ForegroundService" not in content:
        content = content.replace("</application>", service_declaration + "\n    </application>")

    content = re.sub(r'android:label="[^"]*"', 'android:label="1+ සහය සේවා"', content)

    with open(manifest_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated AndroidManifest.xml with clean permissions, FGS location service & audio settings.")

# 1.1 Update strings.xml for App Display Name
strings_dir = "android/app/src/main/res/values"
os.makedirs(strings_dir, exist_ok=True)
with open(os.path.join(strings_dir, "strings.xml"), "w", encoding="utf-8") as f:
    f.write("""<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">1+ සහය සේවා</string>
    <string name="title_activity_main">1+ සහය සේවා</string>
</resources>
""")

# 2. Update android/app/build.gradle
gradle_path = "android/app/build.gradle"
if os.path.exists(gradle_path):
    with open(gradle_path, "r", encoding="utf-8") as f:
        g_content = f.read()

    if "multiDexEnabled" not in g_content:
        g_content = g_content.replace("defaultConfig {", "defaultConfig {\n        multiDexEnabled true")

    with open(gradle_path, "w", encoding="utf-8") as f:
        f.write(g_content)
    print("Updated android/app/build.gradle with multiDex.")

# 3. Ensure pubspec.yaml has all dependencies & asset configuration
pubspec_path = "pubspec.yaml"
pubspec_content = """name: sahayasewa_mobile
description: "සහය සේවා (Sahaya Seva) - 24/7 Mobile Disaster & Community Relief Network"
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.2.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  flutter_foreground_task: ^9.2.2
  geolocator: ^13.0.2
  permission_handler: ^11.3.1
  url_launcher: ^6.3.0
  webview_flutter: ^4.10.0
  webview_flutter_android: ^4.3.2

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0

flutter:
  uses-material-design: true
  assets:
    - assets/web/
    - assets/web/assets/
    - assets/web/index.html
    - assets/web/logo.jpg
    - assets/web/manifest.json
"""

with open(pubspec_path, "w", encoding="utf-8") as f:
    f.write(pubspec_content)
print("Ensured pubspec.yaml with assets/web/ bindings.")

import shutil
# 4. Copy build output from dist/ into assets/web/ (including assets/ folder with JS/CSS)
if os.path.exists("dist"):
    os.makedirs("assets/web", exist_ok=True)
    if os.path.exists("dist/assets"):
        os.makedirs("assets/web/assets", exist_ok=True)
        shutil.copytree("dist/assets", "assets/web/assets", dirs_exist_ok=True)
    for item in os.listdir("dist"):
        s = os.path.join("dist", item)
        d = os.path.join("assets/web", item)
        if os.path.isfile(s):
            shutil.copy2(s, d)
    print("Synced full dist directory into assets/web/ and assets/web/assets/")

# 5. Mirror assets/web into android/app/src/main/assets/web if directory exists
android_assets_dir = "android/app/src/main/assets/web"
if os.path.exists("android/app/src/main"):
    os.makedirs(android_assets_dir, exist_ok=True)
    if os.path.exists("assets/web/index.html"):
        with open("assets/web/index.html", "r", encoding="utf-8") as src_f:
            web_html = src_f.read()
        with open(os.path.join(android_assets_dir, "index.html"), "w", encoding="utf-8") as dst_f:
            dst_f.write(web_html)
        print("Mirrored assets/web/index.html to android/app/src/main/assets/web/index.html")

print("Preparation complete.")
