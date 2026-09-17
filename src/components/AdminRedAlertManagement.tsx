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
  Volume2
} from 'lucide-react';
import { RedAlertItem, Language } from '../types';
import { getDisasterConfig } from '../data/redAlertData';
import { updateRedAlertStatus, deleteRedAlertInFirestore } from '../lib/firebase';
import { startEmergencySiren, stopEmergencySiren, unlockAudio, setCustomSirenAudio } from '../utils/sirenAudio';

interface AdminRedAlertManagementProps {
  alerts: RedAlertItem[];
  language?: Language;
  onRefreshAlerts?: () => void;
  onViewAlertDetail?: (alert: RedAlertItem) => void;
}

export const AdminRedAlertManagement: React.FC<AdminRedAlertManagementProps> = ({
  alerts = [],
  language = 'si',
  onRefreshAlerts,
  onViewAlertDetail,
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'flagged_fake' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [isPlayingSiren, setIsPlayingSiren] = useState(false);
  const [uploadedSirenFileName, setUploadedSirenFileName] = useState<string | null>(() => {
    try {
      return localStorage.getItem('sahaya_siren_filename') || (localStorage.getItem('sahaya_custom_siren_audio') ? 'Uploaded Custom Audio Tone' : null);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    return () => {
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

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === 'active' && alert.status !== 'active') return false;
    if (filter === 'flagged_fake' && (!alert.isFlaggedFake && (alert.fakeReports?.length || 0) === 0)) return false;
    if (filter === 'resolved' && alert.status !== 'resolved') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = alert.disasterTitleSi.toLowerCase().includes(q) || alert.disasterTitleEn?.toLowerCase().includes(q);
      const matchLoc = alert.locationName.toLowerCase().includes(q);
      const matchCode = alert.alertCode.toLowerCase().includes(q);
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
      if (onRefreshAlerts) onRefreshAlerts();
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
      if (onRefreshAlerts) onRefreshAlerts();
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

          <div className="flex items-center gap-2">
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

            {/* 🎵 Admin Custom Siren Audio Upload Button */}
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
                    reader.onload = (uploadEvent) => {
                      const dataUri = uploadEvent.target?.result as string;
                      if (dataUri) {
                        setCustomSirenAudio(dataUri);
                        setUploadedSirenFileName(file.name);
                        try {
                          localStorage.setItem('sahaya_siren_filename', file.name);
                        } catch {}
                        alert(`✅ සාර්ථකයි! "${file.name}" Siren Tone එක පද්ධතියේ පෙරනිමි නාදය ලෙස ගබඩා කරන ලදී.`);
                        startEmergencySiren();
                        setIsPlayingSiren(true);
                      }
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>

            {onRefreshAlerts && (
              <button
                type="button"
                onClick={onRefreshAlerts}
                className="px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>යාවත්කාලීන කරන්න</span>
              </button>
            )}
          </div>
        </div>

        {/* 🔗 Telegram / Audio URL Direct Input Row */}
        <div className="pt-3 border-t border-red-500/50 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="url"
              placeholder="🔗 Direct MP3 / Audio Stream URL මෙහි අලවන්න (Direct Link)..."
              id="telegram-audio-url-input"
              className="flex-1 min-w-[240px] px-3.5 py-2 rounded-xl bg-red-950/90 border border-amber-400/60 text-white placeholder-red-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner"
            />
            <button
              type="button"
              onClick={() => {
                const inputEl = document.getElementById('telegram-audio-url-input') as HTMLInputElement;
                if (inputEl && inputEl.value.trim().length > 5) {
                  const url = inputEl.value.trim();
                  setCustomSirenAudio(url);
                  setUploadedSirenFileName(url);
                  try {
                    localStorage.setItem('sahaya_siren_filename', url);
                  } catch {}
                  alert('✅ සාර්ථකයි! Audio URL එක ස්ථිරවම සම්බන්ධ කරන ලදී.');
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
          <p className="text-[11px] text-red-200">
            * සටහන: <code className="bg-red-900 px-1 rounded">t.me/c/...</code> යනු වෙබ් පිටුවක් (Web page) මිස සෘජු ශබ්ද ගොනුවක් නොවන බැවින් බ්‍රව්සරයට එය වාදනය කළ නොහැක. කරුණාකර Direct MP3 ගොනු සබැඳියක් ලබා දෙන්න හෝ පහත වෘත්තීය නාද වලින් එකක් තෝරාගන්න:
          </p>

          {/* Preset Professional Siren Tones */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] text-amber-200 font-bold">⚡ වෘත්තීය Siren නාද තෝරන්න:</span>
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.removeItem('sahaya_custom_siren_audio');
                  localStorage.removeItem('sahaya_default_siren_audio');
                  localStorage.setItem('sahaya_siren_filename', 'Air Raid Siren (Preset)');
                } catch {}
                setUploadedSirenFileName('Air Raid Siren (Preset)');
                alert('✅ Air Raid Siren නාදය පෙරනිමිය ලෙස සාර්ථකව සක්‍රීය කරන ලදී!');
                startEmergencySiren();
                setIsPlayingSiren(true);
              }}
              className="px-2.5 py-1 bg-amber-300 hover:bg-amber-400 text-slate-950 font-bold text-[11px] rounded-lg shadow transition-all cursor-pointer"
            >
              🚨 Air Raid Siren
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.removeItem('sahaya_custom_siren_audio');
                  localStorage.removeItem('sahaya_default_siren_audio');
                  localStorage.setItem('sahaya_siren_filename', 'Police High-Pitch Siren (Preset)');
                } catch {}
                setUploadedSirenFileName('Police High-Pitch Siren (Preset)');
                alert('✅ Police Siren නාදය පෙරනිමිය ලෙස සාර්ථකව සක්‍රීය කරන ලදී!');
                startEmergencySiren();
                setIsPlayingSiren(true);
              }}
              className="px-2.5 py-1 bg-rose-400 hover:bg-rose-500 text-slate-950 font-bold text-[11px] rounded-lg shadow transition-all cursor-pointer"
            >
              🚓 Police Siren
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.removeItem('sahaya_custom_siren_audio');
                  localStorage.removeItem('sahaya_default_siren_audio');
                  localStorage.setItem('sahaya_siren_filename', 'Tsunami Disaster Warning (Preset)');
                } catch {}
                setUploadedSirenFileName('Tsunami Disaster Warning (Preset)');
                alert('✅ Tsunami Warning නාදය පෙරනිමිය ලෙස සාර්ථකව සක්‍රීය කරන ලදී!');
                startEmergencySiren();
                setIsPlayingSiren(true);
              }}
              className="px-2.5 py-1 bg-orange-400 hover:bg-orange-500 text-slate-950 font-bold text-[11px] rounded-lg shadow transition-all cursor-pointer"
            >
              🌊 Tsunami Alarm
            </button>
          </div>
        </div>

        {/* Display Uploaded File Name */}
        {uploadedSirenFileName && (
          <div className="pt-2 border-t border-red-500/50 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-amber-200">
              <span className="p-1 rounded-lg bg-amber-400/20 text-amber-300">🎵</span>
              <span className="font-bold">දැනට උඩුගත කර ඇති Siren නාදය:</span>
              <span className="font-mono font-black text-white bg-red-950/80 px-2.5 py-1 rounded-xl border border-red-400/50 shadow-inner">
                {uploadedSirenFileName}
              </span>
            </div>
            <span className="text-[11px] text-emerald-200 font-semibold flex items-center gap-1">
              ✓ ක්‍රියාත්මකයි (Active)
            </span>
          </div>
        )}
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
            {alerts.filter((a) => a.status === 'resolved').length}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300'
            }`}
          >
            සියල්ල ({alerts.length})
          </button>

          <button
            type="button"
            onClick={() => setFilter('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'active'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
            }`}
          >
            ක්‍රියාකාරී ({totalActive})
          </button>

          <button
            type="button"
            onClick={() => setFilter('flagged_fake')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'flagged_fake'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300'
            }`}
          >
            🚩 අසත්‍ය වාර්තා ({totalFlagged})
          </button>

          <button
            type="button"
            onClick={() => setFilter('resolved')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'resolved'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
            }`}
          >
            නිරාකරණය වූ ({alerts.filter((a) => a.status === 'resolved').length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="නගරය, ආපදා වර්ගය හෝ කේතය..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-black/30 text-xs font-medium"
          />
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
            ආපදා ඇඟවීම් කිසිවක් හමු නොවීය.
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const config = getDisasterConfig(alert.disasterType);
            const fakeCount = alert.fakeReports?.length || 0;
            const commentsCount = alert.comments?.length || 0;
            const isLoading = actionLoadingId === alert.id;

            return (
              <div
                key={alert.id}
                className={`p-4 sm:p-5 rounded-2xl border-2 transition-all space-y-3 ${
                  alert.status === 'false_alarm'
                    ? 'bg-zinc-50 dark:bg-zinc-950/40 border-zinc-300 dark:border-zinc-800 opacity-75'
                    : alert.isFlaggedFake || fakeCount > 0
                    ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-400 dark:border-rose-900'
                    : alert.status === 'resolved'
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-900'
                    : 'bg-white dark:bg-white/5 border-red-400/80 dark:border-red-900/60 shadow-md'
                }`}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{config.icon}</span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-black bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded text-slate-800 dark:text-slate-200">
                          {alert.alertCode}
                        </span>
                        {alert.status === 'false_alarm' ? (
                          <span className="px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-800 text-[10px] font-black uppercase">
                            🚫 අසත්‍ය පුවතකි (Hoax)
                          </span>
                        ) : alert.status === 'resolved' ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-black uppercase">
                            ✅ නිරාකරණය විය
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase animate-pulse">
                            🚨 ක්‍රියාකාරී ආපදාවකි
                          </span>
                        )}

                        {fakeCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase flex items-center gap-1">
                            <Flag className="w-3 h-3" />
                            <span>අසත්‍ය වාර්තා {fakeCount} ක් ලැබී ඇත!</span>
                          </span>
                        )}
                      </div>

                      <h4 className="text-base font-black text-slate-900 dark:text-white pt-1">
                        {alert.disasterTitleSi}
                      </h4>
                    </div>
                  </div>

                  <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1 justify-end font-bold text-slate-800 dark:text-slate-200">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{alert.incidentDate} - {alert.incidentTime}</span>
                    </div>
                    <div className="text-[11px] pt-0.5">
                      දැනුම්දුන්නේ: <strong className="text-slate-700 dark:text-slate-300">{alert.reportedByName}</strong>
                      {alert.reportedByPhone && ` (${alert.reportedByPhone})`}
                    </div>
                  </div>
                </div>

                {/* Location & Coordinates */}
                <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 bg-slate-100/80 dark:bg-black/30 p-2.5 rounded-xl">
                  <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                  <span className="font-black">{alert.locationName}</span>
                  <span className="font-mono text-slate-400 text-[11px]">
                    (Lat: {alert.latitude.toFixed(4)}, Lng: {alert.longitude.toFixed(4)})
                  </span>
                </div>

                {/* Description */}
                {alert.description && (
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-black/20 p-2.5 rounded-xl border border-slate-200/80 dark:border-white/5">
                    {alert.description}
                  </p>
                )}

                {/* Fake Reports Inspection (If reported by users) */}
                {fakeCount > 0 && (
                  <div className="p-3 rounded-xl bg-rose-100/70 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-900 space-y-2 text-xs">
                    <div className="font-black text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4" />
                      <span>පරිශීලකයින් විසින් ඉදිරිපත් කළ අසත්‍ය බවට වාර්තා ({fakeCount}):</span>
                    </div>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {alert.fakeReports?.map((rep) => (
                        <div
                          key={rep.id}
                          className="p-2 rounded-lg bg-white dark:bg-black/40 border border-rose-200 dark:border-rose-800/60 text-[11px]"
                        >
                          <div className="flex items-center justify-between font-bold text-rose-700 dark:text-rose-400">
                            <span>{rep.reason}</span>
                            <span className="text-[10px] text-slate-400">{rep.reportedAt?.split('T')[0]}</span>
                          </div>
                          {rep.additionalNotes && (
                            <p className="text-slate-600 dark:text-slate-300 pt-0.5">{rep.additionalNotes}</p>
                          )}
                          <div className="text-[10px] text-slate-400 pt-0.5">
                            වාර්තාකරු: {rep.userName} {rep.userPhone && `(${rep.userPhone})`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bottom Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-bold">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                      <span>අදහස් {commentsCount}</span>
                    </span>
                    {onViewAlertDetail && (
                      <button
                        type="button"
                        onClick={() => onViewAlertDetail(alert)}
                        className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                      >
                        (විස්තර / අදහස් බලන්න)
                      </button>
                    )}
                  </div>

                  {/* Admin Action Bar */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {alert.status !== 'active' && (
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleUpdateStatus(alert.id, 'active')}
                        className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all cursor-pointer"
                      >
                        ක්‍රියාකාරී කරන්න
                      </button>
                    )}

                    {alert.status !== 'false_alarm' && (
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleUpdateStatus(alert.id, 'false_alarm', 'Admin විසින් අසත්‍ය පුවතක් ලෙස තහවුරු කළේය')}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>අසත්‍ය පුවතක් (Hoax) ලෙස ලකුණු කරන්න</span>
                      </button>
                    )}

                    {alert.status !== 'resolved' && (
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleUpdateStatus(alert.id, 'resolved', 'ආපදා තත්ත්වය පාලනය කර ඇත')}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>නිරාකරණය වූ බව සටහන් කරන්න</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleDelete(alert.id)}
                      className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-rose-600 dark:text-rose-400 transition-all cursor-pointer"
                      title="Delete Alert"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
