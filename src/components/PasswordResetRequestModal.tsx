import React, { useState } from 'react';
import { KeyRound, User, Phone, Contact2, Send, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { submitPasswordResetRequest } from '../lib/firebase';

interface PasswordResetRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: string;
}

export const PasswordResetRequestModal: React.FC<PasswordResetRequestModalProps> = ({
  isOpen,
  onClose,
  language = 'si',
}) => {
  const [name, setName] = useState('');
  const [nic, setNic] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage('');

    const cleanName = name.trim();
    const cleanNic = nic.trim().toUpperCase().replace(/\s+/g, '');
    const cleanPhone = phone.trim().replace(/\s+/g, '');

    if (!cleanName || cleanName.length < 2) {
      setErrorMessage('කරුණාකර ඔබගේ නම ඇතුළත් කරන්න.');
      return;
    }

    const oldNicRegex = /^[0-9]{9}[VVXX]$/;
    const newNicRegex = /^[0-9]{12}$/;
    if (!oldNicRegex.test(cleanNic) && !newNicRegex.test(cleanNic)) {
      setErrorMessage('කරුණාකර නිවැරදි ජාතික හැඳුනුම්පත් අංකයක් ඇතුළත් කරන්න (උදා: 912345678V හෝ 199123456789).');
      return;
    }

    if (!cleanPhone || cleanPhone.length < 9) {
      setErrorMessage('කරුණාකර නිවැරදි දුරකථන අංකයක් ඇතුළත් කරන්න.');
      return;
    }

    try {
      setIsSubmitting(true);
      await submitPasswordResetRequest({
        name: cleanName,
        nic: cleanNic,
        phone: cleanPhone,
      });

      setIsSuccess(true);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err?.message || 'ඉල්ලීම යොමු කිරීම අසාර්ථක විය. කරුණාකර නැවත උත්සාහ කරන්න.');
    }
  };

  const handleResetAndClose = () => {
    setName('');
    setNic('');
    setPhone('');
    setIsSuccess(false);
    setErrorMessage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-white dark:bg-[#0c1811] border-2 border-emerald-500/80 rounded-3xl p-6 shadow-2xl relative overflow-hidden text-left">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#007a4b] via-emerald-400 to-[#007a4b]" />

        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#173222] mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 flex items-center justify-center text-[#007a4b] dark:text-emerald-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">කේතය වෙනස් කිරීමේ ඉල්ලීම</h3>
              <p className="text-[11px] text-slate-500 dark:text-emerald-300 font-medium">පරිපාලක (Admin) වෙත යොමු කෙරේ</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center font-bold"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isSuccess ? (
          <div className="py-4 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border-2 border-emerald-400 flex items-center justify-center mx-auto text-[#007a4b] dark:text-emerald-300">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-black text-slate-900 dark:text-white">ඉල්ලීම සාර්ථකව යොමු කෙරුණි!</h4>
              <p className="text-xs text-slate-600 dark:text-emerald-200 leading-relaxed">
                පද්ධති පරිපාලක (Admin) විසින් විස්තර පරීක්ෂා කර ඔබ ලබා දුන් <strong>{phone}</strong> අංකයට WhatsApp හෝ SMS මඟින් තාවකාලික මුරපදය එවනු ඇත.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetAndClose}
              className="w-full py-3 bg-[#00a86b] hover:bg-[#00925c] text-white font-black text-sm rounded-xl cursor-pointer"
            >
              තහවුරු කරන්න (හරි)
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              ඔබගේ මුරපදය අමතක වී ඇත්නම්, ලියාපදිංචි නම, NIC සහ දුරකථන අංකය ඇතුළත් කරන්න:
            </p>

            {errorMessage && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">ඔබගේ නම</label>
              <div className="relative flex items-center">
                <User className="absolute left-3 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  required
                  placeholder="උදා: කසුන් පෙරේරා"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#07120c] border border-slate-200 dark:border-[#162e20] rounded-xl py-2.5 pl-9 pr-3 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">ජාතික හැඳුනුම්පත් අංකය (NIC)</label>
              <div className="relative flex items-center">
                <Contact2 className="absolute left-3 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  required
                  placeholder="912345678V / 199123456789"
                  value={nic}
                  onChange={(e) => setNic(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#07120c] border border-slate-200 dark:border-[#162e20] rounded-xl py-2.5 pl-9 pr-3 text-xs sm:text-sm uppercase font-mono text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">දුරකථන අංකය (WhatsApp / SMS)</label>
              <div className="relative flex items-center">
                <Phone className="absolute left-3 text-slate-400 w-4 h-4" />
                <input
                  type="tel"
                  required
                  placeholder="0771234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#07120c] border border-slate-200 dark:border-[#162e20] rounded-xl py-2.5 pl-9 pr-3 text-xs sm:text-sm font-mono text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#00a86b] hover:bg-[#00925c] text-white font-black py-3 rounded-xl shadow-md text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>යොමු වෙමින් පවතී...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>ඉල්ලීම යොමු කරන්න</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
