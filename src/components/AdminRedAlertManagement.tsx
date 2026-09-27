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
  RotateCcw,
  CheckCircle,
  FileText
} from 'lucide-react';
import { RedAlertItem, Language } from '../types';
import { getDisasterConfig } from '../data/redAlertData';
import { updateRedAlertStatus, deleteRedAlertInFirestore, subscribeToSirenSettings } from '../lib/firebase';
import { startEmergencySiren, stopEmergencySiren, unlockAudio, persistSirenSettings, getSirenFileName } from '../utils/sirenAudio';
import { addDeletedRedAlertId, filterNonDeletedRedAlerts } from '../utils/deletedPostsManager';

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
  const rawAlerts = propAlerts || redAlerts || [];
  const alerts = filterNonDeletedRedAlerts(rawAlerts);
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
      const matchReporter = (alert.reportedByName || '').toLowerCase().includes(q) || (alert.reportedByPhone || '').toLowerCase().includes(q);
      return matchTitle || matchLoc || matchCode || matchReporter;
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
    addDeletedRedAlertId(alertId);
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

      {/* Search and Filters Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#071910] border-2 border-slate-200 dark:border-emerald-900/50 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Sub Tab Filter Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900/80 rounded-xl flex-wrap">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              සියල්ල ({alerts.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === 'active'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              🚨 සක්‍රීය ආපදා ({totalActive})
            </button>
            <button
              type="button"
              onClick={() => setFilter('flagged_fake')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === 'flagged_fake'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              ⚠️ අසත්‍ය බවට වාර්තා ({totalFlagged})
            </button>
            <button
              type="button"
              onClick={() => setFilter('resolved')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === 'resolved'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              ✅ විසඳුණු ආපදා ({(alerts || []).filter((a) => a && a.status === 'resolved').length})
            </button>
          </div>

          {/* Search bar */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="කේතය, ආපදා නම, ස්ථානය හෝ වාර්තාකරු..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>
      </div>

      {/* Red Alerts List Section */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-[#071910] rounded-3xl border-2 border-slate-200 dark:border-emerald-900/40 text-slate-400 text-xs space-y-2">
            <ShieldAlert className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="font-bold text-slate-600 dark:text-slate-400">
              {searchQuery ? 'සෙවුමට ගැළපෙන ආපදා ඇඟවීම් කිසිවක් හමු නොවීය.' : 'මෙම කාණ්ඩය යටතේ කිසිදු ආපදා ඇඟවීමක් නොමැත.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredAlerts.map((alert) => {
              const disasterCfg = getDisasterConfig(alert.disasterType);
              const isActionLoading = actionLoadingId === alert.id;
              const hasFakeReports = (alert.fakeReports?.length || 0) > 0 || alert.isFlaggedFake;

              return (
                <div
                  key={`admin_alert_${alert.id}`}
                  className={`p-5 rounded-3xl bg-white dark:bg-[#071d12] border-2 shadow-md transition-all space-y-4 ${
                    alert.status === 'active'
                      ? hasFakeReports
                        ? 'border-rose-400 dark:border-rose-800'
                        : 'border-red-300 dark:border-red-900/80 hover:border-red-500'
                      : alert.status === 'resolved'
                      ? 'border-emerald-200 dark:border-emerald-900/60 opacity-90'
                      : 'border-slate-200 dark:border-white/10 opacity-75'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-emerald-950/60 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/80 text-2xl flex items-center justify-center shrink-0 border border-red-200 dark:border-red-800 shadow-sm">
                        {disasterCfg.icon || '🚨'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-lg bg-red-600 text-white font-mono font-black text-xs">
                            {alert.alertCode || `#RED-${alert.id.substring(0, 4)}`}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            alert.status === 'active'
                              ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300'
                              : alert.status === 'resolved'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                          }`}>
                            {alert.status === 'active' ? '🔴 Active (ක්‍රියාකාරී)' : alert.status === 'resolved' ? '✅ Resolved (විසඳුණි)' : alert.status}
                          </span>
                          {hasFakeReports && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center gap-1 animate-pulse">
                              <Flag className="w-3 h-3" />
                              <span>{alert.fakeReports?.length || 1} Fake Report(s)</span>
                            </span>
                          )}
                        </div>
                        <h4 className="text-base font-black text-slate-900 dark:text-white mt-1">
                          {alert.disasterTitleSi || disasterCfg.titleSi}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{alert.incidentDate || alert.createdAt} {alert.incidentTime || ''}</span>
                    </div>
                  </div>

                  {/* Emergency Description & Details */}
                  <div className="space-y-2">
                    {alert.description && (
                      <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                        <span className="font-bold text-amber-800 dark:text-amber-300 block mb-1">
                          📢 හදිසි පණිවිඩය (Emergency Note):
                        </span>
                        <p className="leading-relaxed whitespace-pre-wrap">{alert.description}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200/60 dark:border-white/5 space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">ස්ථානය (Location)</span>
                        <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          <span className="truncate">{alert.locationName || 'නොදනී'}</span>
                        </div>
                        {typeof alert.latitude === 'number' && typeof alert.longitude === 'number' && (
                          <div className="text-[10px] font-mono text-slate-500">
                            GPS: {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}
                          </div>
                        )}
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200/60 dark:border-white/5 space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">වාර්තාකරු (Reporter)</span>
                        <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                          <UserIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="truncate">{alert.reportedByName || 'නොදනී'}</span>
                        </div>
                        {alert.reportedByPhone && (
                          <div className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            <span>{alert.reportedByPhone}</span>
                          </div>
                        )}
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200/60 dark:border-white/5 space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">ප්‍රතිචාර & අදහස්</span>
                        <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span>{alert.comments?.length || 0} අදහස් පළවී ඇත</span>
                        </div>
                        {alert.adminActionNote && (
                          <div className="text-[10px] text-slate-500 italic truncate">
                            සටහන: {alert.adminActionNote}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons Toolbar */}
                  <div className="pt-3 border-t border-slate-100 dark:border-emerald-950/60 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {handleViewDetail && (
                        <button
                          type="button"
                          onClick={() => handleViewDetail(alert)}
                          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                        >
                          <Eye className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                          <span>විස්තර බලන්න (View Details)</span>
                        </button>
                      )}

                      {alert.status === 'active' && (
                        <button
                          type="button"
                          disabled={isActionLoading}
                          onClick={() => handleUpdateStatus(alert.id, 'resolved', 'Admin resolved via panel')}
                          className="px-3.5 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs border border-emerald-300"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                          <span>✅ විසඳුනා ලෙස සලකුණු කරන්න (Mark Resolved)</span>
                        </button>
                      )}

                      {alert.status === 'active' && (
                        <button
                          type="button"
                          disabled={isActionLoading}
                          onClick={() => handleUpdateStatus(alert.id, 'false_alarm', 'Marked false alarm by admin')}
                          className="px-3 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs border border-amber-300"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                          <span>⚠️ අසත්‍ය පණිවිඩයකි (False Alarm)</span>
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={isActionLoading}
                      onClick={() => handleDelete(alert.id)}
                      className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-300 hover:border-rose-600 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ml-auto"
                      title="ආපදා දැන්වීම ස්ථිරවම මකා දමන්න"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete (මකා දමන්න)</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

