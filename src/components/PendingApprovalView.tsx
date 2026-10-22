import React, { useState } from 'react';
import { User, Language } from '../types';
import { translations } from '../data/translations';
import { Card3D } from './Card3D';
import { MedicalPlusBadge } from './MedicalPlusBadge';
import { 
  Clock, 
  ShieldAlert, 
  RefreshCw, 
  HelpCircle, 
  ArrowLeft, 
  PhoneCall, 
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  MessageSquare
} from 'lucide-react';

interface PendingApprovalViewProps {
  user: User;
  language: Language;
  onRefreshStatus: () => Promise<void> | void;
  onReRegister?: () => void;
  onNavigateToIssues: () => void;
  onBackToLogin: () => void;
}

export const PendingApprovalView: React.FC<PendingApprovalViewProps> = ({
  user,
  language,
  onRefreshStatus,
  onReRegister,
  onNavigateToIssues,
  onBackToLogin,
}) => {
  const t = translations[language] || translations.si;
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isRejected = user.status === 'rejected' || (user as any).isDeleted === true;

  const handleRefreshClick = async () => {
    try {
      setIsRefreshing(true);
      await onRefreshStatus();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto py-6 px-3">
      <Card3D glowColor={isRejected ? "rgba(239, 68, 68, 0.25)" : "rgba(234, 179, 8, 0.15)"}>
        
        {/* Top Status Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            {isRejected ? (
              <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center text-rose-500 shadow-[0_0_25px_rgba(239,68,68,0.4)] animate-pulse">
                <XCircle className="w-10 h-10" />
              </div>
            ) : (
              <MedicalPlusBadge size="md" showGlow animated />
            )}
          </div>

          {/* Status Badge */}
          {isRejected ? (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/20 border-2 border-rose-500 text-rose-300 font-black text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(239,68,68,0.3)] mb-3">
              <XCircle className="w-4 h-4 text-rose-400" />
              <span>අයදුම්පත ප්‍රතික්ෂේප විය (Application Rejected)</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-bold text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(234,179,8,0.2)] mb-3 animate-pulse">
              <Clock className="w-4 h-4" />
              <span>{t.pendingStatusBadge || 'සත්‍යාපනය වෙමින් පවතී'}</span>
            </div>
          )}

          {/* Heading */}
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-2 tracking-tight">
            {isRejected ? 'ඔබගේ ලියාපදිංචිය අනුමත කළ නොහැකි විය' : (t.pendingTitle || 'ගිණුම අනුමත වීම අපේක්ෂාවෙන්')}
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-sm mx-auto font-medium">
            {isRejected 
              ? 'පරිපාලක මණ්ඩලය විසින් ඔබගේ ලියාපදිංචිය පරීක්ෂා කර බලා ප්‍රතික්ෂේප කර ඇත.' 
              : (t.pendingSubtitle || 'ඔබේ තොරතුරු අපගේ පරිපාලක මණ්ඩලය විසින් පරීක්ෂා කරමින් පවතී')}
          </p>
        </div>

        {/* User Profile Card Preview */}
        <div className="bg-slate-800/60 border border-white/10 rounded-2xl p-4 sm:p-5 mb-5 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-4 pb-3 border-b border-white/10">
            <div className={`w-16 h-16 rounded-2xl overflow-hidden border-2 shadow-md bg-slate-700 flex-shrink-0 flex items-center justify-center ${
              isRejected ? 'border-rose-500/60' : 'border-yellow-500/40'
            }`}>
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
                {user?.name || 'සාමාජිකයා'}
              </h4>
              <p className="text-xs text-slate-400 font-mono">
                ID: <span className="text-yellow-400 font-semibold">{user?.userId || '-'}</span>
              </p>
              <p className="text-xs text-slate-400 font-mono">
                NIC: {user?.nicNumber || user?.userId || '-'}
              </p>
              {(user?.whatsappPhone || user?.phone || user?.whatsappNumber) && (
                <p className="text-xs text-emerald-400 font-mono flex items-center gap-1 mt-0.5">
                  <PhoneCall className="w-3 h-3" /> WhatsApp: {user.whatsappPhone || user.phone || user.whatsappNumber}
                </p>
              )}
            </div>
          </div>

          {/* Conditional Notification Box (Rejected vs Pending) */}
          {isRejected ? (
            <div className="bg-rose-950/60 border-2 border-rose-500/50 p-4 rounded-xl space-y-2 text-rose-100">
              <div className="flex items-center gap-1.5 font-black text-xs text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>ප්‍රතික්ෂේප වීමට හේතුව:</span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-white bg-rose-900/60 p-2.5 rounded-lg border border-rose-800 leading-relaxed">
                👉 {(user as any).rejectionReason || 'හැඳුනුම්පත් ඡායාරූපය අපැහැදිලි වීම හෝ ලබාදුන් තොරතුරුවල දෝෂයක් පැවතීම.'}
              </p>
              <p className="text-[11px] text-rose-300 font-medium pt-1">
                කරුණාකර නිවැරදි තොරතුරු හා පැහැදිලි හැඳුනුම්පත් ඡායාරූපයක් සහිතව නැවත ලියාපදිංචි වන්න.
              </p>
            </div>
          ) : (
            <div className="bg-emerald-950/40 border border-emerald-500/30 p-4 rounded-xl space-y-2">
              <p className="text-xs sm:text-sm text-emerald-200 font-bold leading-relaxed">
                "ලියාපදිංචිය සාර්ථකයි. Admin වරයා පරික්ෂාකර ඔබගේ වට්සැප් ගිණුමට දැනුම්දෙනතුරු මොහොතක් රැඳීසිටින්න."
              </p>
              <p className="text-[11px] text-emerald-400 font-black pt-1 border-t border-emerald-800/60">
                සහය සේවය සමඟ සම්බන්ධ වූ ඔබට ස්තුතියි....!
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          {/* If Rejected: Prominent Re-Register Button */}
          {isRejected ? (
            <button
              type="button"
              onClick={onReRegister || onBackToLogin}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded-2xl shadow-[0_10px_20px_rgba(16,185,129,0.3)] border-b-4 border-emerald-800 transition-all active:translate-y-1 active:border-b-0 flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              <span>නැවත ලියාපදිංචි වන්න (Re-Register)</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={isRefreshing}
              onClick={handleRefreshClick}
              className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-slate-950 font-black py-3.5 rounded-2xl shadow-[0_10px_20px_rgba(234,179,8,0.3)] border-b-4 border-yellow-700 transition-all active:translate-y-1 active:border-b-0 flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'පරීක්ෂා කරමින් පවතී...' : (t.checkStatusBtn || 'තත්ත්වය පරීක්ෂා කරන්න')}</span>
            </button>
          )}

          {/* Admin Help / Issues Button */}
          <button
            type="button"
            onClick={onNavigateToIssues}
            className="w-full bg-slate-800/80 hover:bg-slate-700 text-cyan-400 font-bold py-3 rounded-2xl border border-white/10 flex items-center justify-center gap-2 transition-all cursor-pointer text-xs sm:text-sm"
          >
            <HelpCircle className="w-4 h-4" />
            <span>{t.issuesHelpBtn || 'තාක්ෂණික සහාය ලබා ගන්න'}</span>
          </button>

          {/* Back to Login Button */}
          <button
            type="button"
            onClick={onBackToLogin}
            className="w-full text-slate-400 hover:text-white text-xs py-2 flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t.backToLogin || 'නැවත මුල් පිටුවට'}</span>
          </button>
        </div>

      </Card3D>
    </div>
  );
};

export default PendingApprovalView;

