import React, { useState, useEffect, useRef } from 'react';
import { 
  Database, 
  HardDrive, 
  Server, 
  RefreshCw, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Sparkles,
  Download,
  Upload,
  ShieldCheck,
  Search
} from 'lucide-react';
import { User, HelpPost, CategoryItem, TagItem, Issue, BlockedCredential } from '../types';
import { restorePostsBackupData, syncUserProfileToFirestore } from '../lib/firebase';
import { AdminStorageExplorerModal } from './AdminStorageExplorerModal';

interface MemoryStorageBarProps {
  helpPosts: HelpPost[];
  users: User[];
  categoryItems?: CategoryItem[];
  tagItems?: TagItem[];
  issues?: Issue[];
  blockedCredentials?: BlockedCredential[];
}

interface StorageBreakdown {
  postsBytes: number;
  usersBytes: number;
  tagsCategoriesBytes: number;
  issuesBytes: number;
  blockedBytes: number;
  totalDataBytes: number;
  browserUsageBytes: number;
  browserQuotaBytes: number;
  firestoreQuotaBytes: number;
  totalDocsCount: number;
}

export const MemoryStorageBar: React.FC<MemoryStorageBarProps> = ({
  helpPosts,
  users,
  categoryItems = [],
  tagItems = [],
  issues = [],
  blockedCredentials = [],
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showExplorerModal, setShowExplorerModal] = useState(false);
  const [browserStorage, setBrowserStorage] = useState<{ usage: number; quota: number } | null>(null);

  // Firestore free tier capacity: 1 GiB (1,073,741,824 bytes)
  const FIRESTORE_FREE_QUOTA_BYTES = 1024 * 1024 * 1024; // 1 GB

  const calculateStringBytes = (obj: any): number => {
    try {
      const str = JSON.stringify(obj);
      return new Blob([str]).size;
    } catch {
      return 0;
    }
  };

  const getStorageStats = (): StorageBreakdown => {
    const postsBytes = calculateStringBytes(helpPosts);
    const usersBytes = calculateStringBytes(users);
    const tagsCategoriesBytes = calculateStringBytes({ categoryItems, tagItems });
    const issuesBytes = calculateStringBytes(issues);
    const blockedBytes = calculateStringBytes(blockedCredentials);

    const totalDataBytes = postsBytes + usersBytes + tagsCategoriesBytes + issuesBytes + blockedBytes;
    const totalDocsCount = (helpPosts?.length || 0) + (users?.length || 0) + (categoryItems?.length || 0) + (tagItems?.length || 0) + (issues?.length || 0) + (blockedCredentials?.length || 0);

    return {
      postsBytes,
      usersBytes,
      tagsCategoriesBytes,
      issuesBytes,
      blockedBytes,
      totalDataBytes,
      browserUsageBytes: browserStorage?.usage || totalDataBytes,
      browserQuotaBytes: browserStorage?.quota || FIRESTORE_FREE_QUOTA_BYTES,
      firestoreQuotaBytes: FIRESTORE_FREE_QUOTA_BYTES,
      totalDocsCount,
    };
  };

  const fetchBrowserStorageEstimate = async () => {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        if (estimate.usage !== undefined && estimate.quota !== undefined) {
          setBrowserStorage({ usage: estimate.usage, quota: estimate.quota });
        }
      } catch (err) {
        console.warn('Storage estimate notice:', err);
      }
    }
  };

  useEffect(() => {
    fetchBrowserStorageEstimate();
  }, [helpPosts, users, tagItems, categoryItems]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchBrowserStorageEstimate();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 400);
  };

  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadFullBackup = () => {
    try {
      const backupData = {
        exportVersion: '1.0',
        exportedAt: new Date().toISOString(),
        appName: 'Sahaya Sewa (සහය සේවා)',
        totalRecords: (helpPosts?.length || 0) + (users?.length || 0),
        data: {
          users: users || [],
          helpPosts: helpPosts || [],
          categoryItems: categoryItems || [],
          tagItems: tagItems || [],
          issues: issues || [],
          blockedCredentials: blockedCredentials || [],
        },
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateTag = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `sahaya_sewa_database_backup_${dateTag}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setBackupStatus('✅ සම්පූර්ණ දත්ත Backup ගොනුව සාර්ථකව Download විය.');
      setTimeout(() => setBackupStatus(null), 4000);
    } catch (err: any) {
      setBackupStatus(`❌ Backup ගැනීමේදී දෝෂයක්: ${err?.message || err}`);
    }
  };

  const handleRestoreBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm(`"${file.name}" ගොනුවෙන් දත්ත නැවත Restore කිරීමට ඔබට විශ්වාසද?`)) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setBackupStatus('⏳ දත්ත Restore කරමින් පවතී...');
      const text = await file.text();
      const parsed = JSON.parse(text);
      const payload = parsed.data || parsed;

      if (payload.helpPosts && Array.isArray(payload.helpPosts)) {
        await restorePostsBackupData(payload.helpPosts);
      }

      if (payload.users && Array.isArray(payload.users)) {
        for (const u of payload.users) {
          if (u && u.id) {
            await syncUserProfileToFirestore(u);
          }
        }
      }

      setBackupStatus('✅ දත්ත සාර්ථකව Restore කරන ලදී!');
      setTimeout(() => setBackupStatus(null), 5000);
    } catch (err: any) {
      setBackupStatus(`❌ Restore කිරීමේදී දෝෂයක්: ${err?.message || 'ගොනුව නිවැරදි JSON ආකෘතියේ නොවේ.'}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const stats = getStorageStats();

  // Used vs Free calculations against Cloud Firestore Database Quota (1 GB Standard Tier)
  // We use estimated document storage + safety index overhead (approx 20%)
  const effectiveUsedBytes = Math.max(stats.totalDataBytes * 1.25, 1024 * 16); // Minimum base index buffer
  const freeBytes = Math.max(0, stats.firestoreQuotaBytes - effectiveUsedBytes);
  const usedPercentage = Math.min(100, Math.max(0.01, (effectiveUsedBytes / stats.firestoreQuotaBytes) * 100));
  const freePercentage = (100 - usedPercentage).toFixed(2);

  // Segment percentages for visual bar
  const postsPercent = (stats.postsBytes / stats.firestoreQuotaBytes) * 100;
  const usersPercent = (stats.usersBytes / stats.firestoreQuotaBytes) * 100;
  const configPercent = ((stats.tagsCategoriesBytes + stats.issuesBytes + stats.blockedBytes) / stats.firestoreQuotaBytes) * 100;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white rounded-3xl p-5 sm:p-6 shadow-xl border-2 border-emerald-500/40 relative overflow-hidden space-y-4">
      {/* Subtle Background Glow */}
      <div className="absolute -right-16 -top-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-inner">
            <Database className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base sm:text-lg text-white tracking-wide flex items-center gap-2">
                <span>දිගුකාලීන මතක ගබඩා මාපකය</span>
                <span className="text-[10px] font-mono font-black bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  STORAGE METER
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              Firestore Cloud Database සහ සජීවී දත්ත ධාරිතාව (Live Storage Health)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* 🔍 Explore Stored Data Button */}
          <button
            type="button"
            onClick={() => setShowExplorerModal(true)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
          >
            <Search className="w-3.5 h-3.5" />
            <span>ගබඩා දත්ත පිරික්සන්න (Inspect Data)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
          >
            <Info className="w-3.5 h-3.5 text-teal-400" />
            <span>{showDetails ? 'විස්තර සඟවන්න' : 'වැඩිදුර විස්තර'}</span>
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            className={`p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer ${
              isRefreshing ? 'animate-spin' : ''
            }`}
            title="මතක ප්‍රමාණය නැවත ගණනය කරන්න (Refresh)"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Memory Bar & Usage Meter */}
      <div className="space-y-2.5 relative z-10">
        <div className="flex flex-wrap justify-between items-end gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">භාවිතා කළ ඉඩ:</span>
            <span className="font-mono font-black text-amber-400 text-sm bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/20">
              {formatBytes(effectiveUsedBytes)} ({usedPercentage < 0.01 ? '< 0.01%' : `${usedPercentage.toFixed(3)}%`})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">තව හිස්ව ඇති ඉඩ (Free):</span>
            <span className="font-mono font-black text-emerald-400 text-sm bg-emerald-400/10 px-2 py-0.5 rounded-lg border border-emerald-400/20">
              {formatBytes(freeBytes)} ({freePercentage}%)
            </span>
          </div>
        </div>

        {/* The Multi-Segment Visual Progress Bar */}
        <div className="w-full h-5 sm:h-6 bg-slate-950/80 rounded-2xl p-1 border-2 border-slate-700/80 shadow-inner flex items-center overflow-hidden">
          <div className="w-full h-full rounded-xl flex overflow-hidden bg-slate-900 relative">
            {/* Help Posts Segment */}
            <div
              style={{ width: `${Math.max(1, postsPercent * 200)}%`, minWidth: '10px' }}
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700 relative group"
              title={`දැන්වීම් දත්ත: ${formatBytes(stats.postsBytes)}`}
            />

            {/* Users Segment */}
            <div
              style={{ width: `${Math.max(1, usersPercent * 200)}%`, minWidth: '8px' }}
              className="h-full bg-gradient-to-r from-teal-400 to-cyan-500 transition-all duration-700 relative group"
              title={`පරිශීලක දත්ත: ${formatBytes(stats.usersBytes)}`}
            />

            {/* System/Config Segment */}
            <div
              style={{ width: `${Math.max(1, configPercent * 200)}%`, minWidth: '6px' }}
              className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-700 relative group"
              title={`පද්ධති සැකසුම් සහ ටැග්: ${formatBytes(stats.tagsCategoriesBytes + stats.issuesBytes)}`}
            />

            {/* Free Space Segment */}
            <div
              className="h-full flex-1 bg-emerald-950/40 transition-all duration-700 flex items-center justify-end pr-3"
            >
              <span className="text-[10px] font-mono font-black text-emerald-400/70 hidden sm:inline">
                {freePercentage}% Free Space
              </span>
            </div>
          </div>
        </div>

        {/* Legend bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-[11px] font-medium text-slate-300">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm" />
              <span>දැන්වීම් ({helpPosts?.length || 0})</span>
            </span>

            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm" />
              <span>පරිශීලකයන් ({users?.length || 0})</span>
            </span>

            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm" />
              <span>පද්ධති දත්ත (Tags/Tickets)</span>
            </span>

            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-900 border border-emerald-600" />
              <span className="text-emerald-400 font-bold">නොමිලේ ඇති ඉඩ (1.00 GB Quota)</span>
            </span>
          </div>

          <div className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-700/50">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>මතක තත්ත්වය: ඉතා ප්‍රශස්තයි (Optimal)</span>
          </div>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 relative z-10">
        <div className="bg-slate-800/80 border border-slate-700 p-3 rounded-2xl">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5 flex items-center gap-1">
            <HardDrive className="w-3 h-3 text-emerald-400" />
            <span>මුළු ධාරිතාව (Max Quota)</span>
          </div>
          <div className="text-base sm:text-lg font-black text-white font-mono">
            {formatBytes(stats.firestoreQuotaBytes)}
          </div>
          <span className="text-[10px] text-emerald-400 font-medium">Cloud Free Tier</span>
        </div>

        <div className="bg-slate-800/80 border border-slate-700 p-3 rounded-2xl">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5 flex items-center gap-1">
            <Server className="w-3 h-3 text-amber-400" />
            <span>භාවිතා කළ ප්‍රමාණය (Used)</span>
          </div>
          <div className="text-base sm:text-lg font-black text-amber-400 font-mono">
            {formatBytes(effectiveUsedBytes)}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">ලියාපදිංචි දත්ත පරිමාව</span>
        </div>

        <div className="bg-slate-800/80 border border-slate-700 p-3 rounded-2xl">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>ඉතිරි ඉඩ (Available Free)</span>
          </div>
          <div className="text-base sm:text-lg font-black text-emerald-400 font-mono">
            {formatBytes(freeBytes)}
          </div>
          <span className="text-[10px] text-emerald-300 font-medium">{freePercentage}% නිදහස්ව ඇත</span>
        </div>

        <div className="bg-slate-800/80 border border-slate-700 p-3 rounded-2xl">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5 flex items-center gap-1">
            <Layers className="w-3 h-3 text-teal-400" />
            <span>සමස්ත වාර්තා (Total Docs)</span>
          </div>
          <div className="text-base sm:text-lg font-black text-teal-300 font-mono">
            {stats.totalDocsCount} <span className="text-xs font-normal text-slate-400">Records</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Posts, Users, Config</span>
        </div>
      </div>

      {/* Expanded Details Breakdown */}
      {showDetails && (
        <div className="pt-3 border-t border-slate-700/80 space-y-3 animate-fadeIn text-xs relative z-10">
          <div className="font-extrabold text-slate-200 flex items-center gap-1.5 text-sm">
            <Info className="w-4 h-4 text-emerald-400" />
            <span>දත්ත ගබඩාවේ සවිස්තරාත්මක භාවිතය (Detailed Breakdown):</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-300">
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
              <div>
                <span className="font-bold block text-emerald-300">දැන්වීම් ගබඩාව (Help Posts)</span>
                <span className="text-[10px] text-slate-400">{helpPosts?.length || 0} දැන්වීම් සටහන්</span>
              </div>
              <span className="font-mono font-black text-white">{formatBytes(stats.postsBytes)}</span>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
              <div>
                <span className="font-bold block text-cyan-300">පරිශීලක ගිණුම් (Users)</span>
                <span className="text-[10px] text-slate-400">{users?.length || 0} පරිශීලකයන්</span>
              </div>
              <span className="font-mono font-black text-white">{formatBytes(stats.usersBytes)}</span>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
              <div>
                <span className="font-bold block text-amber-300">පද්ධති සැකසුම් (Tags & Config)</span>
                <span className="text-[10px] text-slate-400">{(categoryItems?.length || 0) + (tagItems?.length || 0)} Categories/Tags</span>
              </div>
              <span className="font-mono font-black text-white">{formatBytes(stats.tagsCategoriesBytes + stats.issuesBytes)}</span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-slate-200">
                  ආපදා උපස්ථ සහ ප්‍රතිසාධනය (Database Backup & Disaster Recovery):
                </span>
              </div>

              {backupStatus && (
                <span className="text-[11px] font-bold text-amber-300 animate-fadeIn">
                  {backupStatus}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* 1-Click Backup Download */}
              <button
                type="button"
                onClick={handleDownloadFullBackup}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>සම්පූර්ණ දත්ත Backup එකක් බාගත කරන්න (Download JSON)</span>
              </button>

              {/* 1-Click Backup Restore */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleRestoreBackupFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-600 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <Upload className="w-4 h-4 text-teal-400" />
                <span>Backup එකකින් Restore කරන්න</span>
              </button>
            </div>
          </div>

          <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-200 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px]">
              ඔබගේ Cloud Firestore Database මතකය Google Cloud Multi-Zone Servers මඟින් ස්ථිරව ආරක්ෂිතව පවතින අතර, 1.00 GB ප්‍රමාණයක දත්ත ගබඩා කිරීමේ ඉඩ ප්‍රමාණයක් පවතී. ඕනෑම හදිසි අවස්ථාවකදී භාවිතයට සම්පූර්ණ දත්ත Backup පිටපතක් මෙතැනින් බාගත කර තබාගත හැක.
            </p>
          </div>
        </div>
      )}

      {/* 🔍 Storage Explorer Modal */}
      <AdminStorageExplorerModal
        isOpen={showExplorerModal}
        onClose={() => setShowExplorerModal(false)}
        users={users}
        helpPosts={helpPosts}
        issues={issues}
        categoryItems={categoryItems}
        tagItems={tagItems}
      />
    </div>
  );
};
