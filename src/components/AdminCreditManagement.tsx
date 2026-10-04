import React, { useState, useMemo } from 'react';
import type { User, CreditTransaction, CreditTransactionType, Language } from '../types';
import { deduplicateUsers } from '../utils/userUtils';
import { 
  extractNumericId, 
  getUserCreditBalance, 
  getStoredCreditTransactions, 
  saveCreditTransactions, 
  addCreditByAdmin, 
  deductCreditByAdmin,
  CATEGORY_CREDIT_FEES,
  formatCreditDate,
  BANK_DEPOSIT_INFO
} from '../utils/creditManager';
import { 
  Coins, 
  Search, 
  PlusCircle, 
  MinusCircle,
  Gift, 
  History, 
  UserCheck, 
  ShieldCheck, 
  Building, 
  ArrowDownLeft, 
  ArrowUpRight, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  Sliders, 
  RefreshCw, 
  DollarSign, 
  FileText, 
  X,
  CreditCard,
  User as UserIcon,
  Phone,
  Filter,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';

export const ADMIN_ADD_REASON_PRESETS = [
  { id: 'boc_slip', label: '🏦 BOC බැංකු තැන්පතු ස්ලිප් පත තහවුරු විය (BOC Bank Slip Verified)' },
  { id: 'online_transfer', label: '💳 ඔන්ලයින් බැංකු මුදල් හුවමාරුව (Online Fund Transfer Confirmed)' },
  { id: 'welcome_gift', label: '🎉 නව සාමාජික පිළිගැනීමේ ප්‍රසාද මුදල (Welcome Gift Bonus - Rs. 100)' },
  { id: 'special_reward', label: '🎁 විශේෂ සේවා දිරිගැන්වීමේ ත්‍යාගය (Special Contribution Reward)' },
  { id: 'community_bonus', label: '🤝 ප්‍රජා සේවා සහභාගීත්ව ප්‍රසාද මුදල (Community Participation Bonus)' },
  { id: 'ad_refund', label: '🔄 දැන්වීම් ගාස්තු ගැලපීම / ආපසු බැර කිරීම (Ad Fee Refund / Adjustment)' },
  { id: 'system_correction_add', label: '🔧 තාක්ෂණික දෝෂ නිවැරදි කර බැර කිරීම (System Correction - Credit)' },
  { id: 'custom_other_add', label: '✍️ වෙනත් හේතුවක් (Other Reason - Custom Note)' },
];

export const ADMIN_DEDUCT_REASON_PRESETS = [
  { id: 'invalid_deposit', label: '🚫 අවලංගු / වැරදි බැංකු ස්ලිප්පත් මුදල් ඉවත් කිරීම (Invalid / Reversed Bank Slip)' },
  { id: 'penalty_noshow', label: '⚖️ මගහැරීම් ගමන් ගාස්තු වන්දි අය කිරීම (No-show Travel Compensation Fee)' },
  { id: 'violation_penalty', label: '⚠️ ප්‍රජා නීති උල්ලංඝනය කිරීමේ දඩ මුදල් (Community Rule Violation Penalty)' },
  { id: 'duplicate_removal', label: '🔁 අත්වැරදීමකින් දෙවරක් බැර වූ මුදල් ඉවත් කිරීම (Duplicate Credit Reversal)' },
  { id: 'fraud_deduction', label: '🛡️ වංචනික ගනුදෙනු අවලංගු කර ඉවත් කිරීම (Fraudulent Credit Cancellation)' },
  { id: 'ad_fee_manual', label: '📢 ප්‍රචාරණ / විශේෂ දැන්වීම් සේවා ගාස්තු අය කිරීම (Special Ad Posting Fee Debit)' },
  { id: 'system_correction_deduct', label: '🔧 තාක්ෂණික දෝෂ නිවැරදි කර අඩු කිරීම (System Correction - Debit)' },
  { id: 'custom_other_deduct', label: '✍️ වෙනත් හේතුවක් (Other Reason - Custom Note)' },
];

interface AdminCreditManagementProps {
  users: User[];
  onUpdateUser?: (updatedUser: User) => void;
  language?: Language;
}

export const AdminCreditManagement: React.FC<AdminCreditManagementProps> = ({
  users: rawUsers,
  onUpdateUser,
  language = 'si',
}) => {
  const users = useMemo(() => deduplicateUsers(rawUsers), [rawUsers]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserForCredit, setSelectedUserForCredit] = useState<User | null>(null);
  const [operationMode, setOperationMode] = useState<'add' | 'deduct'>('add');
  const [creditAmount, setCreditAmount] = useState<string>('100');
  const [actionType, setActionType] = useState<CreditTransactionType>('deposit');
  const [selectedReason, setSelectedReason] = useState<string>('boc_slip');
  const [customRemark, setCustomRemark] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Global Ledger state
  const [ledgerTransactions, setLedgerTransactions] = useState<CreditTransaction[]>(() => {
    return getStoredCreditTransactions();
  });
  const [ledgerFilter, setLedgerFilter] = useState<string>('all');
  const [ledgerSearch, setLedgerSearch] = useState<string>('');

  const refreshLedger = () => {
    setLedgerTransactions(getStoredCreditTransactions());
  };

  // Filtered Users List by ID, NIC, Name, or Phone
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = (users || []).filter(Boolean);
    if (!q) return list;
    return list.filter((u) => {
      if (!u) return false;
      const numericId = extractNumericId(u.nicNumber || u.userId);
      return (
        numericId.includes(q) ||
        u.userId?.toLowerCase().includes(q) ||
        u.nicNumber?.toLowerCase().includes(q) ||
        u.name?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    });
  }, [users, searchQuery]);

  // Global filtered ledger
  const filteredLedger = useMemo(() => {
    const q = ledgerSearch.trim().toLowerCase();
    return ledgerTransactions.filter((tx) => {
      const matchesFilter =
        ledgerFilter === 'all' ||
        (ledgerFilter === 'income' && tx.amount > 0) ||
        (ledgerFilter === 'expense' && tx.amount < 0) ||
        (ledgerFilter === 'gift' && (tx.type === 'welcome_gift' || tx.type === 'reward')) ||
        (ledgerFilter === 'deposit' && tx.type === 'deposit') ||
        (ledgerFilter === 'ad_fee' && tx.type === 'ad_fee') ||
        (ledgerFilter === 'penalty' && tx.type === 'penalty_compensation');

      if (!matchesFilter) return false;

      if (!q) return true;
      return (
        tx.userNumericId?.toLowerCase().includes(q) ||
        tx.userName?.toLowerCase().includes(q) ||
        tx.title?.toLowerCase().includes(q) ||
        tx.description?.toLowerCase().includes(q) ||
        tx.postCode?.toLowerCase().includes(q)
      );
    });
  }, [ledgerTransactions, ledgerFilter, ledgerSearch]);

  // Metrics
  const metrics = useMemo(() => {
    let totalDeposits = 0;
    let totalAdFees = 0;
    let totalGifts = 0;
    let totalDeductions = 0;
    ledgerTransactions.forEach((tx) => {
      if (tx.type === 'deposit') totalDeposits += tx.amount;
      else if (tx.type === 'welcome_gift' || tx.type === 'reward') totalGifts += tx.amount;
      else if (tx.type === 'ad_fee') totalAdFees += Math.abs(tx.amount);
      else if (tx.amount < 0) totalDeductions += Math.abs(tx.amount);
    });
    return {
      totalDeposits,
      totalAdFees,
      totalGifts,
      totalDeductions,
      totalTransactions: ledgerTransactions.length,
    };
  }, [ledgerTransactions]);

  const handleOpenUserCreditModal = (user: User, mode: 'add' | 'deduct') => {
    setSelectedUserForCredit(user);
    setOperationMode(mode);
    setCreditAmount('100');
    setCustomRemark('');
    if (mode === 'add') {
      setActionType('deposit');
      setSelectedReason('boc_slip');
    } else {
      setActionType('admin_adjustment');
      setSelectedReason('invalid_deposit');
    }
  };

  const handleSwitchMode = (newMode: 'add' | 'deduct') => {
    setOperationMode(newMode);
    setCustomRemark('');
    if (newMode === 'add') {
      setActionType('deposit');
      setSelectedReason('boc_slip');
    } else {
      setActionType('admin_adjustment');
      setSelectedReason('invalid_deposit');
    }
  };

  const handleActionTypeChange = (newType: CreditTransactionType) => {
    setActionType(newType);
    if (operationMode === 'add') {
      if (newType === 'deposit') setSelectedReason('boc_slip');
      else if (newType === 'reward') setSelectedReason('special_reward');
      else if (newType === 'welcome_gift') setSelectedReason('welcome_gift');
      else if (newType === 'admin_adjustment') setSelectedReason('system_correction_add');
    } else {
      if (newType === 'penalty_compensation') setSelectedReason('penalty_noshow');
      else if (newType === 'ad_fee') setSelectedReason('ad_fee_manual');
      else setSelectedReason('invalid_deposit');
    }
  };

  // Calculations for preview
  const currentSelectedUserBalance = selectedUserForCredit ? getUserCreditBalance(selectedUserForCredit) : 0;
  const parsedAmount = Math.max(0, parseFloat(creditAmount) || 0);
  const projectedBalance = operationMode === 'add'
    ? currentSelectedUserBalance + parsedAmount
    : Math.max(0, currentSelectedUserBalance - parsedAmount);

  const isDeductingMoreThanBalance = operationMode === 'deduct' && parsedAmount > currentSelectedUserBalance;

  const currentPresets = operationMode === 'add' ? ADMIN_ADD_REASON_PRESETS : ADMIN_DEDUCT_REASON_PRESETS;
  const isCustomReason = selectedReason === 'custom_other_add' || selectedReason === 'custom_other_deduct';

  const handleCreditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForCredit) return;

    const numAmount = parseFloat(creditAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('කරුණාකර වලංගු මුදලක් ඇතුළත් කරන්න.');
      return;
    }

    if (isCustomReason && !customRemark.trim()) {
      alert('කරුණාකර වෙනත් හේතුව හෝ සටහන ඇතුළත් කරන්න.');
      return;
    }

    setIsProcessing(true);

    try {
      let finalRemark = '';
      if (isCustomReason) {
        finalRemark = customRemark.trim() || (operationMode === 'add' ? 'වෙනත් හේතුවක් (බැර කිරීම)' : 'වෙනත් හේතුවක් (ඉවත් කිරීම)');
      } else {
        const matched = (currentPresets || []).find((r) => r && r.id === selectedReason);
        finalRemark = matched ? matched.label : selectedReason;
        if (customRemark.trim()) {
          finalRemark += ` [සටහන: ${customRemark.trim()}]`;
        }
      }

      let res;
      if (operationMode === 'add') {
        res = addCreditByAdmin(
          selectedUserForCredit,
          numAmount,
          actionType,
          undefined,
          finalRemark || undefined
        );
      } else {
        res = deductCreditByAdmin(
          selectedUserForCredit,
          numAmount,
          actionType,
          undefined,
          finalRemark || undefined
        );
      }

      if (res.success) {
        if (onUpdateUser) {
          onUpdateUser({
            ...selectedUserForCredit,
            credits: res.newBalance,
          });
        }
        refreshLedger();
        const actionVerb = operationMode === 'add' ? 'බැර කරන ලදී' : 'ඉවත් කරන ලදී';
        setSuccessNotice(
          `✅ සාර්ථකයි: ${selectedUserForCredit.name} (ID: ${extractNumericId(selectedUserForCredit.nicNumber || selectedUserForCredit.userId)}) ගිණුමට රු. ${numAmount.toFixed(2)} ක් ${actionVerb}. නව ශේෂය: රු. ${res.newBalance.toFixed(2)}`
        );
        setSelectedUserForCredit(null);
        setCustomRemark('');
        setCreditAmount('100');
        setTimeout(() => setSuccessNotice(null), 7000);
      }
    } catch (err) {
      console.error(err);
      alert('ක්‍රෙඩිට් ගැලපීමේදී දෝෂයක් සිදුවිය.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100">
      
      {/* Top Banner & Hub Title */}
      <div className="bg-gradient-to-r from-emerald-800 via-[#007a4b] to-teal-800 rounded-3xl p-5 sm:p-6 text-white shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center font-black text-xl shadow-md shrink-0">
            <Coins className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                ක්‍රෙඩිට් සහ ගිණුම් කළමනාකරණය (Credit & Wallet Hub)
              </h2>
              <span className="bg-amber-400 text-amber-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                ADMIN
              </span>
            </div>
            <p className="text-xs sm:text-sm text-emerald-100 font-medium mt-0.5">
              පරිශීලක ID මඟින් සොයා ක්‍රෙඩිට් එකතු කිරීම (Credit), ඉවත් කිරීම (Debit), ත්‍යාග පිරිනැමීම සහ සම්පූර්ණ ලෙජරය පරීක්ෂා කිරීම.
            </p>
          </div>
        </div>

        <button
          onClick={refreshLedger}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>යාවත්කාලීන කරන්න</span>
        </button>
      </div>

      {/* Success Alert Banner */}
      {successNotice && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500 text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Quick Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#0a1a11] border border-slate-200 dark:border-[#173a26] p-4 rounded-2xl shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-blue-600" />
            <span>තැන්පතු (Deposits)</span>
          </div>
          <div className="text-lg sm:text-xl font-mono font-black text-blue-600 dark:text-blue-400 mt-1">
            රු. {metrics.totalDeposits.toFixed(2)}
          </div>
        </div>

        <div className="bg-white dark:bg-[#0a1a11] border border-slate-200 dark:border-[#173a26] p-4 rounded-2xl shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Gift className="w-3.5 h-3.5 text-amber-500" />
            <span>ත්‍යාග මුදල් (Gifts)</span>
          </div>
          <div className="text-lg sm:text-xl font-mono font-black text-amber-600 dark:text-amber-400 mt-1">
            රු. {metrics.totalGifts.toFixed(2)}
          </div>
        </div>

        <div className="bg-white dark:bg-[#0a1a11] border border-slate-200 dark:border-[#173a26] p-4 rounded-2xl shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <MinusCircle className="w-3.5 h-3.5 text-rose-500" />
            <span>දැන්වීම් ගාස්තු / අයවීම්</span>
          </div>
          <div className="text-lg sm:text-xl font-mono font-black text-rose-600 dark:text-rose-400 mt-1">
            රු. {metrics.totalAdFees.toFixed(2)}
          </div>
        </div>

        <div className="bg-white dark:bg-[#0a1a11] border border-slate-200 dark:border-[#173a26] p-4 rounded-2xl shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-purple-600" />
            <span>මුළු ගනුදෙනු (Transactions)</span>
          </div>
          <div className="text-lg sm:text-xl font-mono font-black text-purple-600 dark:text-purple-400 mt-1">
            {metrics.totalTransactions} ක්
          </div>
        </div>
      </div>

      {/* SECTION 1: SEARCH & USER CREDIT ACTION (ADD OR DEDUCT) */}
      <div className="bg-white dark:bg-[#0a1a11] border border-slate-200 dark:border-[#173a26] rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-[#173d27]">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>පරිශීලක ගිණුම් ක්‍රෙඩිට් එකතු කිරීම / ඉවත් කිරීම</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              පරිශීලක හැඳුනුම්පත් අංකය (ID), නම හෝ දුරකථන අංකය මඟින් සොයා ක්‍රෙඩිට් කළමනාකරණය කරන්න.
            </p>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ID අංකය, NIC, නම හෝ දුරකථනය..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-[#06140c] border border-slate-200 dark:border-[#163b25] text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* User Card List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
          {filteredUsers.length === 0 ? (
            <div className="col-span-full text-center py-6 bg-slate-50 dark:bg-[#06140c] rounded-2xl border border-dashed border-slate-300 dark:border-[#173a26]">
              <p className="text-xs text-slate-500 font-bold">
                '{searchQuery}' සඳහා පරිශීලකයින් හමුනොවීය.
              </p>
            </div>
          ) : (
            filteredUsers.filter(Boolean).map((u, idx) => {
              if (!u) return null;
              const numericId = extractNumericId(u.nicNumber || u.userId);
              const userBal = getUserCreditBalance(u);
              const isSelected = selectedUserForCredit && u && (selectedUserForCredit.id === u.id || selectedUserForCredit.userId === u.userId);

              return (
                <div
                  key={`credit_user_${u.id || u.userId || u.nicNumber || idx}_${idx}`}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2.5 ${
                    isSelected
                      ? operationMode === 'add'
                        ? 'bg-emerald-50/90 dark:bg-[#0e271a] border-2 border-emerald-500 shadow-sm'
                        : 'bg-rose-50/90 dark:bg-[#270e14] border-2 border-rose-500 shadow-sm'
                      : 'bg-white dark:bg-[#07170e] border-slate-200 dark:border-[#143321] hover:border-emerald-500/50'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate max-w-[170px]">
                        {u.name}
                      </h4>
                      <span className="text-[10px] font-mono font-black bg-amber-500/15 text-amber-800 dark:text-amber-300 px-1.5 py-0.2 rounded-md border border-amber-500/30">
                        ID: {numericId}
                      </span>
                      {u.role === 'admin' && (
                        <span className="text-[9px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 px-1 rounded">
                          Admin
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      <span>NIC: {u.nicNumber || 'N/A'}</span>
                      <span>•</span>
                      <span>{u.phone}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                      <span>වත්මන් ශේෂය:</span>
                      <span className="font-mono font-black text-xs">රු. {userBal.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Direct Action Buttons on Card */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-emerald-950/60">
                    <button
                      type="button"
                      onClick={() => handleOpenUserCreditModal(u, 'add')}
                      className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95 shadow-2xs"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>+ එකතු</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenUserCreditModal(u, 'deduct')}
                      className="flex-1 py-1.5 px-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-500/30 text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95 shadow-2xs"
                    >
                      <MinusCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>- ඉවත්</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected User Action Form (Add or Deduct) */}
        {selectedUserForCredit && (
          <form
            onSubmit={handleCreditSubmit}
            className={`mt-4 rounded-3xl p-5 sm:p-6 shadow-md space-y-4 animate-fadeIn border-2 ${
              operationMode === 'add'
                ? 'bg-gradient-to-br from-emerald-50 to-teal-50/60 dark:from-[#081f13] dark:to-[#0b2819] border-emerald-500'
                : 'bg-gradient-to-br from-rose-50 to-orange-50/60 dark:from-[#21090f] dark:to-[#2e0e16] border-rose-500'
            }`}
          >
            {/* Header with Close */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black shadow-xs ${
                    operationMode === 'add'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-rose-600 text-white'
                  }`}
                >
                  {operationMode === 'add' ? (
                    <PlusCircle className="w-5 h-5" />
                  ) : (
                    <MinusCircle className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    {selectedUserForCredit.name} ගිණුම • {operationMode === 'add' ? 'ක්‍රෙඩිට් එකතු කිරීම (Credit Addition)' : 'ක්‍රෙඩිට් ඉවත් කිරීම (Credit Deduction)'}
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 font-mono font-bold">
                    ID: {extractNumericId(selectedUserForCredit.nicNumber || selectedUserForCredit.userId)} • NIC: {selectedUserForCredit.nicNumber} • වත්මන් ශේෂය: රු. {currentSelectedUserBalance.toFixed(2)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUserForCredit(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Operation Mode Switcher Toggle */}
            <div className="grid grid-cols-2 gap-2 bg-slate-200/70 dark:bg-black/40 p-1.5 rounded-2xl">
              <button
                type="button"
                onClick={() => handleSwitchMode('add')}
                className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  operationMode === 'add'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-white/40 dark:hover:bg-white/10'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ ක්‍රෙඩිට් එකතු කිරීම (Add / Credit)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchMode('deduct')}
                className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  operationMode === 'deduct'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-white/40 dark:hover:bg-white/10'
                }`}
              >
                <MinusCircle className="w-4 h-4" />
                <span>- ක්‍රෙඩිට් ඉවත් කිරීම (Deduct / Debit)</span>
              </button>
            </div>

            {/* Real-time Projected Balance Banner */}
            <div
              className={`p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
                operationMode === 'add'
                  ? 'bg-emerald-100/60 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100'
                  : 'bg-rose-100/60 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold">වත්මන් ශේෂය:</span>
                <span className="font-mono font-black text-sm">රු. {currentSelectedUserBalance.toFixed(2)}</span>
              </div>

              <div className="flex items-center gap-1.5 font-bold">
                <ArrowRight className="w-4 h-4 opacity-60" />
                <span>{operationMode === 'add' ? 'එකතු වන මුදල:' : 'ඉවත් වන මුදල:'}</span>
                <span
                  className={`font-mono font-black text-sm ${
                    operationMode === 'add' ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {operationMode === 'add' ? `+ රු. ${parsedAmount.toFixed(2)}` : `- රු. ${parsedAmount.toFixed(2)}`}
                </span>
              </div>

              <div className="flex items-center gap-2 bg-white/70 dark:bg-black/50 px-3 py-1.5 rounded-xl border border-black/10">
                <span className="font-bold">නව ශේෂය (Projected):</span>
                <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                  රු. {projectedBalance.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Warning if deducting more than balance */}
            {isDeductingMoreThanBalance && (
              <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  සටහන: ඉවත් කිරීමට නියමිත මුදල (රු. {parsedAmount.toFixed(2)}) පරිශීලකයාගේ වත්මන් ශේෂයට වඩා වැඩිය. ඉවත් කිරීමෙන් පසු ශේෂය රු. 0.00 ලෙස සකස් වේ.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Action Type */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  ගනුදෙනු කාණ්ඩය (Category) *
                </label>
                <select
                  value={actionType}
                  onChange={(e) => handleActionTypeChange(e.target.value as CreditTransactionType)}
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-[#07170e] border border-slate-300 dark:border-[#173a26] text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {operationMode === 'add' ? (
                    <>
                      <option value="deposit">🏦 බැංකු තැන්පතු බැර කිරීම (Bank Top-Up Deposit)</option>
                      <option value="reward">🎁 ත්‍යාග මුදල් ලබාදීම (Reward Gift Bonus)</option>
                      <option value="welcome_gift">🎉 ලියාපදිංචි ත්‍යාගය (Welcome Bonus Rs. 100)</option>
                      <option value="admin_adjustment">🔧 පරිපාලක බැර කිරීම (Custom Credit Addition)</option>
                    </>
                  ) : (
                    <>
                      <option value="admin_adjustment">🚫 වැරදි තැන්පතු / අත්වැරදීම් ඉවත් කිරීම (Correction Debit)</option>
                      <option value="penalty_compensation">⚖️ මගහැරීම් ගමන් ගාස්තු වන්දි අය කිරීම (Penalty / Travel Fee)</option>
                      <option value="ad_fee">📢 දැන්වීම් සේවා ගාස්තු අය කිරීම (Ad Posting Fee Debit)</option>
                    </>
                  )}
                </select>
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {operationMode === 'add' ? 'එකතු කරන මුදල (Rs. Amount to Add) *' : 'ඉවත් කරන මුදල (Rs. Amount to Deduct) *'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    රු.
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    placeholder="100"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-[#07170e] border border-slate-300 dark:border-[#173a26] text-sm font-black font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                {/* Quick select buttons */}
                <div className="flex items-center gap-1.5 pt-1">
                  {['25', '50', '100', '250', '500'].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCreditAmount(amt)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                        operationMode === 'add'
                          ? 'bg-slate-200 dark:bg-[#143623] text-slate-800 dark:text-slate-200 hover:bg-emerald-500 hover:text-white'
                          : 'bg-slate-200 dark:bg-[#36141a] text-slate-800 dark:text-slate-200 hover:bg-rose-500 hover:text-white'
                      }`}
                    >
                      {operationMode === 'add' ? `+${amt}` : `-${amt}`}
                    </button>
                  ))}
                  {operationMode === 'deduct' && currentSelectedUserBalance > 0 && (
                    <button
                      type="button"
                      onClick={() => setCreditAmount(currentSelectedUserBalance.toString())}
                      className="px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[10px] font-bold hover:bg-rose-600 hover:text-white transition-colors cursor-pointer"
                    >
                      සම්පූර්ණ ශේෂය (රු. {currentSelectedUserBalance.toFixed(0)})
                    </button>
                  )}
                </div>
              </div>

              {/* Admin Remark / Reason Selector */}
              <div className="sm:col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <FileText
                      className={`w-3.5 h-3.5 ${
                        operationMode === 'add' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    />
                    <span>
                      {operationMode === 'add'
                        ? 'ක්‍රෙඩිට් එකතු කිරීමට හේතුව (Reason for Adding Credit) *'
                        : 'ක්‍රෙඩිට් ඉවත් කිරීමට හේතුව (Reason for Deducting Credit) *'}
                    </span>
                  </label>
                  {isCustomReason && (
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30">
                      වෙනත් හේතුවක් සටහන් කරන්න
                    </span>
                  )}
                </div>

                <select
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-[#07170e] border border-slate-300 dark:border-[#173a26] text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                >
                  {currentPresets.map((preset, prIdx) => (
                    <option key={`c_preset_${preset.id}_${prIdx}`} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </select>

                {/* Conditional Field: When "Other (වෙනත්)" is selected */}
                {isCustomReason ? (
                  <div className="pt-1 animate-fadeIn space-y-1 bg-amber-500/5 dark:bg-amber-500/10 p-3 rounded-2xl border border-amber-500/30">
                    <label className="text-[11px] font-extrabold text-amber-900 dark:text-amber-300 flex items-center gap-1">
                      <span>✍️ වෙනත් හේතුව / සටහන මෙහි ලියන්න (Specify Custom Reason) *</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={customRemark}
                      onChange={(e) => setCustomRemark(e.target.value)}
                      placeholder={
                        operationMode === 'add'
                          ? 'උදා: විශේෂ හදිසි ආපදා ආධාර ප්‍රදානය / මාරුවීම් ගාස්තු ගැලපීම...'
                          : 'උදා: පරිශීලකයා විසින් ඉල්ලූ අවලංගු කිරීමක් / වැරදි ගනුදෙනු ආපසු ගැනීම...'
                      }
                      className="w-full p-2.5 rounded-xl bg-white dark:bg-[#07170e] border-2 border-amber-500/50 dark:border-amber-500/40 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-slate-400"
                    />
                  </div>
                ) : (
                  <div className="pt-0.5">
                    <input
                      type="text"
                      value={customRemark}
                      onChange={(e) => setCustomRemark(e.target.value)}
                      placeholder="අතිරේක යොමු අංකය / ස්ලිප් අංකය (විකල්ප - Optional Slip / Ref No.)"
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#06140c] border border-slate-200 dark:border-[#163b25] text-[11px] font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-400"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedUserForCredit(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-[#11291d] dark:hover:bg-[#183928] text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                අවලංගු කරන්න
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className={`px-5 py-2.5 rounded-xl text-white text-xs sm:text-sm font-black shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 ${
                  operationMode === 'add'
                    ? 'bg-gradient-to-r from-emerald-600 to-[#007a4b] hover:from-emerald-500 hover:to-emerald-600'
                    : 'bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-rose-600'
                }`}
              >
                {operationMode === 'add' ? (
                  <PlusCircle className="w-4 h-4" />
                ) : (
                  <MinusCircle className="w-4 h-4" />
                )}
                <span>
                  {isProcessing
                    ? 'සකසමින් පවතී...'
                    : operationMode === 'add'
                    ? 'ශේෂයට එකතු කරන්න (Add Credits)'
                    : 'ශේෂයෙන් ඉවත් කරන්න (Deduct Credits)'}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* SECTION 2: GLOBAL TRANSACTION LEDGER (ALL USERS) */}
      <div className="bg-white dark:bg-[#0a1a11] border border-slate-200 dark:border-[#173a26] rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-[#173d27]">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              සියලුම දෙනාගේ ගණුදෙනු ලෙජරය (Global Live Ledger)
            </h3>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#07160e] p-1 rounded-xl text-[11px] font-bold overflow-x-auto max-w-full">
            {[
              { key: 'all', label: 'සියල්ල' },
              { key: 'deposit', label: 'තැන්පතු (+)' },
              { key: 'gift', label: 'ත්‍යාග (+)' },
              { key: 'ad_fee', label: 'දැන්වීම් ගාස්තු (-)' },
              { key: 'expense', label: 'සියලු අයවීම් (-)' },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setLedgerFilter(f.key)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer shrink-0 ${
                  ledgerFilter === f.key
                    ? 'bg-emerald-600 text-white shadow-xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Ledger Search Box */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={ledgerSearch}
            onChange={(e) => setLedgerSearch(e.target.value)}
            placeholder="ගනුදෙනු ලෙජරය තුළ පරිශීලක ID, නම, දැන්වීම් කේතය හෝ විස්තරය සොයන්න..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-[#06140c] border border-slate-200 dark:border-[#163b25] text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Ledger Table / List */}
        {filteredLedger.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 dark:bg-[#06140c] rounded-2xl border border-dashed border-slate-300 dark:border-[#173a26]">
            <Coins className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
            <p className="text-xs text-slate-500 font-bold">ගනුදෙනු කිසිවක් හමුනොවීය.</p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {filteredLedger.map((tx, txIdx) => {
              const isPositive = tx.amount > 0;
              return (
                <div
                  key={`admin_credit_tx_${tx.id || 't'}_${txIdx}`}
                  className="bg-slate-50 dark:bg-[#07170e] border border-slate-200 dark:border-[#153422] rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3 shadow-2xs hover:border-emerald-500/50 transition-all"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isPositive
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                      }`}
                    >
                      {isPositive ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {tx.userName || 'පරිශීලක'}
                        </span>
                        <span className="text-[10px] font-mono font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 px-1.5 py-0.2 rounded">
                          ID: {tx.userNumericId}
                        </span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          • {tx.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {tx.description}
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-[#6a907a] mt-1 font-mono">
                        <span>{tx.timestamp}</span>
                        <span>•</span>
                        <span>ශේෂය: රු. {tx.balanceAfter.toFixed(2)}</span>
                        {tx.adminRemark && (
                          <>
                            <span>•</span>
                            <span className="text-amber-700 dark:text-amber-400">Note: {tx.adminRemark}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-xs sm:text-sm font-black font-mono block ${
                        isPositive
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isPositive ? `+ රු. ${tx.amount.toFixed(2)}` : `- රු. ${Math.abs(tx.amount).toFixed(2)}`}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">
                      {tx.type.replace('_', ' ')}
                    </span>
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
