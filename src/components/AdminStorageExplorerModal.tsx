import React, { useState, useMemo } from 'react';
import { User, HelpPost, Issue, CategoryItem, TagItem } from '../types';
import { 
  X, 
  Database, 
  Users, 
  FileText, 
  Radio, 
  MessageSquare, 
  Image as ImageIcon, 
  Search, 
  HardDrive, 
  Layers, 
  Calendar, 
  ExternalLink,
  Info,
  Sparkles,
  PieChart
} from 'lucide-react';

interface AdminStorageExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  users?: User[];
  helpPosts?: HelpPost[];
  issues?: Issue[];
  categoryItems?: CategoryItem[];
  tagItems?: TagItem[];
}

export const AdminStorageExplorerModal: React.FC<AdminStorageExplorerModalProps> = ({
  isOpen,
  onClose,
  users = [],
  helpPosts = [],
  issues = [],
  categoryItems = [],
  tagItems = [],
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'user' | 'post' | 'photo' | 'issue'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const calculateBytes = (obj: any): number => {
    try {
      return new Blob([JSON.stringify(obj)]).size;
    } catch {
      return 0;
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Compile individual storage items with calculated byte sizes
  const storageItems = useMemo(() => {
    const items: Array<{
      id: string;
      type: 'user' | 'post' | 'photo' | 'issue' | 'config';
      typeLabel: string;
      typeColor: string;
      title: string;
      subtitle: string;
      sizeBytes: number;
      date?: string;
      hasPhoto?: boolean;
      raw: any;
    }> = [];

    // 1. Users
    users.forEach((u) => {
      const uBytes = calculateBytes(u);
      const photoBytes = calculateBytes(u.nicFrontPhotoUrl || u.idCardPhotoUrl || u.photoUrl || '');
      items.push({
        id: `usr_${u.id}`,
        type: 'user',
        typeLabel: 'සාමාජික ගිණුම',
        typeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
        title: u.name || 'පරිශීලක',
        subtitle: `NIC: ${u.nicNumber || u.userId || 'N/A'} • ${u.phone || 'දුරකථනය නොමැත'}`,
        sizeBytes: uBytes,
        date: u.registeredAt,
        hasPhoto: Boolean(u.nicFrontPhotoUrl || u.idCardPhotoUrl || u.photoUrl),
        raw: u,
      });

      // If user has uploaded a photo, list photo entry separately for transparency
      if (u.nicFrontPhotoUrl || u.idCardPhotoUrl || u.photoUrl) {
        items.push({
          id: `photo_usr_${u.id}`,
          type: 'photo',
          typeLabel: 'හැඳුනුම්පත් ඡායාරූපය',
          typeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
          title: `🪪 ${u.name} - NIC Front Photo`,
          subtitle: `User ID: ${u.userId || u.id} (Base64 Image Storage)`,
          sizeBytes: photoBytes,
          date: u.registeredAt,
          hasPhoto: true,
          raw: { photoUrl: u.nicFrontPhotoUrl || u.idCardPhotoUrl || u.photoUrl, userName: u.name },
        });
      }
    });

    // 2. Help Posts
    helpPosts.forEach((p) => {
      const pBytes = calculateBytes(p);
      items.push({
        id: `post_${p.id}`,
        type: 'post',
        typeLabel: 'ප්‍රජා දැන්වීම',
        typeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        title: p.whatHappened || p.whatIsNeeded || 'දැන්වීම් සටහන',
        subtitle: `කේතය: #${p.postCode || p.id} • කර්තෘ: ${p.userName || 'Unknown'} • 📍 ${p.locationName || 'ශ්‍රී ලංකාව'}`,
        sizeBytes: pBytes,
        date: p.createdAt,
        raw: p,
      });
    });

    // 3. Issues
    issues.forEach((i) => {
      const iBytes = calculateBytes(i);
      items.push({
        id: `iss_${i.id}`,
        type: 'issue',
        typeLabel: 'ගැටලු ටිකට්පත',
        typeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        title: i.title || i.description || 'තාක්ෂණික ගැටලුව',
        subtitle: `Code: ${i.issueCode || i.id} • User: ${i.userName || 'Anonymous'}`,
        sizeBytes: iBytes,
        date: i.createdAt,
        raw: i,
      });
    });

    // Sort by largest byte size first
    return items.sort((a, b) => b.sizeBytes - a.sizeBytes);
  }, [users, helpPosts, issues]);

  // Aggregate Category Breakdown Totals
  const totals = useMemo(() => {
    let usersBytes = 0;
    let postsBytes = 0;
    let photosBytes = 0;
    let issuesBytes = 0;

    users.forEach((u) => {
      usersBytes += calculateBytes(u);
      if (u.nicFrontPhotoUrl || u.idCardPhotoUrl || u.photoUrl) {
        photosBytes += calculateBytes(u.nicFrontPhotoUrl || u.idCardPhotoUrl || u.photoUrl);
      }
    });
    helpPosts.forEach((p) => (postsBytes += calculateBytes(p)));
    issues.forEach((i) => (issuesBytes += calculateBytes(i)));

    const grandTotal = usersBytes + postsBytes + issuesBytes;
    return {
      usersBytes,
      postsBytes,
      photosBytes,
      issuesBytes,
      grandTotal: Math.max(grandTotal, 1),
    };
  }, [users, helpPosts, issues]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return storageItems.filter((item) => {
      const matchesTab = activeTab === 'all' || item.type === activeTab;
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.typeLabel.toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });
  }, [storageItems, activeTab, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-slate-900 text-white rounded-3xl border-2 border-emerald-500/40 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 p-4 sm:p-5 border-b border-emerald-500/30 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 text-xl font-black shadow-inner">
              <Database className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
                <span>දත්ත ගබඩා ගවේෂකය (Database Content Explorer)</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  {formatBytes(totals.grandTotal)} TOTAL
                </span>
              </h3>
              <p className="text-xs text-slate-300 font-medium">
                දත්ත පද්ධතියේ භාවිතා කර ඇති ඉඩෙහි ගබඩා වී ඇති සියලුම දත්ත සහ ලිපිගොනු ලැයිස්තුව
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer transition-all"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* Visual Storage Breakdown Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
                <span className="flex items-center gap-1 text-teal-300">
                  <Users className="w-3.5 h-3.5" />
                  <span>සාමාජික ගිණුම්</span>
                </span>
                <span className="font-mono">{users.length}</span>
              </div>
              <div className="text-base font-black text-white font-mono">
                {formatBytes(totals.usersBytes)}
              </div>
              <div className="text-[10px] text-teal-400 font-medium">
                {((totals.usersBytes / totals.grandTotal) * 100).toFixed(1)}% of used space
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
                <span className="flex items-center gap-1 text-emerald-300">
                  <FileText className="w-3.5 h-3.5" />
                  <span>ප්‍රජා දැන්වීම්</span>
                </span>
                <span className="font-mono">{helpPosts.length}</span>
              </div>
              <div className="text-base font-black text-white font-mono">
                {formatBytes(totals.postsBytes)}
              </div>
              <div className="text-[10px] text-emerald-400 font-medium">
                {((totals.postsBytes / totals.grandTotal) * 100).toFixed(1)}% of used space
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
                <span className="flex items-center gap-1 text-indigo-300">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>ඡායාරූප (NIC Photos)</span>
                </span>
                <span className="font-mono">{users.filter((u) => u.nicFrontPhotoUrl || u.idCardPhotoUrl).length}</span>
              </div>
              <div className="text-base font-black text-white font-mono">
                {formatBytes(totals.photosBytes)}
              </div>
              <div className="text-[10px] text-indigo-400 font-medium">
                Base64 Compressed Media
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
                <span className="flex items-center gap-1 text-amber-300">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>ගැටලු & පද්ධති</span>
                </span>
                <span className="font-mono">{issues.length}</span>
              </div>
              <div className="text-base font-black text-white font-mono">
                {formatBytes(totals.issuesBytes)}
              </div>
              <div className="text-[10px] text-amber-400 font-medium">
                {((totals.issuesBytes / totals.grandTotal) * 100).toFixed(1)}% of used space
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2">
            
            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              {[
                { key: 'all', label: `සියල්ල (${storageItems.length})` },
                { key: 'user', label: `සාමාජිකයින් (${users.length})` },
                { key: 'post', label: `දැන්වීම් (${helpPosts.length})` },
                { key: 'photo', label: `ඡායාරූප (${users.filter((u) => u.nicFrontPhotoUrl || u.idCardPhotoUrl).length})` },
                { key: 'issue', label: `ගැටලු (${issues.length})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    activeTab === tab.key
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="නම, කේතය, විස්තර සොයන්න..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Stored Records Item List */}
          <div className="space-y-2 pt-1 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
            {filteredItems.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-bold text-xs bg-slate-950/60 rounded-2xl border border-dashed border-slate-800">
                ගැලපෙන දත්ත හමු නොවීය.
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="p-3.5 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/60 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center font-bold shrink-0">
                      {item.type === 'user' && <Users className="w-4 h-4 text-teal-400" />}
                      {item.type === 'post' && <FileText className="w-4 h-4 text-emerald-400" />}
                      {item.type === 'photo' && <ImageIcon className="w-4 h-4 text-indigo-400" />}
                      {item.type === 'issue' && <MessageSquare className="w-4 h-4 text-amber-400" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border uppercase font-mono ${item.typeColor}`}>
                          {item.typeLabel}
                        </span>
                        <h4 className="text-xs font-bold text-white truncate max-w-sm">
                          {item.title}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5 font-medium">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-right">
                    <div>
                      <span className="font-mono font-black text-xs sm:text-sm text-emerald-400 block">
                        {formatBytes(item.sizeBytes)}
                      </span>
                      {item.date && (
                        <span className="text-[10px] text-slate-500 font-mono block">
                          {new Date(item.date).toLocaleDateString('si-LK')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Item Inspection Preview Box if Clicked */}
          {selectedItem && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/40 space-y-2.5 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                  <Info className="w-4 h-4" />
                  <span>තෝරාගත් දත්ත සටහනේ විස්තරය:</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer font-bold"
                >
                  වසන්න ✕
                </button>
              </div>

              {selectedItem.type === 'photo' && selectedItem.raw?.photoUrl ? (
                <div className="flex items-center gap-4">
                  <img
                    src={selectedItem.raw.photoUrl}
                    alt="Preview"
                    className="w-24 h-16 rounded-xl object-cover border border-slate-700"
                  />
                  <div className="text-xs space-y-1">
                    <span className="font-bold text-white block">{selectedItem.title}</span>
                    <span className="text-slate-400 block font-mono">Size: {formatBytes(selectedItem.sizeBytes)}</span>
                  </div>
                </div>
              ) : (
                <pre className="p-3 rounded-xl bg-slate-900 text-emerald-300 font-mono text-[11px] overflow-x-auto max-h-40 border border-slate-800">
                  {JSON.stringify(selectedItem.raw, null, 2)}
                </pre>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <p className="text-xs text-slate-400 font-medium">
            සමස්ත ගබඩා ධාරිතාව: 1.00 GB • නිදහස් ඉඩ: 99%+
          </p>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition-all cursor-pointer"
          >
            වසන්න
          </button>
        </div>

      </div>
    </div>
  );
};
