import React, { useState } from 'react';
import { 
  Rocket, 
  Sparkles, 
  X, 
  Coins, 
  CreditCard, 
  Building, 
  CheckCircle, 
  ArrowRight, 
  AlertCircle, 
  Copy, 
  Check, 
  Clock, 
  TrendingUp, 
  Star, 
  ShieldCheck,
  UploadCloud,
  FileText
} from 'lucide-react';
import { HelpPost, User, Language } from '../types';
import { 
  BANK_DEPOSIT_INFO, 
  BOOST_AD_FEE, 
  getUserCreditBalance, 
  boostHelpPost,
  extractNumericId 
} from '../utils/creditManager';

interface BoostPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: HelpPost | null;
  currentUser: User;
  onBoostSuccess: (updatedPost: HelpPost) => void;
  language?: Language;
}

export const BoostPostModal: React.FC<BoostPostModalProps> = ({
  isOpen,
  onClose,
  post,
  currentUser,
  onBoostSuccess,
  language = 'si',
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'bank_slip'>('wallet');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ updatedPost: HelpPost; ref: string } | null>(null);
  const [copiedBankField, setCopiedBankField] = useState<string | null>(null);

  // Bank slip form state
  const [slipReference, setSlipReference] = useState('');
  const [slipFile, setSlipFile] = useState<File | null>(null);

  if (!isOpen || !post) return null;

  const currentWalletBalance = getUserCreditBalance(currentUser);
  const isWalletSufficient = currentWalletBalance >= BOOST_AD_FEE;
  const numericId = extractNumericId(currentUser.nicNumber || currentUser.userId);

  const getLangText = (si: string, en: string, ta: string) => {
    if (language === 'en') return en;
    if (language === 'ta') return ta;
    return si;
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBankField(field);
    setTimeout(() => setCopiedBankField(null), 2000);
  };

  const getCategoryDisplayName = () => {
    if (post.tagName) return post.tagName;
    if (post.category === 'quick_services' || post.category === 'quick') return 'ඉක්මන් සේවා (Quick Services)';
    if (post.category === 'find_for_me') return 'සොයාදෙන්න (Find For Me)';
    if (post.category === 'from_me_to_you') return 'මගෙන් ඔබට (From Me To You)';
    if (post.category === 'marketplace') return 'වෙළඳපොල (Marketplace)';
    if (post.category === 'group_work') return 'කණ්ඩායම් වැඩ (Group Work)';
    if (post.category === 'professional_services') return 'වෘත්තීය සේවා (Professional Services)';
    return post.category || 'සාමාන්‍ය සේවා (General Services)';
  };

  const handleConfirmBoost = async () => {
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      if (paymentMethod === 'wallet' && !isWalletSufficient) {
        setErrorMessage(`ඔබගේ Wallet ශේෂය ප්‍රමාණවත් නොවේ. රු. ${BOOST_AD_FEE.toFixed(2)} ක් අවශ්‍ය වේ. ඔබගේ දැනට ශේෂය රු. ${currentWalletBalance.toFixed(2)} කි.`);
        setIsProcessing(false);
        return;
      }

      if (paymentMethod === 'bank_slip' && !slipReference && !slipFile) {
        setErrorMessage('කරුණාකර බැංකු තැන්පතු රිසිට්පත් අංකය (Reference No) හෝ ස්ලිප් පත ඇතුළත් කරන්න.');
        setIsProcessing(false);
        return;
      }

      // Simulate network / processing delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      const result = boostHelpPost(post, currentUser, paymentMethod, {
        reference: slipReference || (paymentMethod === 'card_qr' ? `CARD-${Date.now().toString().slice(-6)}` : undefined),
        slipName: slipFile?.name,
      });

      if (result.success && result.updatedPost) {
        setSuccessData({
          updatedPost: result.updatedPost,
          ref: result.updatedPost.boostPaymentReference || `BST-${Math.floor(100000 + Math.random() * 900000)}`,
        });
        onBoostSuccess(result.updatedPost);
      } else {
        setErrorMessage(result.error || 'දැන්වීම Boost කිරීම අසාර්ථක විය. කරුණාකර නැවත උත්සාහ කරන්න.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'තාක්ෂණික දෝෂයක් සිදුවිය.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
      <div className="bg-white dark:bg-[#071710] border-2 border-amber-400 dark:border-amber-500/80 rounded-3xl w-full max-w-xl overflow-hidden shadow-[0_20px_60px_rgba(245,158,11,0.25)] transition-all relative max-h-[92vh] flex flex-col text-slate-900 dark:text-slate-100">
        
        {/* Top Header Bar */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-4 sm:p-5 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md text-yellow-200 flex items-center justify-center font-black shadow-inner border border-white/30 shrink-0 animate-bounce">
              <Rocket className="w-6 h-6 fill-yellow-300 text-yellow-900" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight drop-shadow-sm">
                  {getLangText('දැන්වීම Boost කිරීම', 'Boost Your Ad', 'விளம்பரத்தை ஊக்குவிக்கவும்')}
                </h2>
                <span className="bg-white/25 text-white border border-white/40 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Top Priority
                </span>
              </div>
              <p className="text-xs text-amber-100 font-medium">
                {getLangText(
                  'රු. 250 කින් මෙම කාණ්ඩයේ සියලු දැන්වීම් වලට ඉහළින්ම ප්‍රදර්ශනය කරන්න',
                  'Pin to the top of this category for Rs. 250',
                  'ரூ. 250 செலுத்தி இந்த பிரிவில் முதலிடத்தில் விளம்பரப்படுத்துங்கள்'
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
            title="වසන්න"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-slate-900 dark:text-slate-100">
          
          {/* SUCCESS SCREEN */}
          {successData ? (
            <div className="py-6 text-center space-y-4 animate-scaleUp">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/30 animate-bounce">
                <CheckCircle className="w-12 h-12" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {getLangText('සාර්ථකයි! දැන්වීම Boost කරන ලදී', 'Success! Ad Boosted', 'வெற்றி! விளம்பரம் உயர்த்தப்பட்டது')}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                  {getLangText(
                    `දැන්වීම #${post.postCode} අදාළ "${getCategoryDisplayName()}" කාණ්ඩය තුළ ඉදිරි දින 7 පුරා ඉහළින්ම ප්‍රදර්ශනය වේ.`,
                    `Ad #${post.postCode} is now pinned to the top of "${getCategoryDisplayName()}" for the next 7 days.`,
                    `விளம்பரம் #${post.postCode} அடுத்த 7 நாட்களுக்கு "${getCategoryDisplayName()}" பிரிவில் முதலிடத்தில் தோன்றும்.`
                  )}
                </p>
              </div>

              {/* Receipt Summary Card */}
              <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-2xl text-left space-y-2 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-amber-200 dark:border-amber-900">
                  <span className="font-extrabold text-amber-900 dark:text-amber-200">ගෙවීම් අංකය (Ref):</span>
                  <span className="font-mono font-black text-slate-900 dark:text-white bg-white dark:bg-black/50 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                    {successData.ref}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">අයවූ මුදල:</span>
                  <span className="font-black text-emerald-700 dark:text-emerald-400 font-mono">රු. 250.00</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">වලංගු කාලය:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">දින 7 (දින 7 ක කාලයක්)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">අදාළ කාණ්ඩය:</span>
                  <span className="font-bold text-amber-800 dark:text-amber-300">{getCategoryDisplayName()}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-lg active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>{getLangText('සහය පුවරුවට පිවිසෙන්න', 'View in Support Board', 'உதவி பலகையில் பார்க்க')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              {/* Selected Ad Overview Box */}
              <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-50 to-amber-50/40 dark:from-[#0a1f15] dark:to-[#0f241a] border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-xs sm:text-sm bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-2.5 py-0.5 rounded-lg shadow-xs">
                      {post.postCode.startsWith('#') ? post.postCode : `#${post.postCode}`}
                    </span>
                    <span className="text-xs font-black text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-800">
                      📁 {getCategoryDisplayName()}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    📍 {post.locationName || 'ස්ථානය'}
                  </span>
                </div>

                <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 line-clamp-2 leading-snug">
                  {post.whatHappened || post.whatIsNeeded || 'දැන්වීම් විස්තරය'}
                </p>
              </div>

              {/* 4 Key Benefits Grid */}
              <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                <div className="p-3 bg-amber-50/80 dark:bg-[#12281b] border border-amber-200/80 dark:border-amber-800/60 rounded-2xl flex items-start gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
                    <Star className="w-4 h-4 fill-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white">කාණ්ඩයේ ඉහළින්ම</h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-tight">
                      අදාළ කාණ්ඩයේ සියලු සාමාන්‍ය දැන්වීම් වලට ඉහළින්ම දිස්වේ.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-amber-50/80 dark:bg-[#12281b] border border-amber-200/80 dark:border-amber-800/60 rounded-2xl flex items-start gap-2.5">
                  <div className="p-2 rounded-xl bg-orange-500/20 text-orange-700 dark:text-orange-300 shrink-0">
                    <Sparkles className="w-4 h-4 fill-orange-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white">Golden Boost Badge</h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-tight">
                      දිලිසෙන රන්වන් රාමුවක් හා ලාංඡනයක් හිමිවේ.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-amber-50/80 dark:bg-[#12281b] border border-amber-200/80 dark:border-amber-800/60 rounded-2xl flex items-start gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 shrink-0">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white">3x වැඩි ප්‍රතිචාර</h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-tight">
                      වැඩිම පිරිසකගේ අවධානය සහ ක්ෂණික ගනුදෙනුකරුවන්.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-amber-50/80 dark:bg-[#12281b] border border-amber-200/80 dark:border-amber-800/60 rounded-2xl flex items-start gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-500/20 text-blue-700 dark:text-blue-300 shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white">දින 7ක කාලයක්</h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-tight">
                      දින 7ක් පුරා අඛණ්ඩව ඉහළින්ම රඳවා තබාගැනීම.
                    </p>
                  </div>
                </div>
              </div>

              {/* Price & Fee Summary */}
              <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 dark:from-amber-500/20 dark:via-orange-500/20 dark:to-amber-500/20 border-2 border-amber-400 dark:border-amber-500/60 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
                <div>
                  <span className="text-[11px] font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider block">
                    ස්ථාවර Boost ගාස්තුව
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                    රු. {BOOST_AD_FEE.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 ml-1.5 font-medium">
                    (දින 7ක් සඳහා)
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">ඔබගේ Wallet ශේෂය:</span>
                  <span className={`text-sm font-black font-mono ${isWalletSufficient ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    රු. {currentWalletBalance.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Payment Method Selector Tabs */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>ගෙවීම් ක්‍රමය තෝරන්න (Select Payment Method):</span>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('wallet')}
                    className={`p-3 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                      paymentMethod === 'wallet'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 shadow-sm ring-2 ring-emerald-400/30'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1f16] text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <Coins className="w-5 h-5 text-amber-500" />
                    <span className="text-xs font-black leading-tight">Credit Wallet</span>
                    <span className="text-[10px] text-slate-500 font-medium">ක්ෂණික අයවීම (Instant)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('bank_slip')}
                    className={`p-3 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                      paymentMethod === 'bank_slip'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 shadow-sm ring-2 ring-emerald-400/30'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1f16] text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <Building className="w-5 h-5 text-blue-500" />
                    <span className="text-xs font-black leading-tight">BOC Slip / CDM</span>
                    <span className="text-[10px] text-slate-500 font-medium">බැංකු තැන්පතු (Bank Deposit)</span>
                  </button>
                </div>
              </div>

              {/* PAYMENT METHOD SPECIFIC DETAILS */}

              {/* 1. WALLET METHOD */}
              {paymentMethod === 'wallet' && (
                <div className="p-3.5 bg-slate-50 dark:bg-[#0c1e15] border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400 font-semibold">අවශ්‍ය මුදල:</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">රු. {BOOST_AD_FEE.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400 font-semibold">දැනට ශේෂය:</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">රු. {currentWalletBalance.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400 font-semibold">අයවීමෙන් පසු ශේෂය:</span>
                    <span className={`font-black font-mono ${isWalletSufficient ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                      {isWalletSufficient ? `රු. ${(currentWalletBalance - BOOST_AD_FEE).toFixed(2)}` : 'ප්‍රමාණවත් නොවේ'}
                    </span>
                  </div>

                  {!isWalletSufficient && (
                    <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>
                        ඔබගේ ගිණුමේ ශේෂය මදි බැවින් <strong>BOC Slip (බැංකු තැන්පතු)</strong> මඟින් කෙලින්ම ගෙවිය හැක.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* 3. BANK SLIP METHOD */}
              {paymentMethod === 'bank_slip' && (
                <div className="p-3.5 bg-slate-50 dark:bg-[#0c1e15] border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 text-xs">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-700 dark:text-slate-300">බැංකුව:</span>
                      <span className="font-extrabold text-blue-900 dark:text-blue-200">{BANK_DEPOSIT_INFO.bankNameSi}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-700 dark:text-slate-300">ගිණුම් අංකය:</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-black text-slate-900 dark:text-white bg-white dark:bg-black/40 px-2 py-0.5 rounded border border-blue-300">
                          {BANK_DEPOSIT_INFO.accountNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(BANK_DEPOSIT_INFO.accountNumber, 'acc')}
                          className="p-1 rounded bg-blue-200 text-blue-900 cursor-pointer"
                        >
                          {copiedBankField === 'acc' ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-700 dark:text-slate-300">ගිණුමේ නම:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{BANK_DEPOSIT_INFO.accountHolderSi}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-700 dark:text-slate-300">ශාඛාව:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{BANK_DEPOSIT_INFO.branchSi}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        ස්ලිප්පත් අංකය / Reference Number:
                      </label>
                      <input
                        type="text"
                        placeholder="උදා: BOC-87462819"
                        value={slipReference}
                        onChange={(e) => setSlipReference(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-black/40 text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        ස්ලිප්පතේ ඡායාරූපය (Slip Image / Screenshot):
                      </label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setSlipFile(e.target.files?.[0] || null)}
                        className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-black/40 text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:bg-blue-600 file:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ERROR MESSAGE */}
              {errorMessage && (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-900 text-rose-900 dark:text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* ACTION SUBMIT BUTTON */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleConfirmBoost}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 active:scale-[0.98] text-white font-black text-sm sm:text-base shadow-xl shadow-orange-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 border-2 border-amber-300/80 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>තහවුරු කරමින් පවතී...</span>
                    </>
                  ) : (
                    <>
                      <Rocket className="w-5 h-5 fill-yellow-200 text-yellow-900 animate-bounce" />
                      <span>
                        {getLangText(
                          `රු. ${BOOST_AD_FEE.toFixed(2)} ගෙවා දැන්ම Boost කරන්න`,
                          `Pay Rs. ${BOOST_AD_FEE.toFixed(2)} & Boost Now`,
                          `ரூ. ${BOOST_AD_FEE.toFixed(2)} செலுத்தி விளம்பரத்தை உயர்த்தவும்`
                        )}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};
