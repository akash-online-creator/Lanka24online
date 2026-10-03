#!/usr/bin/env python3
import os
import re

print("Configuring Android scaffold, permissions, and 24/7 background service for Sahaya Seva...")

manifest_path = "android/app/src/main/AndroidManifest.xml"
if os.path.exists(manifest_path):
    with open(manifest_path, "r", encoding="utf-8") as f:
        content = f.read()

    permissions = """
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_SPECIAL_USE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    """

    if "<uses-permission" not in content:
        content = content.replace("<application", permissions + "\n    <application")

    # Add foreground service tag with stopWithTask=false so Android does not kill it on swipe-close
    service_tag = """
        <service
            android:name="com.pravera.flutter_foreground_task.service.ForegroundService"
            android:foregroundServiceType="location|dataSync|specialUse"
            android:stopWithTask="false"
            android:exported="false" />
    """

    if "com.pravera.flutter_foreground_task.service.ForegroundService" not in content:
        content = content.replace("</application>", service_tag + "\n    </application>")

    with open(manifest_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated AndroidManifest.xml with permissions and 24/7 foreground service tags.")

print("Preparation complete.")
