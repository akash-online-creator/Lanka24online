import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Volume2, 
  VolumeX, 
  Zap, 
  AlertTriangle, 
  Droplets, 
  Package, 
  Play, 
  Square, 
  CheckCircle2, 
  Smartphone, 
  Radio, 
  ShieldCheck,
  Sparkles,
  X
} from 'lucide-react';
import { 
  getPickMeAlertSettings, 
  savePickMeAlertSettings, 
  BackgroundAlertSettings, 
  previewPickMeSound, 
  stopPickMeAlert, 
  AlertKind
} from '../utils/backgroundAlertEngine';
import { 
  requestNotificationPermission, 
  getNotificationPermissionStatus 
} from '../utils/notificationManager';
import { Language } from '../types';

interface PickMeAlertSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: Language;
  currentUser?: any;
  onUpdateUser?: (updatedUser: any) => void;
  theme?: any;
}

export const PickMeAlertSettingsModal: React.FC<PickMeAlertSettingsModalProps> = ({
  isOpen,
  onClose,
  language = 'si',
}) => {
  const [settings, setSettings] = useState<BackgroundAlertSettings>(getPickMeAlertSettings);
  const [playingKind, setPlayingKind] = useState<string | null>(null);
  const [permStatus, setPermStatus] = useState<'granted' | 'denied' | 'default' | 'unsupported'>('default');

  useEffect(() => {
    if (isOpen) {
      setSettings(getPickMeAlertSettings());
      setPermStatus(getNotificationPermissionStatus());
    } else {
      stopPickMeAlert();
      setPlayingKind(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleBackground = (enabled: boolean) => {
    const updated = { ...settings, backgroundAlertsEnabled: enabled };
    setSettings(updated);
    savePickMeAlertSettings(updated);
  };

  const handleVolumeChange = (vol: number) => {
    const updated = { ...settings, volume: vol };
    setSettings(updated);
    savePickMeAlertSettings(updated);
  };

  const handleTestGentleChime = async () => {
    if (playingKind === 'chime') {
      stopPickMeAlert();
      setPlayingKind(null);
      return;
    }
    setPlayingKind('chime');
    await previewPickMeSound('general' as AlertKind);
    setPlayingKind(null);
  };

  const handleEnablePermission = async () => {
    const granted = await requestNotificationPermission();
    setPermStatus(granted ? 'granted' : Notification.permission);
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-xl bg-white dark:bg-[#07150e] border-2 border-emerald-500/80 dark:border-emerald-600/60 rounded-3xl shadow-2xl overflow-hidden relative my-6 flex flex-col text-slate-900 dark:text-slate-100 max-h-[92vh]">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-[#007a4b] p-4 sm:p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center font-black shadow-md">
              <Radio className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>24/7 පසුබිම් දැනුම්දීම් සහ අනතුරු ඇඟවීම් (24/7 Background Sync)</span>
              </h3>
              <p className="text-xs font-semibold text-emerald-100">
                ඇප් එක Background එකේ හෝ Screen එක Lock කළද ක්ෂණිකව දැනුම්දීම් ලැබීම
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center font-black text-sm transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-left text-sm flex-1">
          
          {/* Permission Status Banner if not granted */}
          {permStatus !== 'granted' && (
            <div className="p-3.5 rounded-2xl bg-amber-500/15 border-2 border-amber-400 dark:border-amber-500/40 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-extrabold text-amber-900 dark:text-amber-300">
                  <Bell className="w-4 h-4" />
                  <span>Browser Notification අවසරය සක්‍රීය කරන්න</span>
                </div>
                <button
                  type="button"
                  onClick={handleEnablePermission}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md cursor-pointer active:scale-95"
                >
                  අවසර දෙන්න (Allow)
                </button>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                ඇප් එක Off කර හෝ වෙනත් වැඩක සිටියදී හදිසි අනතුරු ඇඟවීම් (Red Alerts) සහ පණිවිඩ ලැබීමට Browser Notification අවසරය අවශ්‍ය වේ.
              </p>
            </div>
          )}

          {/* 1. Main Background Sync Switch */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-[#0c1f15] border border-slate-200 dark:border-emerald-950">
            <div className="space-y-0.5">
              <div className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>24/7 පසුබිම් සේවාව (24/7 Background Sync & Push)</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Service Worker සහ Web Push මඟින් පැය 24 පුරාම සක්‍රීයව පවතී
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleToggleBackground(!settings.backgroundAlertsEnabled)}
              className={`w-13 h-7 rounded-full transition-colors relative cursor-pointer p-0.5 ${
                settings.backgroundAlertsEnabled ? 'bg-[#007a4b]' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${
                  settings.backgroundAlertsEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 2. Notification Chime & Sound */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-black uppercase text-slate-500 dark:text-emerald-400 tracking-wider flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5" />
              <span>ශ්‍රව්‍ය නාද පරීක්ෂාව (Notification Chime Preview)</span>
            </h4>

            {/* Gentle Message Chime */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0c1f15] border border-slate-200 dark:border-emerald-900/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black shrink-0">
                  <Zap className="w-4 h-4 fill-emerald-500" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                    මෘදු පණිවිඩ නාදය (Gentle Notification Chime)
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    සාමාන්‍ය සහය ඉල්ලීම් සහ පණිවිඩ සඳහා නිකුත් වන සුමට නාදය
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleTestGentleChime}
                  className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95 ${
                    playingKind === 'chime'
                      ? 'bg-emerald-700 text-white animate-pulse'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {playingKind === 'chime' ? <Square className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                  <span>{playingKind === 'chime' ? 'නවත්වන්න' : 'පණිවිඩ හඬ'}</span>
                </button>
              </div>
            </div>

          </div>

          {/* 3. Volume Control */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0c1f15] border border-slate-200 dark:border-emerald-950 space-y-2">
            <div className="flex items-center justify-between text-xs font-extrabold text-slate-900 dark:text-white">
              <span className="flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>ශබ්ද ප්‍රමාණය (Alert Volume)</span>
              </span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">
                {Math.round(settings.volume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={settings.volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#007a4b]"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 dark:bg-[#0b2417] border-t border-slate-200 dark:border-emerald-900/60 flex items-center justify-between">
          <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>24/7 පසුබිම් සේවාව සක්‍රීයයි</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#007a4b] hover:bg-[#00603b] text-white font-black text-xs shadow-md active:scale-95 transition-all cursor-pointer"
          >
            හරි (Done)
          </button>
        </div>

      </div>
    </div>
  );
};
