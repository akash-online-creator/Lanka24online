import React from 'react';
import { User, Language } from '../types';
import { translations } from '../data/translations';
import { Card3D } from './Card3D';
import { MedicalPlusBadge } from './MedicalPlusBadge';
import { Clock, ShieldAlert, RefreshCw, HelpCircle, ArrowLeft, PhoneCall, CheckCircle } from 'lucide-react';

interface PendingApprovalViewProps {
  user: User;
  language: Language;
  onRefreshStatus: () => void;
  onNavigateToIssues: () => void;
  onBackToLogin: () => void;
}

export const PendingApprovalView: React.FC<PendingApprovalViewProps> = ({
  user,
  language,
  onRefreshStatus,
  onNavigateToIssues,
  onBackToLogin,
}) => {
  const t = translations[language];

  return (
    <div className="w-full max-w-lg mx-auto py-6">
      <Card3D glowColor="rgba(234, 179, 8, 0.15)">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <MedicalPlusBadge size="md" showGlow animated />
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-bold text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(234,179,8,0.2)] mb-4 animate-pulse">
            <Clock className="w-4 h-4" />
            <span>{t.pendingStatusBadge}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            {t.pendingTitle}
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-sm mx-auto">
            {t.pendingSubtitle}
          </p>
        </div>

        {/* User 3D Info Card Preview */}
        <div className="bg-slate-800/60 border border-white/10 rounded-2xl p-5 mb-6 backdrop-blur-md">
          <div className="flex items-center gap-4 mb-4 pb-4 border-b border-white/10">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-yellow-500/40 shadow-md bg-slate-700 flex-shrink-0 flex items-center justify-center">
              {user?.photoUrl && user.photoUrl.trim() !== '' ? (
                <img
                  src={user.photoUrl}
                  alt={user?.name || 'User'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <MedicalPlusBadge size="sm" showGlow={false} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-base font-bold text-slate-100 truncate">
                {user?.name || 'පොරොත්තු සාමාජිකයා'}
              </h4>
              <p className="text-xs text-slate-400 font-mono">
                ID: <span className="text-yellow-400 font-semibold">{user?.userId || '-'}</span>
              </p>
              <p className="text-xs text-slate-400 font-mono">
                NIC: {user?.nicNumber || user?.userId || '-'}
              </p>
              {user?.whatsappNumber && (
                <p className="text-xs text-emerald-400 font-mono flex items-center gap-1 mt-0.5">
                  <PhoneCall className="w-3 h-3" /> WhatsApp: {user.whatsappNumber}
                </p>
              )}
            </div>
          </div>

          {/* Pending Notification Text */}
          <div className="bg-emerald-950/40 border border-emerald-500/30 p-4 rounded-xl space-y-2">
            <p className="text-xs sm:text-sm text-emerald-200 font-bold leading-relaxed">
              "ලියාපදිංචිය සාර්ථකයි. Admin වරයා පරික්ෂාකර ඔබගේ වට්සැප් ගිණුමට දැනුම්දෙනතුරු මොහොතක් රෑදිසිටින්න."
            </p>
            <p className="text-[11px] text-emerald-400 font-black pt-1 border-t border-emerald-800/60">
              සහය සේවය සමඟ සම්බන්ධ වූ ඔබට ස්තුතියි....!
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={onRefreshStatus}
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold py-3.5 rounded-2xl shadow-[0_10px_20px_rgba(234,179,8,0.3)] border-b-4 border-yellow-700 transition-all active:translate-y-1 active:border-b-0 flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{t.checkStatusBtn}</span>
          </button>

          <button
            onClick={onNavigateToIssues}
            className="w-full bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold py-3 rounded-2xl border border-white/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
            <span>{t.issuesHelpBtn}</span>
          </button>

          <button
            onClick={onBackToLogin}
            className="w-full text-slate-400 hover:text-white text-xs py-2 flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t.backToLogin}</span>
          </button>
        </div>
      </Card3D>
    </div>
  );
};
