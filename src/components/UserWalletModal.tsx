import React, { useState, useEffect } from 'react';
import { User, CreditTransaction, Language } from '../types';
import { 
  getEffectiveCategoryFees, 
  BANK_DEPOSIT_INFO, 
  CATEGORY_CREDIT_FEES, 
  extractNumericId, 
  getUserCreditBalance, 
  getUserCreditTransactions, 
  SERVICE_REWARDS
} from '../utils/creditManager';
import { 
  Coins, 
  PlusCircle, 
  History, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Building, 
  Copy, 
  Check, 
  ShieldCheck, 
  Info, 
  X, 
  Gift, 
  AlertCircle,
  HelpCircle,
  Clock,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  CreditCard,
  QrCode,
  ScanLine
} from 'lucide-react';

interface UserWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User;
  currentUser?: User;
  language?: Language;
  initialTab?: 'summary' | 'topup' | 'rates';
  onOpenQrPay?: (tab?: 'my_qr' | 'scan_pay') => void;
  onUpdateUser?: (updatedUser: User) => void;
  theme?: string;
}

export const UserWalletModal: React.FC<UserWalletModalProps> = ({
  isOpen,
  onClose,
  user: propUser,
  currentUser,
  language = 'si',
  initialTab = 'summary',
  onOpenQrPay,
  onUpdateUser,
  theme,
}) => {
  const user = propUser || (currentUser as User);
  const [activeTab, setActiveTab] = useState<'summary' | 'topup' | 'rates'>(initialTab);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [showFeeList, setShowFeeList] = useState(false);
  const [ratesFilter, setRatesFilter] = useState<'all' | 'free' | 'paid'>('all');

  const allRates = React.useMemo(() => {
    const feesMap = typeof getEffectiveCategoryFees === 'function' ? getEffectiveCategoryFees() : (CATEGORY_CREDIT_FEES || {});
    return Object.values(feesMap)
      .filter((item) => item.id >= 1 && item.id <= 21)
      .sort((a, b) => a.id - b.id);
  }, [activeTab]);

  const displayRates = React.useMemo(() => {
    if (ratesFilter === 'free') return allRates.filter((r) => r.isFree || r.fee === 0);
    if (ratesFilter === 'paid') return allRates.filter((r) => !r.isFree && r.fee > 0);
    return allRates;
  }, [allRates, ratesFilter]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen || !user) return null;

  const currentBalance = getUserCreditBalance(user);
  const transactions = getUserCreditTransactions(user);
  const numericId = extractNumericId(user?.nicNumber || user?.userId);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (filterType === 'all') return true;
    if (filterType === 'income') return tx.amount > 0;
    if (filterType === 'expense') return tx.amount < 0;
    if (filterType === 'gift') return tx.type === 'welcome_gift' || tx.type === 'reward';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
      <div className="bg-white dark:bg-[#0a1b12] border-2 border-emerald-500/40 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl transition-all relative max-h-[92vh] flex flex-col">
        
        {/* Modal Top Header Bar */}
        <div className="bg-gradient-to-r from-emerald-800 via-[#007a4b] to-teal-700 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center font-black shadow-md shrink-0">
              <Coins className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  ක්‍රෙඩිට් ගිණුම සහ ශේෂය (Credit Wallet)
                </h2>
                <span className="bg-amber-400/30 text-amber-200 border border-amber-400/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Rs. Credits
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 font-medium">
                {user?.name || 'පරිශීලක'} • ඔබගේ ID: <span className="font-mono font-bold text-amber-300">{numericId}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="වසන්න"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-slate-200 dark:border-[#163a25] bg-slate-50 dark:bg-[#07150d] px-4 pt-2 gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-extrabold border-b-2 transition-all cursor-pointer ${
              activeTab === 'summary'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-[#0a1b12] rounded-t-xl'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>ගිණුම් ශේෂය සහ ගනුදෙනු</span>
          </button>

          <button
            onClick={() => setActiveTab('topup')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-extrabold border-b-2 transition-all cursor-pointer ${
              activeTab === 'topup'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-[#0a1b12] rounded-t-xl'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <PlusCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>මුදල් එකතු කිරීමට (Top-Up)</span>
          </button>

          <button
            onClick={() => setActiveTab('rates')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-extrabold border-b-2 transition-all cursor-pointer ${
              activeTab === 'rates'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-[#0a1b12] rounded-t-xl'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>දැන්වීම් ගාස්තු</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-100">

          {/* TAB 1: SUMMARY & TRANSACTIONS */}
          {activeTab === 'summary' && (
            <div className="space-y-6">
              
              {/* 1. Main Golden Balance Card */}
              <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-emerald-700 rounded-3xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
                
                <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
                  <div>
                    <div className="flex items-center gap-1.5 text-amber-100 text-xs font-bold uppercase tracking-wider mb-1">
                      <Coins className="w-4 h-4 text-amber-200" />
                      <span>දැනට ඉතිරිව ඇති ශේෂය (Available Balance)</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow-sm">
                        රු. {currentBalance.toFixed(2)}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-amber-200">
                        Credits
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-100 mt-1 font-medium">
                      සෑම රු. 1.00 ක බැංකු තැන්පතුවක් සඳහාම ක්‍රෙඩිට් 1.00 ක් හිමිවේ.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('rates')}
                      className="mt-2.5 px-3 py-1.5 rounded-xl bg-black/25 hover:bg-black/40 border border-white/20 text-white text-[11px] font-extrabold flex items-center gap-1.5 transition-all cursor-pointer w-fit"
                    >
                      <Layers className="w-3.5 h-3.5 text-amber-300" />
                      <span>සේවා ගාස්තු සහ වලංගු කාලසීමාවන් (21 Services) බලන්න ➔</span>
                    </button>
                  </div>

                  {/* Top-up CTA & QR Pay Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    {onOpenQrPay && (
                      <>
                        <button
                          onClick={() => {
                            onClose();
                            onOpenQrPay('scan_pay');
                          }}
                          className="px-3.5 py-2.5 bg-amber-400 hover:bg-amber-300 text-amber-950 font-black rounded-2xl text-xs sm:text-sm shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                          title="QR ස්කෑන් කර හෝ කේතය ලබාදී මුදල් ගෙවන්න"
                        >
                          <ScanLine className="w-4 h-4 text-amber-950" />
                          <span>Scan & Pay (මුදල් ගෙවීමට)</span>
                        </button>

                        <button
                          onClick={() => {
                            onClose();
                            onOpenQrPay('my_qr');
                          }}
                          className="px-3.5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-emerald-100 border border-emerald-400/40 font-black rounded-2xl text-xs sm:text-sm shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                          title="මගේ QR කේතය සහ Pay Code පෙන්වන්න"
                        >
                          <QrCode className="w-4 h-4 text-emerald-300" />
                          <span>මගේ QR (ලබාගැනීමට)</span>
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => setActiveTab('topup')}
                      className="px-4 py-2.5 bg-white text-emerald-900 hover:bg-amber-50 font-black rounded-2xl text-xs sm:text-sm shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer shrink-0"
                    >
                      <PlusCircle className="w-4 h-4 text-emerald-600" />
                      <span>Top-Up</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Free Tier Model & Welcome Gift Info Card */}
              <div className="bg-gradient-to-r from-emerald-900 via-[#005e37] to-teal-900 border border-emerald-500/40 rounded-2xl p-4 text-white shadow-md flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center font-black text-xl shrink-0 shadow-sm mt-0.5">
                  🎁
                </div>
                <div className="text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-amber-300">
                      "රුපියල් 100 නොමිලේ" (Free Tier Model)
                    </span>
                    <span className="bg-emerald-500/30 text-emerald-200 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      0% Upfront
                    </span>
                  </div>
                  <p className="text-emerald-100 leading-relaxed">
                    සෑම නව සාමාජිකයෙකුටම සහ සේවා සපයන්නෙකුටම ආරම්භයේදීම රු. 100 ක ක්‍රෙඩිට් නොමිලේ හිමිවේ (Device ආරක්ෂණ නීති යටතේ එක් දුරකථනයකට එකක් බැගින්). ඇප් එකේ සේවාවන් අත්විඳ වැඩ පහසු කරගත් පසු, ඉදිරි දැන්වීම් සඳහා ඉතා කුඩා ක්ෂුද්‍ර මුදලක් හෝ ස්වේච්ඡා දායකත්වයක් පමණක් අය කෙරේ.
                  </p>
                </div>
              </div>

              {/* 🤝 Community Social Mission Pledge */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-950/80 via-[#0a2f24] to-emerald-950/90 border border-teal-500/30 text-white text-xs space-y-1.5 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-base">🤝</span>
                  <span className="font-extrabold text-teal-200">
                    අපේම ප්‍රජාව වෙනුවෙන් සමාජ සත්කාරක වේදිකාවකි
                  </span>
                </div>
                <p className="text-teal-100/90 text-[11px] leading-relaxed">
                  "මෙම ඇප් එක නඩත්තු වන්නේ ඔබ භාවිතා කරන සේවාවන්ගෙන් ලැබෙන ඉතා කුඩා දායකත්වයෙන් බැවින්, බලහත්කාරයෙන් මුදල් අය කිරීමක් නොමැත. ඔබ ලබාදෙන සහයෝගයට සහ අවංකත්වයට ස්තූතියි!"
                </p>
              </div>

              {/* 🛡️ Trust & Insurance Platform Guarantee Banner */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 text-emerald-200 text-xs space-y-1">
                <div className="flex items-center gap-2 text-amber-300 font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>🛡️ Trust & Insurance වේදිකා වගකීම් සහතිකය:</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">
                  ඇප් එකෙන් බාහිරව සිදුකරන මුදල් ගනුදෙනු සඳහා වේදිකාවේ කිසිදු වගකීමක් හෝ මැදිහත්වීමක් නොමැත. පාරිභෝගික සහ සේවා සපයන්නාගේ ආරක්ෂාව වෙනුවෙන් සැමවිටම ඇප් එක තුළම රැඳී ගනුදෙනු කරන්න.
                </p>
              </div>

              {/* 2. Important Notice Regarding No-Show / Travel Compensation */}
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 rounded-2xl p-3.5 sm:p-4 flex items-start gap-3 text-xs leading-relaxed text-amber-950 dark:text-amber-200 shadow-xs">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-black text-amber-900 dark:text-amber-100 block mb-0.5">
                    මගහැරීම් ගමන් ගාස්තු ප්‍රතිපත්තිය:
                  </span>
                  යම් අයකුගෙන් සහයක් ඉල්ලා, සහය වීමට පැමිණි පුද්ගලයාව අසාධාරණ ලෙස මගහැරීමකට ලක්කළහොත් ඔහුට අදාළ ගමන් ගාස්තු හා සේවා වන්දි ඔබගේ ගිණුමෙන් අයවීමට යටත් වේ.
                </div>
              </div>

              {/* 3. Transaction Summary Table & History */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                      ගණුදෙනු පිළිබඳ විස්තර (Transaction History)
                    </h3>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#112319] p-1 rounded-xl text-[11px] font-bold">
                    <button
                      onClick={() => setFilterType('all')}
                      className={`px-2 py-1 rounded-lg transition-all ${
                        filterType === 'all'
                          ? 'bg-white dark:bg-[#183927] text-slate-900 dark:text-white shadow-xs font-black'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      සියල්ල ({transactions.length})
                    </button>
                    <button
                      onClick={() => setFilterType('income')}
                      className={`px-2 py-1 rounded-lg transition-all ${
                        filterType === 'income'
                          ? 'bg-emerald-600 text-white shadow-xs font-black'
                          : 'text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      බැර වූ (+)
                    </button>
                    <button
                      onClick={() => setFilterType('expense')}
                      className={`px-2 py-1 rounded-lg transition-all ${
                        filterType === 'expense'
                          ? 'bg-rose-600 text-white shadow-xs font-black'
                          : 'text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      අය වූ (-)
                    </button>
                  </div>
                </div>

                {/* Transactions List */}
                {filteredTransactions.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 dark:bg-[#0b1d13] rounded-2xl border border-dashed border-slate-300 dark:border-[#1d412d] p-6">
                    <Coins className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-2 opacity-50" />
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                      තවමත් ගනුදෙනු වාර්තා වී නොමැත.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filteredTransactions.map((tx, txIdx) => {
                      const isPositive = tx.amount > 0;
                      return (
                        <div
                          key={`wallet_tx_${tx.id || 't'}_${txIdx}`}
                          className="bg-white dark:bg-[#0c1f15] border border-slate-200 dark:border-[#163a25] rounded-2xl p-3.5 sm:p-4 hover:border-emerald-500/50 transition-all flex items-center justify-between gap-3 shadow-xs"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                isPositive
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300'
                                  : 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-300'
                              }`}
                            >
                              {isPositive ? (
                                <ArrowDownLeft className="w-5 h-5" />
                              ) : (
                                <ArrowUpRight className="w-5 h-5" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                                  {tx.title}
                                </h4>
                                {tx.type === 'welcome_gift' && (
                                  <span className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-black px-1.5 py-0.2 rounded-md">
                                    🎁 ත්‍යාග මුදල්
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {tx.description}
                              </p>
                              <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-[#6a907a] mt-1 font-mono">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {tx.timestamp}
                                </span>
                                <span>•</span>
                                <span>ශේෂය: රු. {tx.balanceAfter.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={`text-sm sm:text-base font-black font-mono block ${
                                isPositive
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {isPositive ? `+ රු. ${tx.amount.toFixed(2)}` : `- රු. ${Math.abs(tx.amount).toFixed(2)}`}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                              {isPositive ? 'CREDITED' : 'CHARGED'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: TOP-UP VIA BANK DEPOSIT INSTRUCTIONS */}
          {activeTab === 'topup' && (
            <div className="space-y-6">
              
              <div className="bg-emerald-50 dark:bg-[#0d261a] border-2 border-emerald-500/40 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-emerald-200 dark:border-[#1b432e]">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-emerald-950 dark:text-emerald-100">
                      ගිණුමට මුදල් බැර කරන ආකාරය (Bank Deposit Instructions)
                    </h3>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
                      පහත සඳහන් බැංකු ගිණුමට මුදල් තැන්පත් කර ඔබගේ ගිණුම සක්‍රීය කරගන්න.
                    </p>
                  </div>
                </div>

                {/* Golden Instruction banner */}
                <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-700/80 p-3.5 rounded-2xl text-xs sm:text-sm font-bold text-amber-950 dark:text-amber-100 leading-relaxed shadow-xs flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-amber-800 dark:text-amber-300 font-black">අනිවාර්ය උපදෙස්:</span> පහත සඳහන් ගිණුමට මුදල් බැර කර <span className="underline font-black text-amber-900 dark:text-amber-200">Remark / Reference</span> ලෙස ඇති කොටසට අනිවාර්යයෙන්ම <span className="bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 px-1.5 py-0.5 rounded font-mono font-black">ඔබගේ හැඳුනුම්පත් අංකය ඉංග්‍රීසි අකුරු නොමැතිව ({numericId})</span> සටහන් කරන්න.
                  </div>
                </div>

                {/* 🛡️ Admin Account Verification & Protection Badge */}
                <div className="bg-emerald-100/80 dark:bg-emerald-950/70 border border-emerald-400/80 dark:border-emerald-600 rounded-2xl p-3 flex items-center justify-between gap-2 shadow-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <span className="text-xs font-black text-emerald-950 dark:text-emerald-100 block">
                        ආරක්ෂිත සහ සත්‍යාපිත නිල බැංකු ගිණුම (Admin Verified & Protected)
                      </span>
                      <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-medium">
                        මෙම ගිණුම් විස්තර පරිපාලක විසින් තහවුරු කර ඇති අතර කිසිදු බාහිර පාර්ශවයකට වෙනස් කළ නොහැක.
                      </span>
                    </div>
                  </div>
                  <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shrink-0">
                    LOCKED 🔒
                  </span>
                </div>

                {/* Bank Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  
                  {/* Bank Name */}
                  <div className="bg-white dark:bg-[#07170e] p-3.5 rounded-2xl border border-emerald-200 dark:border-[#173a26] shadow-2xs">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                      බැංකුව (Bank) :-
                    </span>
                    <p className="text-sm font-black text-slate-900 dark:text-white">
                      {BANK_DEPOSIT_INFO.bankNameEn}
                    </p>
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      {BANK_DEPOSIT_INFO.bankNameSi}
                    </p>
                  </div>

                  {/* Account Holder Name */}
                  <div className="bg-white dark:bg-[#07170e] p-3.5 rounded-2xl border border-emerald-200 dark:border-[#173a26] shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                        ගිණුම් හිමියාගේ නම (Account Holder) :-
                      </span>
                      <button
                        onClick={() => handleCopy(BANK_DEPOSIT_INFO.accountHolderEn, 'holder')}
                        className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 p-1 text-xs flex items-center gap-1 font-bold"
                        title="Copy"
                      >
                        {copiedField === 'holder' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedField === 'holder' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                      {BANK_DEPOSIT_INFO.accountHolderSi}
                    </p>
                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                      {BANK_DEPOSIT_INFO.accountHolderEn}
                    </p>
                  </div>

                  {/* Account Number */}
                  <div className="bg-white dark:bg-[#07170e] p-3.5 rounded-2xl border-2 border-emerald-500 dark:border-emerald-500/80 shadow-xs sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-emerald-800 dark:text-emerald-300 block mb-0.5">
                        ගිණුම් අංකය (Account Number) :-
                      </span>
                      <button
                        onClick={() => handleCopy(BANK_DEPOSIT_INFO.accountNumber, 'acc')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs flex items-center gap-1 font-bold shadow-xs cursor-pointer active:scale-95"
                        title="Copy Account Number"
                      >
                        {copiedField === 'acc' ? <Check className="w-3.5 h-3.5 text-amber-300" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedField === 'acc' ? 'Copied!' : 'Copy Number'}</span>
                      </button>
                    </div>
                    <p className="text-xl sm:text-2xl font-black font-mono tracking-wider text-emerald-950 dark:text-emerald-100">
                      {BANK_DEPOSIT_INFO.accountNumber}
                    </p>
                  </div>

                  {/* Branch */}
                  <div className="bg-white dark:bg-[#07170e] p-3.5 rounded-2xl border border-emerald-200 dark:border-[#173a26] shadow-2xs">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                      ශාඛාව (Branch) :-
                    </span>
                    <p className="text-sm font-black text-slate-900 dark:text-white">
                      {BANK_DEPOSIT_INFO.branchSi} ({BANK_DEPOSIT_INFO.branchEn})
                    </p>
                  </div>

                  {/* Remark / Reference */}
                  <div className="bg-amber-100/70 dark:bg-amber-950/60 p-3.5 rounded-2xl border-2 border-amber-400 dark:border-amber-600 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-amber-900 dark:text-amber-200 block mb-0.5">
                        Remark / Reference (සටහන) :-
                      </span>
                      <button
                        onClick={() => handleCopy(numericId, 'remark')}
                        className="px-2.5 py-1 rounded-lg bg-amber-500 text-amber-950 hover:bg-amber-400 text-xs flex items-center gap-1 font-black shadow-xs cursor-pointer active:scale-95"
                        title="Copy Remark"
                      >
                        {copiedField === 'remark' ? <Check className="w-3.5 h-3.5 text-emerald-950" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedField === 'remark' ? 'Copied!' : 'Copy Remark'}</span>
                      </button>
                    </div>
                    <p className="text-base sm:text-lg font-black font-mono text-amber-950 dark:text-amber-100">
                      {numericId}
                    </p>
                    <span className="text-[10px] text-amber-800 dark:text-amber-300 font-semibold">
                      (ඔබගේ ජා.හැ. අංකය ඉංග්‍රීසි අකුරු නොමැතිව)
                    </span>
                  </div>

                </div>

                {/* Footer Help */}
                <div className="pt-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
                  💡 මුදල් තැන්පත් කිරීමෙන් පසු මිනිත්තු කිහිපයක් ඇතුළත පරිපාලක (Admin) විසින් ඔබගේ ගිණුමට ක්‍රෙඩිට් බැර කරනු ඇත. කිසියම් ප්‍රමාදයක් වේනම් ඇප් සහය (Issues Help) හරහා ස්ලිප් පත යොමුකළ හැක.
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: CATEGORY & ADVERTISEMENT POSTING FEES */}
          {activeTab === 'rates' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-emerald-950 via-[#0a2f20] to-teal-950 border border-emerald-500/40 rounded-2xl p-4 text-white shadow-sm">
                <div className="flex items-center gap-2 mb-1.5">
                  <Coins className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm sm:text-base font-black text-white">
                    සේවා ගාස්තු සහ වලංගු කාලසීමාවන් (Service Fees & Durations)
                  </h3>
                </div>
                <p className="text-xs text-emerald-100/90 font-medium leading-relaxed">
                  සහය සේවා පද්ධතියේ එක් එක් සේවා සහ දැන්වීම් සඳහා අයවන ගාස්තු හා එක් වරක් මුදල් ගෙවූ පසු දැන්වීම වලංගු කාලසීමාවන් පහත දැක්වේ.
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setRatesFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    ratesFilter === 'all'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-[#071910] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#0c2b1c]'
                  }`}
                >
                  සියලු සේවාවන් (21)
                </button>
                <button
                  type="button"
                  onClick={() => setRatesFilter('free')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    ratesFilter === 'free'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-[#071910] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#0c2b1c]'
                  }`}
                >
                  නොමිලේ සේවාවන් (12)
                </button>
                <button
                  type="button"
                  onClick={() => setRatesFilter('paid')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    ratesFilter === 'paid'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-[#071910] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#0c2b1c]'
                  }`}
                >
                  ගෙවීම් සහිත සේවාවන් (9)
                </button>
              </div>

              {/* 21 Services Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {displayRates.map((item) => (
                  <div
                    key={`credit_fee_${item.key}_${item.id}`}
                    className={`border rounded-2xl p-3.5 space-y-2 transition-all shadow-2xs ${
                      item.isFree || item.fee === 0
                        ? 'bg-emerald-50/50 dark:bg-[#061c12] border-emerald-200 dark:border-[#134228] hover:border-emerald-500'
                        : 'bg-white dark:bg-[#08180f] border-slate-200 dark:border-[#153422] hover:border-amber-500'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-emerald-600/15 text-emerald-800 dark:text-emerald-300 font-mono font-black text-xs flex items-center justify-center shrink-0">
                          {String(item.id).padStart(2, '0')}
                        </span>
                        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white leading-tight">
                          {item.nameSi}
                        </h4>
                      </div>

                      <div className="text-right shrink-0">
                        {item.isFree || item.fee === 0 ? (
                          <span className="inline-block px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-black text-xs border border-emerald-500/30">
                            නොමිලේ
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono font-black text-xs sm:text-sm border border-amber-500/30">
                            රු. {item.fee.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-900 dark:text-amber-300 bg-amber-500/10 dark:bg-amber-500/15 px-2.5 py-1 rounded-xl border border-amber-500/20">
                      <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="text-slate-600 dark:text-slate-400">වලංගු කාලසීමාව:</span>
                      <span className="font-extrabold">{item.durationSi}</span>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                      {item.id >= 19 && item.id <= 21 ? 'කැමතිනම් පමණක් මුදල් ගෙවා ලබාගත හැක - කිසිදු ස්වයංක්‍රීය මුදල් අයවීමක් සිදුනොවේ' : item.descriptionSi}
                    </p>
                  </div>
                ))}
              </div>
              {/* 🎁 Service Rewards Section (11 Rewards) */}
              <div className="bg-gradient-to-br from-emerald-900/90 via-[#0a2b1d] to-teal-950/90 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 text-white shadow-md space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-emerald-500/30">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-lg font-black shrink-0 border border-emerald-500/30">
                    🎁
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-amber-300">
                      සේවාවන් සඳහා ලැබෙන ත්‍යාග මුදල් (11 Rewards)
                    </h3>
                    <p className="text-[11px] text-emerald-100/80 font-medium">
                      ප්‍රජාවට සහය වෙමින් පහත සේවාවන් සිදුකිරීමේදී ඔබගේ ගිණුමට එකතුවන ත්‍යාග ක්‍රෙඩිට් මුදල්:
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { id: 1, title: 'රතු එළිය', reward: 2.00, desc: 'අනතුරුදායක ස්ථාන හෝ රතු එළි අනතුරු ඇඟවීම් පළකිරීම වෙනුවෙන්' },
                    { id: 2, title: 'ස්ථානය සුරකීම', reward: 2.00, desc: 'වැදගත් ස්ථාන හා තොරතුරු පද්ධතියට එක්කිරීම වෙනුවෙන්' },
                    { id: 3, title: 'ලේ පරිත්‍යාගශීලීන්', reward: 10.00, desc: 'ලේ දායකයෙකු ලෙස ලියාපදිංචි වීම හා දත්ත ලබාදීම වෙනුවෙන්' },
                    { id: 4, title: 'සහන කඳවුරු ලියාපදිංචිය', reward: 20.00, desc: 'ආපදා සහන කඳවුරු හා ආධාර මධ්‍යස්ථාන තොරතුරු එක්කිරීම වෙනුවෙන්' },
                    { id: 5, title: 'හදිසි සේවා අංක', reward: 2.00, desc: 'ප්‍රාදේශීය හදිසි දුරකථන අංක පද්ධතියට එක්කිරීම වෙනුවෙන්' },
                    { id: 6, title: 'හමුවනලද', reward: 2.00, desc: 'නැතිවූ හෝ හමුවූ භාණ්ඩ/පුද්ගලයින් පිළිබඳ තොරතුරු පළකිරීම වෙනුවෙන්' },
                    { id: 7, title: 'වෘත්තීය සේවා පළකිරීම', reward: 10.00, desc: 'තමන්ගේ වෘත්තීය සේවාවන් ඇප් එකෙහි ලියාපදිංචි කිරීම වෙනුවෙන්' },
                    { id: 8, title: 'නවාතැන් පළකිරීම', reward: 10.00, desc: 'කුලී හෝ නවාතැන් පහසුකම් තොරතුරු පළකිරීම වෙනුවෙන්' },
                    { id: 9, title: 'රැකියා පළකිරීම', reward: 5.00, desc: 'ඇබෑර්තු හා රැකියා අවස්ථා තොරතුරු පළකිරීම වෙනුවෙන්' },
                    { id: 10, title: 'ඉක්මන් සේවා සහයකයාහට', reward: 10.00, desc: 'හදිසි ඉක්මන් සහය ඉල්ලීමකට සාර්ථකව ප්‍රතිචාර දැක්වීම වෙනුවෙන්' },
                    { id: 11, title: 'සාමාන්‍ය සේවා සහයවන්නාහට', reward: 10.00, desc: 'සාමාන්‍ය ප්‍රජා සහය ඉල්ලීමකට සාර්ථකව සහයවීම වෙනුවෙන්' },
                  ].map((rew) => (
                    <div key={`reward_card_${rew.id}`} className="bg-emerald-950/60 border border-emerald-500/30 rounded-xl p-3 flex flex-col justify-between gap-1.5 shadow-2xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                            {rew.id}
                          </span>
                          <h4 className="text-xs font-bold text-white">
                            {rew.title}
                          </h4>
                        </div>
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono font-black text-xs shrink-0 shadow-xs">
                          +රු. {rew.reward.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-[10px] text-emerald-100/70 font-medium leading-tight">
                        {rew.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              </div>
          )}

        </div>

        {/* Modal Bottom Footer */}
        <div className="p-4 bg-slate-50 dark:bg-[#07150d] border-t border-slate-200 dark:border-[#163a25] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-bold">
            <span>වත්මන් ශේෂය:</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-mono font-black text-sm">
              රු. {currentBalance.toFixed(2)}
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-[#153322] dark:hover:bg-[#1d4730] text-slate-800 dark:text-white font-bold text-xs sm:text-sm transition-all cursor-pointer"
          >
            වසන්න (Close)
          </button>
        </div>

      </div>
    </div>
  );
};



export default UserWalletModal;

