import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Clock, 
  MapPin, 
  MessageSquare, 
  Flag, 
  Eye, 
  Phone, 
  User as UserIcon,
  RefreshCw,
  Search,
  Volume2,
  RotateCcw
} from 'lucide-react';
import { RedAlertItem, Language } from '../types';
import { getDisasterConfig } from '../data/redAlertData';
import { updateRedAlertStatus, deleteRedAlertInFirestore, subscribeToSirenSettings } from '../lib/firebase';
import { startEmergencySiren, stopEmergencySiren, unlockAudio, persistSirenSettings, getSirenFileName } from '../utils/sirenAudio';

// 🎵 Default Siren Audio File Path
import defaultSirenTone from '../assets/mixkit-manual-siren-fire-alert-1652.wav';

interface AdminRedAlertManagementProps {
  alerts?: RedAlertItem[];
  redAlerts?: RedAlertItem[];
  language?: Language;
  onRefreshAlerts?: () => void;
  onRefreshRedAlerts?: () => void;
  onViewAlertDetail?: (alert: RedAlertItem) => void;
  onViewDetail?: (alert: RedAlertItem) => void;
}

const DEFAULT_SIREN_NAME = 'Custom Fire Alert (WAV)';

export const AdminRedAlertManagement: React.FC<AdminRedAlertManagementProps> = ({
  alerts: propAlerts,
  redAlerts,
  language = 'si',
  onRefreshAlerts,
  onRefreshRedAlerts,
  onViewAlertDetail,
  onViewDetail,
}) => {
  const alerts = propAlerts || redAlerts || [];
  const handleRefresh = onRefreshAlerts || onRefreshRedAlerts;
  const handleViewDetail = onViewAlertDetail || onViewDetail;
  const [filter, setFilter] = useState<'all' | 'active' | 'flagged_fake' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [isPlayingSiren, setIsPlayingSiren] = useState(false);
  const [uploadedSirenFileName, setUploadedSirenFileName] = useState<string>(
    () => getSirenFileName() || DEFAULT_SIREN_NAME
  );

  useEffect(() => {
    // Cloud database එකෙන් Siren settings සින්ක් කිරීම
    const unsubscribe = subscribeToSirenSettings((settings) => {
      setUploadedSirenFileName(settings.fileName || DEFAULT_SIREN_NAME);
    });

    return () => {
      unsubscribe();
      stopEmergencySiren();
    };
  }, []);

  const handleToggleSiren = () => {
    unlockAudio();
    if (isPlayingSiren) {
      stopEmergencySiren();
      setIsPlayingSiren(false);
    } else {
      startEmergencySiren();
      setIsPlayingSiren(true);
    }
  };

  const filteredAlerts = (alerts || []).filter((alert) => {
    if (!alert) return false;
    if (filter === 'active' && alert.status !== 'active') return false;
    if (filter === 'flagged_fake' && (!alert.isFlaggedFake && (alert.fakeReports?.length || 0) === 0)) return false;
    if (filter === 'resolved' && alert.status !== 'resolved') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (alert.disasterTitleSi || '').toLowerCase().includes(q) || (alert.disasterTitleEn || '').toLowerCase().includes(q);
      const matchLoc = (alert.locationName || '').toLowerCase().includes(q);
      const matchCode = (alert.alertCode || '').toLowerCase().includes(q);
      return matchTitle || matchLoc || matchCode;
    }
    return true;
  });

  const handleUpdateStatus = async (
    alertId: string,
    status: 'active' | 'resolved' | 'false_alarm',
    note?: string
  ) => {
    setActionLoadingId(alertId);
    try {
      await updateRedAlertStatus(alertId, status, note);
      if (handleRefresh) handleRefresh();
    } catch (err) {
      console.error('Error updating alert status:', err);
      alert('තත්ත්වය යාවත්කාලීන කිරීමේදී දෝෂයක් ඇතිවිය.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (alertId: string) => {
    if (!confirm('මෙම ආපදා ඇඟවීම ස්ථිරවම මකා දැමීමට අවශ්‍යද?')) return;

    setActionLoadingId(alertId);
    try {
      await deleteRedAlertInFirestore(alertId);
      if (handleRefresh) handleRefresh();
    } catch (err) {
      console.error('Error deleting alert:', err);
      alert('මකා දැමීමේදී දෝෂයක් ඇතිවිය.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const totalActive = alerts.filter((a) => a.status === 'active').length;
  const totalFlagged = alerts.filter((a) => a.isFlaggedFake || (a.fakeReports?.length || 0) > 0).length;

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top Banner / Summary Cards */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white text-red-600 font-black text-2xl flex items-center justify-center shadow-md">
              🚨
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black tracking-wide">
                රතු එළිය (Red Alerts) - හදිසි ආපදා පරිපාලනය
              </h3>
              <p className="text-xs text-red-100 font-medium">
                දිවයින පුරා සහ ප්‍රාදේශීය හදිසි ආපදා විකාශන සහ අසත්‍ය තොරතුරු වාර්තා (Fake Alerts) කළමනාකරණය
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSiren}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                isPlayingSiren
                  ? 'bg-amber-300 text-slate-950 border-2 border-amber-500 animate-pulse'
                  : 'bg-white text-red-700 hover:bg-red-50'
              }`}
              title="Test Emergency Siren Alarm"
            >
              {isPlayingSiren ? (
                <>
                  <Volume2 className="w-4 h-4 text-red-600 animate-bounce" />
                  <span>Siren නවත්වන්න</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-red-600" />
                  <span>🔊 Siren පරීක්ෂා කරන්න</span>
                </>
              )}
            </button>

            {/* Admin Custom Siren Audio Upload Button */}
            <label 
              className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer border border-amber-300"
              title="Admin: Upload custom siren audio tone for all users"
            >
              <span>📁 Siren Tone Upload</span>
              <input 
                type="file" 
                accept="audio/*" 
                className="hidden" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = async (uploadEvent) => {
                      const dataUri = uploadEvent.target?.result as string;
                      if (dataUri) {
                        await persistSirenSettings(dataUri, file.name);
                        setUploadedSirenFileName(file.name);
                        alert(`✅ සාර්ථකයි! "${file.name}" Siren Tone එක Cloud Database හි ස්ථිරවම ගබඩා කරන ලදී.`);
                        startEmergencySiren();
                        setIsPlayingSiren(true);
                      }
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>

            {/* 🔄 Database එකේ පරණ Audio එක ඉවත් කිරීමේ Reset Button එක */}
            <button
              type="button"
              onClick={async () => {
                await persistSirenSettings(null, DEFAULT_SIREN_NAME);
                setUploadedSirenFileName(DEFAULT_SIREN_NAME);
                alert('✅ Cloud Database එකේ පරණ Audio Link එක සාර්ථකව ඉවත් කරන ලදී! දැන් ස්ථිරවම නව Default .wav ශබ්දය ක්‍රියාත්මක වේ.');
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-amber-300 font-black text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer border border-amber-400/50"
              title="Reset Database Siren Sound to Default WAV File"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>🔄 Reset Siren</span>
            </button>

            {handleRefresh && (
              <button
                type="button"
                onClick={handleRefresh}
                className="px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>යාවත්කාලීන කරන්න</span>
              </button>
            )}
          </div>
        </div>

        {/* Direct Audio URL Input Row */}
        <div className="pt-3 border-t border-red-500/50 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="url"
              placeholder="🔗 Direct MP3 / Audio Stream URL මෙහි අලවන්න..."
              id="telegram-audio-url-input"
              className="flex-1 min-w-[240px] px-3.5 py-2 rounded-xl bg-red-950/90 border border-amber-400/60 text-white placeholder-red-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner"
            />
            <button
              type="button"
              onClick={async () => {
                const inputEl = document.getElementById('telegram-audio-url-input') as HTMLInputElement;
                if (inputEl && inputEl.value.trim().length > 5) {
                  const url = inputEl.value.trim();
                  await persistSirenSettings(url, url);
                  setUploadedSirenFileName(url);
                  alert('✅ සාර්ථකයි! Audio URL එක Cloud Database හි ස්ථිරවම සුරකින ලදී.');
                  startEmergencySiren();
                  setIsPlayingSiren(true);
                  inputEl.value = '';
                } else {
                  alert('⚠️ කරුණාකර නිවැරදි Direct Audio / MP3 සබැඳියක් ඇතුළත් කරන්න.');
                }
              }}
              className="px-4 py-2 bg-cyan-400 hover:bg-cyan-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer whitespace-nowrap"
            >
              🔗 Direct Link Save කරන්න
            </button>
          </div>
        </div>

        {/* Display Active Siren Tone Name */}
        <div className="pt-2 border-t border-red-500/50 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-amber-200">
            <span className="p-1 rounded-lg bg-amber-400/20 text-amber-300">🎵</span>
            <span className="font-bold">දැනට සක්‍රීය Siren නාදය:</span>
            <span className="font-mono font-black text-white bg-red-950/80 px-2.5 py-1 rounded-xl border border-red-400/50 shadow-inner">
              {uploadedSirenFileName}
            </span>
          </div>
          <span className="text-[11px] text-emerald-200 font-semibold flex items-center gap-1">
            ✓ ක්‍රියාත්මකයි (Active)
          </span>
        </div>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
          <span className="text-[10px] uppercase font-bold text-slate-400">මුළු ඇඟවීම්</span>
          <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">{alerts.length}</div>
        </div>

        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40">
          <span className="text-[10px] uppercase font-bold text-red-500">ක්‍රියාකාරී ආපදා</span>
          <div className="text-2xl font-black text-red-600 dark:text-red-400 mt-1">{totalActive}</div>
        </div>

        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40">
          <span className="text-[10px] uppercase font-bold text-rose-500">අසත්‍ය බවට වාර්තා (Fake Reports)</span>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{totalFlagged}</div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40">
          <span className="text-[10px] uppercase font-bold text-emerald-500">නිරාකරණය වූ ආපදා</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {(alerts || []).filter((a) => a && a.status === 'resolved').length}
          </div>
        </div>
      </div>

    </div>
  );
};
