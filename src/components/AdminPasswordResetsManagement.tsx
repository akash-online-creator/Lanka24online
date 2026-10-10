import React, { useState, useEffect } from 'react';
import { User, Language } from '../types';
import { 
  KeyRound, 
  Search, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  ExternalLink, 
  Phone 
} from 'lucide-react';
import { 
  subscribeToPasswordResetRequests, 
  updatePasswordResetRequestInFirestore, 
  deletePasswordResetRequestFromFirestore, 
  updateUserInFirestore 
} from '../lib/firebase';
import { normalizeNIC } from '../utils/userUtils';

interface AdminPasswordResetsManagementProps {
  users?: User[];
  setUsers?: React.Dispatch<React.SetStateAction<User[]>>;
  language?: Language;
}

export const AdminPasswordResetsManagement: React.FC<AdminPasswordResetsManagementProps> = ({
  users = [],
  setUsers,
  language = 'si',
}) => {
  const [resetRequests, setResetRequests] = useState<any[]>([]);
  const [copiedRequestId, setCopiedRequestId] = useState<string | null>(null);
  const [generatedMessages, setGeneratedMessages] = useState<Record<string, { tempPass: string; message: string }>>({});
  const [generatedRejectMessages, setGeneratedRejectMessages] = useState<Record<string, string>>({});
  const [resetFilter, setResetFilter] = useState<'all' | 'pending' | 'completed' | 'rejected'>('pending');
  const [resetSearch, setResetSearch] = useState('');
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  useEffect(() => {
    const unsub = subscribeToPasswordResetRequests((list) => {
      setResetRequests(list || []);
    });
    return () => unsub();
  }, []);

  // 🔑 තාවකාලික මුරපදය සාදා WhatsApp/SMS පණිවිඩය සකස් කිරීම
  const handleGenerateTempPassword = async (req: any, matchedUser: User) => {
    const tempPass = Math.floor(100000 + Math.random() * 900000).toString();

    await updateUserInFirestore(matchedUser.id, {
      password: tempPass,
      key: tempPass,
      tempPassword: tempPass,
      isTemporaryPassword: true,
      isPasswordChanged: false,
      updatedAt: new Date().toISOString()
    });

    if (setUsers) {
      setUsers((prev) => prev.map((u) => u.id === matchedUser.id ? {
        ...u,
        password: tempPass,
        key: tempPass,
        tempPassword: tempPass,
        isTemporaryPassword: true,
        isPasswordChanged: false
      } : u));
    }

    await updatePasswordResetRequestInFirestore(req.id, {
      status: 'completed',
      tempPassword: tempPass,
      matchedUserId: matchedUser.id,
      matchedUserName: matchedUser.name,
      processedAt: new Date().toISOString()
    });

    const userNic = matchedUser.nic || matchedUser.nicNumber || req.nic;
    const msg = `සහය සේවා (Sahaya Sewa) - මුරපද යාවත්කාලීන කිරීම

හිතවත් ${matchedUser.name},
ඔබගේ ගිණුමට ප්‍රවේශ වීම සඳහා තාවකාලික මුරපදය සකසා ඇත.

• තාවකාලික මුරපදය: ${tempPass}

කරුණාකර මෙම තාවකාලික මුරපදය භාවිතයෙන් පද්ධතියට ලොග් වන්න. ලොග් වූ වහාම ඔබගේ නව ස්ථිර මුරපදය ඇතුළත් කිරීමට විමසනු ඇත.

ප්‍රවේශ වීමට: https://supporservice.online

ස්තූතියි!
සහය සේවා කණ්ඩායම`;

    setGeneratedMessages((prev) => ({
      ...prev,
      [req.id]: { tempPass, message: msg }
    }));

    showNotification(`✅ ${matchedUser.name} සඳහා තාවකාලික මුරපදය (${tempPass}) සාර්ථකව සකසන ලදී!`);
  };

  // ⚠️ තොරතුරු වැරදි බව දන්වා WhatsApp / SMS පණිවිඩයක් ජනනය කිරීම
  const handleGenerateRejectMessage = async (req: any, matchedUser?: User) => {
    const userNic = req.nic || matchedUser?.nic || '';

    const msg = `සහය සේවා (Sahaya Sewa) - දැනුම්දීම

හිතවත්  ${req.name || matchedUser?.name || 'සාමාජිකයා'},
ඔබ විසින් ඉදිරිපත් කළ මුරපදය වෙනස් කිරීමේ ඉල්ලීමේ තොරතුරු පරීක්ෂා කිරීමේදී, ඔබ ලබා දුන් විස්තර (NIC: ${userNic}) අපගේ පද්ධතියේ ලියාපදිංචි වී ඇති ගිණුමේ තොරතුරු සමඟ නොගැළපෙන බව (වැරදි බව) නිරීක්ෂණය විය.

කරුණාකර ඔබ ලියාපදිංචි වීමේදී ලබා දුන් සත්‍ය ජාතික හැඳුනුම්පත් අංකය (NIC), දුරකථන අංකය හා සම්පුර්ණ නම නිවැරදිව ඇතුළත් කර නැවත ඉල්ලීමක් යොමු කරන්න.

ප්‍රවේශ වීමට: https://supporservice.online

ස්තූතියි!
සහය සේවා පරිපාලන කණ්ඩායම`;

    try {
      await updatePasswordResetRequestInFirestore(req.id, {
        status: 'rejected',
        rejectReason: 'තොරතුරු නොගැළපේ',
        processedAt: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Update reject status error:', e);
    }

    setGeneratedRejectMessages((prev) => ({
      ...prev,
      [req.id]: msg
    }));

    showNotification(`⚠️ ${req.name} සඳහා දෝෂ දැනුම්දීමේ පණිවිඩය සකස් කරන ලදී.`);
  };

  const handleCopyMessage = (reqId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRequestId(reqId);
    setTimeout(() => setCopiedRequestId(null), 3000);
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {notificationMsg && (
        <div className="fixed top-4 right-4 z-50 bg-[#07170e] text-emerald-300 border-2 border-emerald-500/80 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-bold">{notificationMsg}</span>
        </div>
      )}

      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-[#153422]">
        <div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>යාවත්කාලීන කිරීමට ඇති මුරපද ලැයිස්තුව</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            පරිශීලකයින්ගෙන් ලැබුණු මුරපද වෙනස් කිරීමේ ඉල්ලීම් පරීක්ෂා කර තාවකාලික මුරපද නිකුත් කරන්න.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-[#07170e] p-1.5 rounded-2xl border border-slate-200/80 dark:border-[#153422] text-xs font-bold">
          <button
            type="button"
            onClick={() => setResetFilter('pending')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              resetFilter === 'pending'
                ? 'bg-[#007a4b] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            රැඳී පවතී ({resetRequests.filter((r) => r.status === 'pending').length})
          </button>
          <button
            type="button"
            onClick={() => setResetFilter('completed')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              resetFilter === 'completed'
                ? 'bg-[#007a4b] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            නිකුත් කළ ({resetRequests.filter((r) => r.status === 'completed').length})
          </button>
          <button
            type="button"
            onClick={() => setResetFilter('rejected')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              resetFilter === 'rejected'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            වැරදි / ප්‍රතික්ෂේපිත ({resetRequests.filter((r) => r.status === 'rejected').length})
          </button>
          <button
            type="button"
            onClick={() => setResetFilter('all')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              resetFilter === 'all'
                ? 'bg-[#007a4b] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            සියල්ල ({resetRequests.length})
          </button>
        </div>
      </div>

      {/* Search Box */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="නම, NIC හෝ දුරකථන අංකය මඟින් සොයන්න..."
          value={resetSearch}
          onChange={(e) => setResetSearch(e.target.value)}
          className="w-full bg-white dark:bg-[#07170e] border border-slate-200 dark:border-[#153422] rounded-2xl py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs"
        />
      </div>

      {/* Requests List */}
      {resetRequests
        .filter((r) => {
          if (resetFilter !== 'all' && r.status !== resetFilter) return false;
          if (resetSearch.trim()) {
            const q = resetSearch.toLowerCase();
            const matchName = (r.name || '').toLowerCase().includes(q);
            const matchNic = (r.nic || '').toLowerCase().includes(q);
            const matchPhone = (r.phone || '').includes(q);
            return matchName || matchNic || matchPhone;
          }
          return true;
        }).length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-[#07170e] rounded-2xl border border-slate-200 dark:border-[#153422] text-slate-500 text-xs">
          මුරපද වෙනස් කිරීමේ ඉල්ලීම් කිසිවක් හමු නොවීය.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {resetRequests
            .filter((r) => {
              if (resetFilter !== 'all' && r.status !== resetFilter) return false;
              if (resetSearch.trim()) {
                const q = resetSearch.toLowerCase();
                const matchName = (r.name || '').toLowerCase().includes(q);
                const matchNic = (r.nic || '').toLowerCase().includes(q);
                const matchPhone = (r.phone || '').includes(q);
                return matchName || matchNic || matchPhone;
              }
              return true;
            })
            .map((req) => {
              const reqNic = normalizeNIC(req.nic || '');
              const reqPhoneDigits = (req.phone || '').replace(/[^0-9]/g, '');
              const reqPhoneSuffix = reqPhoneDigits.slice(-9);

              const matchedUser = users.find((u) => {
                const uNic = normalizeNIC(u.nic || u.nicNumber || '');
                const uPhoneDigits = (u.whatsappPhone || u.phone || '').replace(/[^0-9]/g, '');
                const uPhoneSuffix = uPhoneDigits.slice(-9);
                return (
                  (reqNic && uNic && reqNic === uNic) ||
                  (reqPhoneSuffix && uPhoneSuffix && reqPhoneSuffix === uPhoneSuffix)
                );
              });

              const currentMsg = generatedMessages[req.id]?.message;
              const currentTempPass =
                generatedMessages[req.id]?.tempPass ||
                req.tempPassword ||
                matchedUser?.tempPassword;

              return (
                <div
                  key={req.id}
                  className="p-4 bg-white dark:bg-[#07170e] rounded-2xl border border-slate-200 dark:border-[#153422] shadow-sm space-y-3.5"
                >
                  {/* Top Header of Request Card */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {req.name}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                          req.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : req.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {req.status === 'completed'
                          ? '✅ මුරපදය නිකුත් කර ඇත'
                          : req.status === 'rejected'
                          ? '❌ තොරතුරු වැරදියි'
                          : '⏳ රැඳී පවතී'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => deletePasswordResetRequestFromFirestore(req.id)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg transition-colors cursor-pointer"
                      title="ඉල්ලීම මකා දමන්න"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Request Details Grid */}
                  <div className="text-xs grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#0c1f14] p-3 rounded-xl border border-slate-100 dark:border-[#143220]">
                    <div>
                      <strong>ඉල්ලූ NIC:</strong> <span className="font-mono">{req.nic}</span>
                    </div>
                    <div>
                      <strong>දුරකථන අංකය:</strong> <span className="font-mono">{req.phone}</span>
                    </div>
                  </div>

                  {/* Account Verification & Matching Result */}
                  {matchedUser ? (
                    <div className="p-3.5 bg-emerald-50/90 dark:bg-[#0e271a] border border-emerald-300 dark:border-emerald-800/80 rounded-2xl text-xs space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="font-black text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>ගැලපෙන ගිණුම: {matchedUser.name}</span>
                          </span>
                          <p className="text-[11px] text-emerald-700 dark:text-emerald-300/80 mt-0.5">
                            NIC: {matchedUser.nic || matchedUser.nicNumber} | Phone: {matchedUser.whatsappPhone || matchedUser.phone || 'නැත'} | තත්ත්වය: {matchedUser.status}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleGenerateTempPassword(req, matchedUser)}
                            className="px-3.5 py-2 bg-[#007a4b] hover:bg-[#00633d] active:bg-[#005232] text-white font-bold rounded-xl cursor-pointer transition-all shadow-xs shrink-0 flex items-center justify-center gap-1.5"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>{req.status === 'completed' ? '🔄 නැවත Generate කරන්න' : '🔑 නව මුරපදය (Temp Code)'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleGenerateRejectMessage(req, matchedUser)}
                            className="px-3 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold rounded-xl cursor-pointer transition-all shadow-xs shrink-0 flex items-center justify-center gap-1.5"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>⚠️ තොරතුරු වැරදියි (දැනුම්දීම)</span>
                          </button>
                        </div>
                      </div>

                      {/* Generated Temp Password & Action Message */}
                      {currentTempPass && (
                        <div className="pt-2.5 border-t border-emerald-200 dark:border-emerald-800 space-y-2.5">
                          <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                            <span>තාවකාලික මුරපදය:</span>
                            <span className="font-mono text-sm bg-white dark:bg-black px-2.5 py-0.5 rounded-lg border border-emerald-400 text-emerald-700 dark:text-emerald-300 font-black">
                              {currentTempPass}
                            </span>
                          </div>

                          {currentMsg && (
                            <div className="space-y-2">
                              <pre className="text-[11px] p-3 bg-white dark:bg-black/60 rounded-xl whitespace-pre-wrap font-sans text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-[#1a3824] leading-relaxed">
                                {currentMsg}
                              </pre>
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleCopyMessage(req.id, currentMsg)}
                                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
                                >
                                  {copiedRequestId === req.id ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                      <span>පිටපත් විය!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" />
                                      <span>පණිවිඩය Copy කරගන්න</span>
                                    </>
                                  )}
                                </button>
                                <a
                                  href={`https://wa.me/${(req.phone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(currentMsg)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs active:scale-95 transition-all"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span>WhatsApp මඟින් යවන්න</span>
                                </a>
                                <a
                                  href={`sms:${(req.phone || '').replace(/[^0-9]/g, '')}?body=${encodeURIComponent(currentMsg)}`}
                                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs active:scale-95 transition-all"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                  <span>SMS මඟින් යවන්න</span>
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>මෙම NIC හෝ දුරකථන අංකයට සමාන ලියාපදිංචි ගිණුමක් පද්ධතියේ හමු නොවීය.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleGenerateRejectMessage(req)}
                        className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl cursor-pointer transition-all shadow-xs shrink-0 flex items-center justify-center gap-1.5"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>⚠️ තොරතුරු වැරදියි (දැනුම්දීම යවන්න)</span>
                      </button>
                    </div>
                  )}

                  {/* ⚠️ තොරතුරු වැරදි බවට සකස් වූ පණිවිඩය (Rejection Message) */}
                  {generatedRejectMessages[req.id] && (
                    <div className="p-3.5 bg-amber-50/90 dark:bg-[#20180d] border border-amber-300 dark:border-amber-800/80 rounded-2xl text-xs space-y-2.5 animate-fadeIn">
                      <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>⚠️ තොරතුරු වැරදි බවට පරිශීලකයා වෙත යැවීමට සකස් කළ පණිවිඩය:</span>
                      </div>

                      <pre className="text-[11px] p-3 bg-white dark:bg-black/60 rounded-xl whitespace-pre-wrap font-sans text-slate-800 dark:text-slate-200 border border-amber-200 dark:border-amber-900/60 leading-relaxed">
                        {generatedRejectMessages[req.id]}
                      </pre>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(req.id, generatedRejectMessages[req.id])}
                          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
                        >
                          {copiedRequestId === req.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>පිටපත් විය!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>පණිවිඩය Copy කරගන්න</span>
                            </>
                          )}
                        </button>
                        <a
                          href={`https://wa.me/${(req.phone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(generatedRejectMessages[req.id])}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs active:scale-95 transition-all"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>WhatsApp මඟින් යවන්න</span>
                        </a>
                        <a
                          href={`sms:${(req.phone || '').replace(/[^0-9]/g, '')}?body=${encodeURIComponent(generatedRejectMessages[req.id])}`}
                          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs active:scale-95 transition-all"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>SMS මඟින් යවන්න</span>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};
