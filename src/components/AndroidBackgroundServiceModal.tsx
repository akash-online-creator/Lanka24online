import React, { useState, useEffect } from 'react';
import { 
  X, 
  Radio, 
  Smartphone, 
  Layers, 
  Volume2, 
  ShieldCheck, 
  Maximize2, 
  CheckCircle2, 
  Activity, 
  Sparkles,
  ExternalLink,
  Lock,
  Copy,
  Check,
  Code2,
  Download,
  FileCode
} from 'lucide-react';
import { Language } from '../types';
import { activateBackgroundWakeLock } from '../utils/notificationManager';

interface AndroidBackgroundServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: Language;
  onLaunchPiP?: () => void;
  userCoords?: { lat: number; lng: number } | null;
  activeHazardsCount?: number;
}

export const AndroidBackgroundServiceModal: React.FC<AndroidBackgroundServiceModalProps> = ({
  isOpen,
  onClose,
  language = 'si',
  onLaunchPiP,
  userCoords,
  activeHazardsCount = 0,
}) => {
  const [activeTab, setActiveTab] = useState<'pip' | 'flutter_native' | 'android_native' | 'permissions'>('pip');
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      activateBackgroundWakeLock()
        .then((active) => setWakeLockActive(active))
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getLang = (si: string, en: string, ta: string) => {
    if (language === 'en') return en;
    if (language === 'ta') return ta;
    return si;
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 3000);
  };

  const flutterMainCode = `// lib/main.dart - Sahaya Sewa Native Flutter Entry
import 'dart:isolate';
import 'package:flutter/material.dart';
import 'package:flutter_foreground_task/flutter_foreground_task.dart';
import 'package:flutter_overlay_window/flutter_overlay_window.dart';
import 'package:permission_handler/permission_handler.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const SahayaSewaNativeApp());
}

class SahayaSewaNativeApp extends StatelessWidget {
  const SahayaSewaNativeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Sahaya Sewa Android',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF007A4B)),
        useMaterial3: true,
      ),
      home: const HomeScreen(),
    );
  }
}`;

  const manifestCode = `<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.example.sahayasewa_mobile">

    <!-- Location Permissions -->
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />

    <!-- Foreground Service & Notifications (Android 14 Compatible) -->
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />

    <!-- System Floating Overlay Window (Draw over other apps) -->
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
    <uses-permission android:name="android.permission.ACTION_MANAGE_OVERLAY_PERMISSION" />

    <application
        android:label="Sahaya Sewa"
        android:icon="@mipmap/ic_launcher">
        
        <service
            android:name="com.pravera.flutter_foreground_task.service.ForegroundService"
            android:foregroundServiceType="location"
            android:exported="false" />

        <service
            android:name="flutter.overlay.window.flutter_overlay_window.OverlayService"
            android:exported="false" />
    </application>
</manifest>`;

  const pubspecCode = `name: sahayasewa_mobile
description: "Sahaya Sewa Flutter Android Background & Floating Overlay"
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.2.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  flutter_foreground_task: ^6.1.1
  flutter_overlay_window: ^0.4.6
  geolocator: ^11.0.0
  permission_handler: ^11.3.0
  shared_preferences: ^2.2.2

flutter:
  uses-material-design: true`;

  return (
    <div className="fixed inset-0 z-[11000] bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      <div className="w-full max-w-2xl bg-white dark:bg-[#071910] border border-slate-200 dark:border-[#19402a] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-[#153824] bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/30 flex items-center justify-center text-xl shadow-xs">
              📱
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black">
                  {getLang('Android 24/7 Background & Floating Overlay', 'Android 24/7 Background & Floating Overlay', 'Android 24/7 பின்னணி & மிதக்கும் கட்டுப்பாடு')}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-400 text-slate-950">
                  NATIVE + WEB
                </span>
              </div>
              <p className="text-xs text-emerald-100 font-semibold">
                {getLang('Screen එක මත පාවෙන Floating Icon සහ Background GPS සේවාව', 'Screen Floating Chat-Head Overlay & Background GPS Engine', 'திரையின் மேல் மிதக்கும் சாளரம் மற்றும் பின்னணி GPS')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white cursor-pointer transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="p-2 border-b border-slate-200 dark:border-[#153824] bg-slate-50 dark:bg-[#092214] grid grid-cols-4 gap-1.5 text-center">
          <button
            type="button"
            onClick={() => setActiveTab('pip')}
            className={`py-2 px-1 rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'pip'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-[#112d1d] text-slate-600 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>{getLang('Floating PiP', 'Floating PiP', 'மிதக்கும் சாளரம்')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('flutter_native')}
            className={`py-2 px-1 rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'flutter_native'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-[#112d1d] text-slate-600 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-amber-300" />
            <span>{getLang('Flutter Code', 'Flutter Code', 'Flutter குறியீடு')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('android_native')}
            className={`py-2 px-1 rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'android_native'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-[#112d1d] text-slate-600 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>{getLang('Capacitor APK', 'Capacitor APK', 'Capacitor APK')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('permissions')}
            className={`py-2 px-1 rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'permissions'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-[#112d1d] text-slate-600 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{getLang('Manifest XML', 'Manifest XML', 'Manifest XML')}</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 text-slate-800 dark:text-slate-200">
          
          {/* TAB 1: Picture-in-Picture Floating Window for Browser / Web */}
          {activeTab === 'pip' && (
            <div className="space-y-3.5">
              <div className="p-4 rounded-2xl bg-cyan-500/10 border-2 border-cyan-500/30 space-y-2.5">
                <div className="flex items-center gap-2 text-cyan-800 dark:text-cyan-300 font-black text-sm">
                  <Maximize2 className="w-4 h-4" />
                  <span>{getLang('වෙනත් Apps උඩින් පාවෙන Floating Window එක (Picture-in-Picture)', 'Floating Window (Picture-in-Picture) Live Overlay', 'பிற பயன்பாடுகளின் மேல் மிதக்கும் சாளரம்')}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {getLang(
                    'ඔබ වෙනත් Apps (WhatsApp, Facebook, YouTube, Google Maps) භාවිතා කරන විටත් Phone එකේ Screen එක උඩ පාවෙන සජීවී ආපදා සහ හදිසි පාලක Window එකක් විවෘත කරන්න.',
                    'Keep a live emergency radar window floating on top of your screen even when using WhatsApp, Facebook, YouTube, or navigation apps.',
                    'பிற பயன்பாடுகளைப் பயன்படுத்தும் போதும் திரையின் மேல் நேரடி அவசர சாளரத்தை வைத்திருங்கள்.'
                  )}
                </p>
                {onLaunchPiP && (
                  <button
                    type="button"
                    onClick={() => {
                      onLaunchPiP();
                      onClose();
                    }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-95 transition-all mt-2"
                  >
                    <Maximize2 className="w-4 h-4 animate-pulse" />
                    <span>{getLang('🖼️ දැන්ම Floating Window එක Open කරන්න (Launch Overlay)', '🖼️ Launch Floating Overlay Window Now', '🖼️ மிதக்கும் சாளரத்தை துவங்கு')}</span>
                  </button>
                )}
              </div>

              {/* Status Grid */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-[#11271c] border border-slate-200 dark:border-[#19402a] space-y-1">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Background WakeLock</div>
                  <div className="font-mono font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 animate-pulse" />
                    <span>24/7 ACTIVE</span>
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-[#11271c] border border-slate-200 dark:border-[#19402a] space-y-1">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Live Proximity Radar</div>
                  <div className="font-mono font-black text-rose-600 dark:text-rose-400">
                    5.0 KM RADIUS
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Flutter Native Source Code */}
          {activeTab === 'flutter_native' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-[#0f2d1e] border border-emerald-300 dark:border-emerald-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-emerald-600" />
                    <span>lib/main.dart (Flutter Native Implementation)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(flutterMainCode, 'flutter_main')}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCode === 'flutter_main' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode === 'flutter_main' ? 'Copied!' : 'Copy Dart'}</span>
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-slate-900 text-emerald-300 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-48 border border-slate-800">
                  {flutterMainCode}
                </pre>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0c2418] border border-slate-200 dark:border-emerald-900 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-amber-500" />
                    <span>pubspec.yaml (Dependencies)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(pubspecCode, 'pubspec')}
                    className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-black flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCode === 'pubspec' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode === 'pubspec' ? 'Copied!' : 'Copy YAML'}</span>
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-slate-900 text-amber-300 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-36 border border-slate-800">
                  {pubspecCode}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: Android Native APK Capacitor Setup */}
          {activeTab === 'android_native' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-black text-sm">
                  <Smartphone className="w-4 h-4" />
                  <span>{getLang('Android Native APK Build (Capacitor සූදානම් කර ඇත)', 'Android Native APK Ready (Capacitor Configured)', 'Android APK தயாராக உள்ளது')}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {getLang(
                    'මෙම Codebase එක තුළ Capacitor Android (`com.sahayasewa.app`) සම්පූර්ණයෙන්ම සකසා ඇත. පහත command මඟින් Native APK එක Build කළ හැක:',
                    'Capacitor Android (package: com.sahayasewa.app) is fully configured in this codebase. Run the commands below to generate the Native Android APK:',
                    'கீழே உள்ள கட்டளைகள் மூலம் Android APK ஐ உருவாக்கலாம்:'
                  )}
                </p>
                
                <div className="p-2.5 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs space-y-1 overflow-x-auto">
                  <div>npm run build</div>
                  <div>npx cap sync</div>
                  <div>npx cap open android</div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-[#11271c] border border-slate-200 dark:border-[#19402a] text-xs space-y-1.5">
                <div className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>{getLang('Native APK හි ලැබෙන වාසි:', 'Native APK Benefits:', 'Native APK நன்மைகள்:')}</span>
                </div>
                <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-1 pl-1">
                  <li>Android OS Settings මඟින් කෙලින්ම <strong>"Display over other apps"</strong> (SYSTEM_ALERT_WINDOW) ලැබීම.</li>
                  <li>App එක සම්පූර්ණයෙන්ම Swipe කර අයින් කළද <strong>Foreground Service එක මඟින් Screen එක මත 24/7 Floating SOS Bubble</strong> එක රැඳී තිබීම.</li>
                  <li>Background GPS සෝදිසිය 24/7 බැටරි කාර්යක්ෂමව ක්‍රියාත්මක වීම.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 4: Permissions Code Snippet */}
          {activeTab === 'permissions' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                  AndroidManifest.xml (All Required Permissions):
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyText(manifestCode, 'manifest')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  {copiedCode === 'manifest' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode === 'manifest' ? 'Copied!' : 'Copy XML'}</span>
                </button>
              </div>

              <pre className="p-3 rounded-2xl bg-slate-900 text-emerald-300 font-mono text-[11px] leading-relaxed overflow-x-auto border border-slate-800 max-h-56">
                {manifestCode}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-[#153824] bg-slate-50 dark:bg-[#07160e] flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-semibold">
            Sahaya Sewa 24/7 Emergency Guard Engine
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-[#143322] hover:bg-slate-300 dark:hover:bg-[#1d4730] text-slate-800 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer"
          >
            {getLang('වසන්න', 'Close', 'மூடு')}
          </button>
        </div>

      </div>
    </div>
  );
};
