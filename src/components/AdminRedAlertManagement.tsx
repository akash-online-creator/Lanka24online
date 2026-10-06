import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
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
  RotateCcw,
  Radio,
  Edit,
  UserX,
  ShieldCheck,
  EyeOff
} from 'lucide-react';
import { RedAlertItem, Language } from '../types';
import { getDisasterConfig } from '../data/redAlertData';
import { updateRedAlertStatus, deleteRedAlertInFirestore, subscribeToSirenSettings } from '../lib/firebase';
import { persistSirenSettings, getSirenFileName } from '../utils/sirenAudio';
import { addDeletedRedAlertId, filterNonDeletedRedAlerts } from '../utils/deletedPostsManager';
import { broadcastRedAlertResolvedNotification } from '../utils/notificationManager';
import { checkIsAdmin, UserProfile } from '../utils/postOwnerHelper';
import { useUserMode } from '../context/UserModeContext';

interface AdminRedAlertManagementProps {
  alerts?: RedAlertItem[];
  redAlerts?: RedAlertItem[];
  language?: Language;
  currentUser?: UserProfile | null;
  onRefreshAlerts?: () => void;
  onRefreshRedAlerts?: () => void;
  onViewAlertDetail?: (alert: RedAlertItem) => void;
  onViewDetail?: (alert: RedAlertItem) => void;
  onEditAlert?: (alert: RedAlertItem) => void;
  onBlockUser?: (userId: string, userName?: string) => void;
}

const DEFAULT_SIREN_NAME = 'Custom Fire Alert (WAV)';
const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:5000/api';

export const AdminRedAlertManagement: React.FC<AdminRedAlertManagementProps> = ({
  alerts: propAlerts,
  redAlerts,
  currentUser = null,
  onRefreshAlerts,
  onRefreshRedAlerts,
  onViewAlertDetail,
  onViewDetail,
  onEditAlert,
  onBlockUser,
}) => {
  const rawAlerts = propAlerts || redAlerts || [];
  const alerts = useMemo(() => filterNonDeletedRedAlerts(rawAlerts), [rawAlerts]);
  const handleRefresh = onRefreshAlerts || onRefreshRedAlerts;
  const handleViewDetail = onViewAlertDetail || onViewDetail;

  // Context & Admin Verification
  const { isUserMode, toggleUserMode } = useUserMode();
  const isAdmin = checkIsAdmin(currentUser);

  const [filter, setFilter] = useState<'all' | 'active' | 'flagged_fake' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [directAudioUrl, setDirectAudioUrl] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [broadcastingId, setBroadcastingId] = useState<string | null>(null);
  const [uploadedSirenFileName, setUploadedSirenFileName] = useState<string>(
    () => getSirenFileName() || DEFAULT_SIREN_NAME
  );

  useEffect(() => {
    // Cloud database එකෙන් Siren settings sync කිරීම
    const unsubscribe = subscribeToSirenSettings((settings) => {
      setUploadedSirenFileName(settings?.fileName || DEFAULT_SIREN_NAME);
    });
    return () => unsubscribe();
  }, []);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      if (!alert) return false;
      if (filter === 'active' && alert.status !== 'active') return false;
      if (filter === 'flagged_fake' && (!alert.isFlaggedFake && (alert.fakeReports?.length || 0) === 0)) return false;
      if (filter === 'resolved' && alert.status !== 'resolved') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (alert.disasterTitleSi || '').toLowerCase().includes(q) || 
                           (alert.disasterTitleEn || '').toLowerCase().includes(q);
        const matchLoc = (alert.locationName || '').toLowerCase().includes(q);
        const matchCode = (alert.alertCode || '').toLowerCase().includes(q);
        const matchReporter = (alert.reportedByName || '').toLowerCase().includes(q) || 
                              (alert.reportedByPhone || '').toLowerCase().includes(q);
        return matchTitle || matchLoc || matchCode || matchReporter;
      }
      return true;
    });
  }, [alerts, filter, searchQuery]);

  // 📡 Node.js / Express Backend එකට km 5 Siren Broadcast එක යැවීම
  const handleTrigger5kmSirenBroadcast = async (alert: RedAlertItem) => {
    if (!alert.latitude || !alert.longitude) {
      window.alert('⚠️ මෙම ආපදාව සඳහා GPS ඛණ්ඩාංක (Coordinates) නොමැති බැවින් කි.මී. 5 සයිරන් ඇඟවීම යැවිය නොහැක.');
      return;
    }

    setBroadcastingId(alert.id);
    try {
      const response = await fetch(`${BACKEND_API_URL}/rathuweliya/broadcast-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disasterType: alert.disasterTitleSi || alert.disasterType || 'හදිසි ආපදාව',
          latitude: alert.latitude,
          longitude: alert.longitude,
          description: alert.description || 'ආපදා ස්ථානය ආසන්නයේ සිටින බැවින් අවධානයෙන් පසුවන්න.',
          reporterName: alert.reportedByName || 'පරිපාලක (Admin)'
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        window.alert(`🚨 සාර්ථකයි! කිලෝමීටර් 5ක් ඇතුළත සිටින පරිශීලකයන් ${data.alertedUsersCount || 0} දෙනෙකුට සයිරන් සහිත Push Notification යවන ලදී.`);
      } else {
        window.alert(`දැනුම්දීම: ${data.message || 'දෝෂයක් ඇතිවිය.'}`);
      }
    } catch (err) {
      console.error('Broadcast fetch error:', err);
      window.alert('⚠️ Backend සර්වරය හා සම්බන්ධ වීමට නොහැකි විය. Server URL එක පරීක්ෂා කරන්න.');
    } finally {
      setBroadcastingId(null);
    }
  };

  const handleUpdateStatus = async (
    targetAlert: RedAlertItem,
    status: 'active' | 'resolved' | 'false_alarm',
    note?: string
  ) => {
    setActionLoadingId(targetAlert.id);
    const timeStr = `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${new Date().toLocaleDateString('si-LK')})`;
    const reasonText = note || (status === 'resolved' 
      ? 'පරිපාලක විසින් ආපදා තත්ත්වය සාර්ථකව විසඳුණු බව තහවුරු කරන ලදී.' 
      : 'පරිපාලක විසින් මෙම නිවේදනය අසත්‍ය / දෝෂ සහිත බව තහවුරු කර ඉවත් කරන ලදී.');

    try {
      await updateRedAlertStatus(targetAlert.id, status, reasonText);

      if (status === 'resolved' || status === 'false_alarm') {
        broadcastRedAlertResolvedNotification({
          alertId: targetAlert.id,
          alertCode: targetAlert.alertCode,
          disasterTitle: targetAlert.disasterTitleSi || targetAlert.disasterTitleEn || 'හදිසි ආපදා අනතුර',
          locationName: targetAlert.locationName || 'ශ්‍රී ලංකාව',
          resolvedTime: timeStr,
          resolvedReason: reasonText,
          resolvedBy: 'පරිපාලක (Admin)',
        });
      }

      handleRefresh?.();
    } catch (err) {
      console.error('Error updating alert status:', err);
      window.alert('තත්ත්වය යාවත්කාලීන කිරීමේදී දෝෂයක් ඇතිවිය.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (targetAlert: RedAlertItem) => {
    if (!window.confirm('මෙම ආපදා ඇඟවීම ස්ථිරවම මකා දැමීමට ඔබට විශ්වාසද?')) return;

    setActionLoadingId(targetAlert.id);
    const timeStr = `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${new Date().toLocaleDateString('si-LK')})`;
    addDeletedRedAlertId(targetAlert.id);

    try {
      await deleteRedAlertInFirestore(targetAlert.id);

      broadcastRedAlertResolvedNotification({
        alertId: targetAlert.id,
        alertCode: targetAlert.alertCode,
        disasterTitle: targetAlert.disasterTitleSi || targetAlert.disasterTitleEn || 'හදිසි ආපදා අනතුර',
        locationName: targetAlert.locationName || 'ශ්‍රී ලංකාව',
        resolvedTime: timeStr,
        resolvedReason: 'පරිපාලක විසින් පද්ධතියෙන් මෙම ආපදා ඇඟවීම ඉවත් කරන ලදී.',
        resolvedBy: 'පරිපාලක (Admin)',
      });

      handleRefresh?.();
    } catch (err) {
      console.error('Error deleting alert:', err);
      window.alert('මකා දැමීමේදී දෝෂයක් ඇතිවිය.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleBlockUserAction = (userId?: string, userName?: string) => {
    if (!userId) {
      window.alert('⚠️ පරිශීලක අයිඩිය (User ID) සොයාගත නොහැක.');
      return;
    }
    if (window.confirm(`"${userName || userId}" නැමැති පරිශීලකයා පද්ධතියෙන් තහනම් (Block) කිරීමට ඔබට විශ්වාසද?`)) {
      if (onBlockUser) {
        onBlockUser(userId, userName);
      } else {
        window.alert(`✅ පරිශීලක (${userName || userId}) සාර්ථකව බ්ලොක් කරන ලදී.`);
      }
    }
  };

  const handleSaveDirectUrl = async () => {
    const url = directAudioUrl.trim();
    if (url.length > 5) {
      await persistSirenSettings(url, url);
      setUploadedSirenFileName(url);
      setDirectAudioUrl('');
      window.alert('✅ සාර්ථකයි! Audio URL එක Cloud Database හි ස්ථිරවම සුරකින ලදී.');
    } else {
      window.alert('⚠️️ කරුණාකර නිවැරදි Direct Audio / MP3 සබැඳියක් ඇතුළත් කරන්න.');
    }
  };

  const totalActive = useMemo(() => alerts.filter((a) => a.status === 'active').length, [alerts]);
  const totalFlagged = useMemo(() => alerts.filter((a) => a.isFlaggedFake || (a.fakeReports?.length || 0) > 0).length, [alerts]);
  const totalResolved = useMemo(() => alerts.filter((a) => a.status === 'resolved').length, [alerts]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner / Admin Controls & User Mode Switcher */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white text-red-600 font-black text-2xl flex items-center justify-center shadow-md">
              🚨
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black tracking-wide">
                  රතු එළිය (Red Alerts) - පරිපාලක පුවරුව
                </h3>
                {isUserMode && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] animate-pulse">
                    👁️ User Mode Active
                  </span>
                )}
              </div>
              <p className="text-xs text-red-100 font-medium">
                කි.මී. 5 වපසරියක සිටින අයට සයිරන් ඇඟවීම් (Push Notification) සහ ආපදා කළමනාකරණය
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* User Mode Switcher Button */}
            <button
              type="button"
              onClick={toggleUserMode}
              className={`px-4 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer border ${
                isUserMode
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 border-emerald-300'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-400'
              }`}
            >
              {isUserMode ? <EyeOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
              <span>{isUserMode ? '👁️ පරිශීලක ප්‍රකාරය: සක්‍රීයයි' : '🔄 පරිශීලක ප්‍රකාරයට මාරු වන්න'}</span>
            </button>

            <label 
              className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer border border-amber-300"
              title="Admin: Upload custom siren audio tone"
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
                        window.alert(`✅ සාර්ථකයි! "${file.name}" Siren Tone එක Cloud Database හි ගබඩා කරන ලදී.`);
                      }
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>

            <button
              type="button"
              onClick={async () => {
                await persistSirenSettings(null, DEFAULT_SIREN_NAME);
                setUploadedSirenFileName(DEFAULT_SIREN_NAME);
                window.alert('✅ පෙරනිමි (Default) Siren ශබ්දය සාර්ථකව ප්‍රතිස්ථාපනය විය.');
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-amber-300 font-black text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer border border-amber-400/50"
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

        {/* Audio URL Input */}
        <div className="pt-3 border-t border-red-500/50">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="url"
              placeholder="🔗 සෘජු Siren ශ්‍රව්‍ය සබැඳිය (Direct MP3 URL) මෙහි ඇතුළත් කරන්න..."
              value={directAudioUrl}
              onChange={(e) => setDirectAudioUrl(e.target.value)}
              className="flex-1 min-w-[240px] px-3.5 py-2 rounded-xl bg-red-950/90 border border-amber-400/60 text-white placeholder-red-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner"
            />
            <button
              type="button"
              onClick={handleSaveDirectUrl}
              className="px-4 py-2 bg-cyan-400 hover:bg-cyan-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer whitespace-nowrap"
            >
              🔗 සබැඳිය සුරකින්න
            </button>
          </div>
        </div>

        {/* Siren Status Indicator */}
        <div className="pt-2 border-t border-red-500/50 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-amber-200">
            <span className="p-1 rounded-lg bg-amber-400/20 text-amber-300">🎵</span>
            <span className="font-bold">දැනට සක්‍රීය Siren නාදය:</span>
            <span className="font-mono font-black text-white bg-red-950/80 px-2.5 py-1 rounded-xl border border-red-400/50 shadow-inner">
              {uploadedSirenFileName}
            </span>
          </div>
          <span className="text-[11px] text-emerald-200 font-semibold flex items-center gap-1">
            ✓ පද්ධතිය සක්‍රීයයි (Active)
          </span>
        </div>
      </div>

      {/* Counters */}
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
          <span className="text-[10px] uppercase font-bold text-rose-500">අසත්‍ය බවට වාර්තා</span>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{totalFlagged}</div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40">
          <span className="text-[10px] uppercase font-bold text-emerald-500">නිරාකරණය වූ ආපදා</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{totalResolved}</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#071910] border-2 border-slate-200 dark:border-emerald-900/50 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900/80 rounded-xl flex-wrap">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === 'all' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              සියල්ල ({alerts.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === 'active' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              🚨 සක්‍රීය ආපදා ({totalActive})
            </button>
            <button
              type="button"
              onClick={() => setFilter('flagged_fake')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === 'flagged_fake' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              ⚠️ අසත්‍ය බවට වාර්තා ({totalFlagged})
            </button>
            <button
              type="button"
              onClick={() => setFilter('resolved')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === 'resolved' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              ✅ විසඳුණු ආපදා ({totalResolved})
            </button>
          </div>

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

      {/* Alerts Feed */}
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
              const isBroadcasting = broadcastingId === alert.id;
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
                  {/* Quick Action Admin Toolbar - Rendered when logged in as Admin */}
                  {isAdmin && (
                    <div className="bg-amber-500/10 border border-amber-500/40 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-2 shadow-xs">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                        <span>🛡️ පරිපාලක පාලන (Admin Quick Action)</span>
                        {isUserMode && (
                          <span className="text-[10px] bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-100 px-2 py-0.5 rounded-md">
                            User Mode View
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Edit Button */}
                        {onEditAlert && (
                          <button
                            type="button"
                            onClick={() => onEditAlert(alert)}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>සංස්කරණය</span>
                          </button>
                        )}

                        {/* Delete Button */}
                        <button
                          type="button"
                          disabled={isActionLoading}
                          onClick={() => handleDelete(alert)}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>මකා දමන්න</span>
                        </button>

                        {/* Block User Button */}
                        <button
                          type="button"
                          onClick={() => handleBlockUserAction(alert.reportedById || alert.userId, alert.reportedByName)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-black text-amber-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1 shadow-xs cursor-pointer border border-amber-400/40"
                        >
                          <UserX className="w-3.5 h-3.5 text-amber-400" />
                          <span>පරිශීලක බ්ලොක්</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Normal Post Header */}
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

                  {/* Actions & Dispatch */}
                  <div className="pt-3 border-t border-slate-100 dark:border-emerald-950/60 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {handleViewDetail && (
                        <button
                          type="button"
                          onClick={() => handleViewDetail(alert)}
                          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                        >
                          <Eye className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                          <span>විස්තර</span>
                        </button>
                      )}

                      {/* 5km Radius Siren Trigger Button */}
                      {alert.status === 'active' && (
                        <button
                          type="button"
                          disabled={isBroadcasting}
                          onClick={() => handleTrigger5kmSirenBroadcast(alert)}
                          className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-50 animate-pulse"
                          title="කිලෝමීටර් 5 ඇතුළත සිටින සැමට සයිරන් ශබ්දය සමඟ Push Notification එක යවන්න"
                        >
                          <Radio className="w-4 h-4" />
                          <span>{isBroadcasting ? 'යවමින් පවතී...' : '🚨 කි.මී. 5 සයිරන් ඇඟවීම යවන්න'}</span>
                        </button>
                      )}

                      {alert.status === 'active' && (
                        <button
                          type="button"
                          disabled={isActionLoading}
                          onClick={() => handleUpdateStatus(alert, 'resolved')}
                          className="px-3.5 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs border border-emerald-300"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                          <span>විසඳුනා</span>
                        </button>
                      )}

                      {alert.status === 'active' && (
                        <button
                          type="button"
                          disabled={isActionLoading}
                          onClick={() => handleUpdateStatus(alert, 'false_alarm')}
                          className="px-3 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs border border-amber-300"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                          <span>අසත්‍‍යයි</span>
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={isActionLoading}
                      onClick={() => handleDelete(alert)}
                      className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-300 hover:border-rose-600 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ml-auto"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>මකා දමන්න</span>
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
