import React, { useState, useEffect } from 'react';
import { MessageSquare, Phone, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, X, Sparkles } from 'lucide-react';
import { User, Language } from '../types';
import { syncUserWhatsappInFirestore } from '../lib/firebase';

interface UpdateWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserIdentifier?: string;
  currentUser?: User | null;
  users: User[];
  language?: Language;
  onSuccess?: (updatedUser: User) => void;
}

export const UpdateWhatsAppModal: React.FC<UpdateWhatsAppModalProps> = ({
  isOpen,
  onClose,
  targetUserIdentifier = '',
  currentUser,
  users,
  language = 'si',
  onSuccess,
}) => {
  const [identifierInput, setIdentifierInput] = useState('');
  const [newWhatsapp, setNewWhatsapp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [targetUser, setTargetUser] = useState<User | null>(null);

  // Identify the target user from identifier prop or current logged-in user
  useEffect(() => {
    if (!isOpen) {
      setErrorMessage('');
      setSuccessMessage('');
      return;
    }

    const searchKey = (targetUserIdentifier || currentUser?.userId || currentUser?.nicNumber || currentUser?.phone || '').trim().toLowerCase();
    
    if (searchKey) {
      setIdentifierInput(targetUserIdentifier || currentUser?.nicNumber || currentUser?.userId || '');
      
      const found = (users || []).find((u) => {
        if (!u) return false;
        const uId = (u.id || '').toLowerCase();
        const uUserId = (u.userId || '').toLowerCase();
        const uNic = (u.nicNumber || '').toLowerCase();
        const uPhone = (u.phone || '').replace(/\D/g, '');
        const cleanKey = searchKey.replace(/\D/g, '');
        
        return (
          (uId && uId === searchKey) ||
          (uUserId && uUserId === searchKey) ||
          (uNic && uNic === searchKey) ||
          (cleanKey && uPhone === cleanKey)
        );
      });

      if (found) {
        setTargetUser(found);
        setNewWhatsapp(found.whatsappNumber || found.phone || '');
      } else if (currentUser) {
        setTargetUser(currentUser);
        setNewWhatsapp(currentUser.whatsappNumber || currentUser.phone || '');
      }
    } else if (currentUser) {
      setTargetUser(currentUser);
      setIdentifierInput(currentUser?.nicNumber || currentUser?.userId || '');
      setNewWhatsapp(currentUser.whatsappNumber || currentUser.phone || '');
    }
  }, [isOpen, targetUserIdentifier, currentUser, users]);

  if (!isOpen) return null;

  const handlePhoneChange = (val: string) => {
    // Only allow numbers and +
    const cleaned = val.replace(/[^\d+]/g, '');
    setNewWhatsapp(cleaned);
    if (errorMessage) setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanNumber = newWhatsapp.trim().replace(/[^\d]/g, '');

    if (!cleanNumber) {
      setErrorMessage('කරුණාකර ඔබගේ නව WhatsApp අංකය ඇතුළත් කරන්න.');
      return;
    }

    if (cleanNumber.length < 9 || cleanNumber.length > 12) {
      setErrorMessage('වලංගු දුරකථන අංකයක් ඇතුළත් කරන්න (උදා: 0771234567).');
      return;
    }

    setIsSubmitting(true);

    try {
      const userKey = targetUser?.id || targetUser?.userId || targetUser?.nicNumber || identifierInput.trim() || currentUser?.id;
      
      if (!userKey) {
        setErrorMessage('පරිශීලක හැඳුනුම්පත හෝ NIC අංකය තහවුරු කරගත නොහැක.');
        setIsSubmitting(false);
        return;
      }

      // Sync to Firestore & Help Posts
      await syncUserWhatsappInFirestore(userKey, newWhatsapp.trim());

      // Also update local storage users
      try {
        const saved = localStorage.getItem('sahaya_users');
        if (saved) {
          const list: User[] = JSON.parse(saved);
          const updatedList = (list || []).map((u) => {
            if (!u) return u;
            if (
              (u.id && u.id === userKey) ||
              (u.userId && u.userId === userKey) ||
              (u.nicNumber && u.nicNumber === userKey) ||
              (u.phone && u.phone === userKey)
            ) {
              return {
                ...u,
                whatsappNumber: newWhatsapp.trim(),
                phone: newWhatsapp.trim(),
              };
            }
            return u;
          });
          localStorage.setItem('sahaya_users', JSON.stringify(updatedList));
        }
      } catch (e) {}

      const updatedTarget = targetUser
        ? { ...targetUser, whatsappNumber: newWhatsapp.trim(), phone: newWhatsapp.trim() }
        : ({
            id: userKey,
            userId: userKey,
            nicNumber: userKey,
            name: 'පරිශීලක',
            whatsappNumber: newWhatsapp.trim(),
            phone: newWhatsapp.trim(),
          } as any);

      setSuccessMessage('ඔබගේ නව WhatsApp අංකය සාර්ථකව පද්ධතියට එක් කරන ලදී!');
      if (onSuccess) {
        onSuccess(updatedTarget);
      }
    } catch (err: any) {
      console.error('WhatsApp update error:', err);
      setErrorMessage('යාවත්කාලීන කිරීමේදී දෝෂයක් ඇති විය. කරුණාකර නැවත උත්සාහ කරන්න.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedWaUrl = newWhatsapp
    ? `https://wa.me/${newWhatsapp.trim().replace(/^0/, '94').replace(/\D/g, '')}`
    : '#';

  return (
    <div
      id="update-whatsapp-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
    >
      <div className="w-full max-w-md bg-white dark:bg-[#071d12] border-2 border-emerald-500/80 dark:border-emerald-600/60 rounded-3xl p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,122,75,0.25)] relative overflow-hidden text-left transform transition-all animate-scaleUp">
        
        {/* Top Emerald Gradient Line */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-600 via-teal-400 to-emerald-600" />

        {/* Header with Title and Close Button */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#173222] mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
              <MessageSquare className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                නව WhatsApp අංකය යාවත්කාලීන කරන්න
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Update Active WhatsApp Number
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-rose-100 dark:bg-[#162e20] dark:hover:bg-rose-950/50 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 flex items-center justify-center font-black text-base transition-all cursor-pointer shadow-sm active:scale-90"
            title="වසන්න"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Informational Banner */}
        <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-xs text-slate-700 dark:text-emerald-200 space-y-1 mb-4 leading-relaxed">
          <div className="flex items-center gap-1.5 font-bold text-emerald-900 dark:text-emerald-300">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>සහය සේවා (Sahaya Seva) සෘජු සම්බන්ධතාව</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300">
            ඔබගේ දැන්වීම් හෝ සේවාවන් සඳහා පුද්ගලයන්ට ඔබව පහසුවෙන් WhatsApp මඟින් සම්බන්ධ කරගැනීමට හැකි වන පරිදි ඔබගේ සක්‍රීය WhatsApp අංකය මෙහි ඇතුළත් කර තහවුරු කරන්න.
          </p>
        </div>

        {/* User Card if detected */}
        {targetUser && (
          <div className="p-3 bg-slate-50 dark:bg-[#0c2419] rounded-2xl border border-slate-200 dark:border-emerald-900/60 text-xs mb-4 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">ගිණුම් හිමිකරු:</span>
              <strong className="text-slate-900 dark:text-white font-extrabold text-sm">{targetUser.name}</strong>
              <div className="text-[11px] font-mono text-slate-500 dark:text-emerald-400">
                NIC: {targetUser.nicNumber || targetUser.userId}
              </div>
            </div>
            <div className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-[10px] font-black rounded-lg border border-emerald-300 dark:border-emerald-700">
              තහවුරු විය
            </div>
          </div>
        )}

        {/* Form Body */}
        {successMessage ? (
          <div className="space-y-4 py-2 text-center animate-fadeIn">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/50 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900 dark:text-white">
                සාර්ථකව යාවත්කාලීන කරන ලදී!
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                නව WhatsApp අංකය: <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">{newWhatsapp}</strong>
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <a
                href={formattedWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-95 transition-all"
              >
                <MessageSquare className="w-4 h-4 fill-current" />
                <span>WhatsApp පරීක්ෂා කරන්න (Test Chat)</span>
              </a>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-[#162e20] dark:hover:bg-[#1f422e] text-slate-700 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer"
              >
                ඉදිරියට යන්න (Done)
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span className="font-semibold">{errorMessage}</span>
              </div>
            )}

            {!targetUser && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  ජාතික හැඳුනුම්පත් (NIC) හෝ පරිශීලක අංකය:
                </label>
                <input
                  type="text"
                  value={identifierInput}
                  onChange={(e) => setIdentifierInput(e.target.value)}
                  placeholder="උදා: 199412345678 හෝ 970181547V"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-emerald-800/80 bg-white dark:bg-[#0c2419] text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                නව WhatsApp අංකය (New WhatsApp Number):
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-600 dark:text-emerald-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  value={newWhatsapp}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="0771234567"
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl border-2 border-emerald-400/80 dark:border-emerald-600 bg-emerald-50/30 dark:bg-[#0c2419] text-slate-900 dark:text-white font-mono text-sm font-bold tracking-wide focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                  autoFocus
                />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                WhatsApp සක්‍රීයව ඇති 07XXXXXXXX ආකෘතියේ දුරකථන අංකයක් ඇතුළත් කරන්න.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm shadow-lg shadow-emerald-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>යාවත්කාලීන වෙමින් පවතී...</span>
                  </div>
                ) : (
                  <>
                    <span>නව WhatsApp අංකය තහවුරු කරන්න (Submit)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
