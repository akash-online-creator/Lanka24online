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
  Sliders, 
  Radio, 
  ShieldCheck,
  Sparkles,
  Lock,
  X
} from 'lucide-react';
import { 
  getPickMeAlertSettings, 
  savePickMeAlertSettings, 
  PickMeAlertSettings, 
  previewPickMeSound, 
  stopPickMeAlert, 
  isPickMeAlertRinging,
  AlertKind
} from '../utils/backgroundAlertEngine';
import { 
  requestNotificationPermission, 
  getNotificationPermissionStatus,
  triggerBrowserNotification 
} from '../utils/notificationManager';
import { Language } from '../types';

interface PickMeAlertSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: Language;
}

export const PickMeAlertSettingsModal: React.FC<PickMeAlertSettingsModalProps> = ({
  isOpen,
  onClose,
  language = 'si',
}) => {
  const [settings, setSettings] = useState<PickMeAlertSettings>(getPickMeAlertSettings);
  const [playingKind, setPlayingKind] = useState<AlertKind | null>(null);
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

  const handleToggleSoundType = (key: keyof PickMeAlertSettings['soundTypes']) => {
    const updated = {
      ...settings,
      soundTypes: {
        ...settings.soundTypes,
        [key]: !settings.soundTypes[key],
      },
    };
    setSettings(updated);
    savePickMeAlertSettings(updated);
  };

  const handleVolumeChange = (vol: number) => {
    const updated = { ...settings, volume: vol };
    setSettings(updated);
    savePickMeAlertSettings(updated);
  };

  const handleDurationChange = (dur: number) => {
    const updated = { ...settings, repeatDurationSeconds: dur };
    setSettings(updated);
    savePickMeAlertSettings(updated);
  };

  const handleTestSound = async (kind: AlertKind) => {
    if (playingKind === kind) {
      stopPickMeAlert();
      setPlayingKind(null);
      return;
    }
    setPlayingKind(kind);
    await previewPickMeSound(kind);
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
                <span>PickMe පන්නයේ Background Alerts & හඬ පාලනය</span>
              </h3>
              <p className="text-xs font-semibold text-emerald-100">
                ඇප් එක Close කළද හදිසි පණිවිඩ ශ්‍රව්‍ය නාද (Ringtone) සමඟ ලැබීම
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
                  <span>Browser Notification අවසරය ලබා දී නැත</span>
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
                PickMe මෙන් Screen එක Lock කර ඇති විට හෝ වෙනත් Tab එකක සිටියදී දැනුම්දීම් ලැබීමට බ්‍රවුසරයේ Notification අවසරය අවශ්‍ය වේ.
              </p>
            </div>
          )}

          {/* 1. Main Background Alert Switch */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-[#0c1f15] border border-slate-200 dark:border-emerald-950">
            <div className="space-y-0.5">
              <div className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>පසුබිම් හඬ හා දැනුම්දීම් (Background Sound)</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ඇප් එකෙන් ඉවත් වූ විටද Ringtone නාද වන පරිදි සක්‍රීය කරන්න
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

          {/* 2. Sound Channels & Individual Test Buttons */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-black uppercase text-slate-500 dark:text-emerald-400 tracking-wider flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5" />
              <span>ශ්‍රව්‍ය නාද නාලිකා සහ පරීක්ෂණ (Sound Channels & Audio Test)</span>
            </h4>

            {/* Quick Service Sound */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0c1f15] border border-slate-200 dark:border-emerald-900/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black shrink-0">
                  <Zap className="w-4 h-4 fill-emerald-500" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                    1. ඉක්මන් සේවා පණිවිඩ නාදය (Quick Service)
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    PickMe Taxi / Order Alert ආකාරයේ නැවුම් නාදය
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleTestSound('quick_service')}
                  className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95 ${
                    playingKind === 'quick_service'
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {playingKind === 'quick_service' ? <Square className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                  <span>{playingKind === 'quick_service' ? 'නවත්වන්න' : 'හඬ අසන්න'}</span>
                </button>
              </div>
            </div>

            {/* Red Alert Siren Sound */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0c1f15] border border-slate-200 dark:border-emerald-900/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center font-black shrink-0">
                  <AlertTriangle className="w-4 h-4 fill-rose-500" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                    2. රතු එළිය ආපදා සිරන් නාදය (Red Alert Siren)
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    හදිසි ආපදා, ගංවතුර, නායයෑම් අනතුරු සිරන් හඬ
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleTestSound('red_alert')}
                  className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95 ${
                    playingKind === 'red_alert'
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-rose-600 hover:bg-rose-500 text-white'
                  }`}
                >
                  {playingKind === 'red_alert' ? <Square className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                  <span>{playingKind === 'red_alert' ? 'නවත්වන්න' : 'හඬ අසන්න'}</span>
                </button>
              </div>
            </div>

            {/* Blood Request Urgent Tone */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0c1f15] border border-slate-200 dark:border-emerald-900/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center font-black shrink-0">
                  <Droplets className="w-4 h-4 fill-red-500" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                    3. හදිසි ලේ ඉල්ලීම් නාදය (Emergency Blood)
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    රෝහල් රුධිර අවශ්‍යතා සඳහා හදිසි වෛද්‍ය නාදය
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleTestSound('emergency_blood')}
                  className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95 ${
                    playingKind === 'emergency_blood'
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-red-600 hover:bg-red-500 text-white'
                  }`}
                >
                  {playingKind === 'emergency_blood' ? <Square className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                  <span>{playingKind === 'emergency_blood' ? 'නවත්වන්න' : 'හඬ අසන්න'}</span>
                </button>
              </div>
            </div>

            {/* Disaster Relief Tone */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0c1f15] border border-slate-200 dark:border-emerald-900/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black shrink-0">
                  <Package className="w-4 h-4 fill-amber-500" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                    4. ආපදා සහන දැන්වීම් නාදය (Disaster Relief)
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    ආහාර, ජලය සහ නවාතැන් සහන ඉල්ලීම් නාදය
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleTestSound('disaster_relief')}
                  className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95 ${
                    playingKind === 'disaster_relief'
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-amber-600 hover:bg-amber-500 text-white'
                  }`}
                >
                  {playingKind === 'disaster_relief' ? <Square className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                  <span>{playingKind === 'disaster_relief' ? 'නවත්වන්න' : 'හඬ අසන්න'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3. Volume & Duration Controls */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0c1f15] border border-slate-200 dark:border-emerald-950 space-y-4">
            {/* Volume */}
            <div className="space-y-1.5">
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

            {/* Repeat Duration */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-extrabold text-slate-900 dark:text-white">
                <span>නාද වන කාලය (Ringtone Duration)</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  {settings.repeatDurationSeconds} තත්පර
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[15, 30, 45, 60].map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => handleDurationChange(dur)}
                    className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      settings.repeatDurationSeconds === dur
                        ? 'bg-[#007a4b] text-white shadow-md'
                        : 'bg-slate-200 dark:bg-[#153423] text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                    }`}
                  >
                    {dur}s
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 dark:bg-[#0b2417] border-t border-slate-200 dark:border-emerald-900/60 flex items-center justify-between">
          <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>සැකසුම් ස්වයංක්‍රීයව සුරැකේ</span>
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
